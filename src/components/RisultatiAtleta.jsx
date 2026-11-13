import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import PiuStili from './PiuStili'
import { aggiornaMedia, campiMedia, leggiMedia } from '../lib/media'
import InputTempo from './InputTempo'
import { coloreLavoro } from '../lib/lavori'
import { useAuth } from '../context/AuthContext'
import { STILI } from '../lib/lavori'
import { A_SCELTA, aScelta, abbinaTempiAtleta, blocchiPiano, conProprioStile, conScelte, giriSerie, inPosizione, letturaRiga, haVarianti, perGiro, ripartenzeDiRiga, ripetizioniDiRiga, stileCambiabile } from '../lib/pianoSquadra'
import { aggiungiInCoda, erroreDiRete, leggiCoda, rimuoviDaCoda } from '../lib/codaOffline'
import { caselleDiRiga, gruppiPerStile, haTratti, raccogli } from '../lib/varianti'
import { ERRORE_TEMPO_BREVE, erroreTempoImpossibile, normalizzaTempo, tempoPlausibile, tempoValido } from '../lib/tempo'

// Il coach vede il piano del giorno e scrive i risultati di ogni passaggio per un atleta.
// Funziona anche se l'atleta non ha ancora nessun tempo: si parte dalle righe del piano.
// proprio: è l'atleta che scrive i suoi tempi. Un lavoro già salvato si vede in verde e si corregge con "Correggi"
// (serve la connessione); i lavori nuovi senza connessione restano sul telefono e partono appena torna.
export default function RisultatiAtleta({ piano, atletaId, giorno, proprio = false }) {
  // I lavori "Proprio stile" si vedono e si salvano nello stile dell'atleta (migrazione 41); undefined = lo sto leggendo
  const { profile } = useAuth()
  const [ps, setPs] = useState(proprio ? profile?.proprio_stile || null : undefined)
  useEffect(() => {
    if (proprio) return setPs(profile?.proprio_stile || null)
    let attivo = true
    setPs(undefined)
    supabase.from('profiles').select('proprio_stile').eq('id', atletaId).maybeSingle()
      .then(({ data }) => { if (attivo) setPs(data?.proprio_stile || null) })
    return () => { attivo = false }
  }, [atletaId, proprio, profile?.proprio_stile])
  const base = conProprioStile(piano?.righe || [], ps)
  // Lo stile che l'atleta dice di aver fatto, per indice di riga: nei lavori "A scelta" uno stile per tutto il lavoro
  // oppure una lista con lo stile di ogni passaggio; negli altri lavori la lista, se ha fatto stili diversi dal coach
  const [scelte, setScelte] = useState({})
  const righe = conScelte(base, scelte)
  const perPassaggio = (i) => Array.isArray(scelte[i])
  const [esistenti, setEsistenti] = useState([]) // righe già salvate in "allenamenti" per quel giorno
  const [valori, setValori] = useState([])       // valori[i] = array di passaggi della riga i del piano
  const [medie, setMedie] = useState({})         // tempo medio di un lavoro (per chi non ricorda i singoli): chiave "riga-stile"
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [salvo, setSalvo] = useState(false)
  // l'atleta apre solo i lavori di cui ha i tempi (16 caselle di tecnica chiuse non ingombrano)
  const [aperti, setAperti] = useState(() => new Set())
  const chiuso = (i) => proprio && !aperti.has(i)
  const Apri = ({ i, n }) => (
    <button type="button" onClick={() => setAperti(new Set([...aperti, i]))}
      className="cliccabile w-full min-h-[44px] mt-3 rounded-xl text-sm font-bold text-blue-600 bg-schiuma">
      + Scrivi i tempi ({n})
    </button>
  )

  useEffect(() => {
    let attivo = true
    setErrore('')
    setOk('')
    if (!atletaId || !piano || ps === undefined) return
    supabase.from('allenamenti').select('*').eq('atleta_id', atletaId).eq('data_allenamento', giorno).order('created_at')
      .then(({ data }) => {
        if (!attivo) return
        const lista = [...(data || []), ...(proprio ? leggiCoda('allenamenti', atletaId).filter((r) => r.data_allenamento === giorno) : [])]
        setEsistenti(lista)
        const medieTrovate = {}
        const scelteTrovate = {}
        const abbinati = abbinaTempiAtleta(base, lista)
        // un lavoro già salvato riparte dagli stili scelti allora (anche quelli diversi da quelli del coach)
        const nuoviValori = base.map((rb, i) => {
          const { scelta, valori: v } = letturaRiga(rb, abbinati[i])
          if (scelta) scelteTrovate[i] = scelta
          // nelle serie a giri un lavoro "A scelta" ha sempre lo stile sotto ogni casella
          if (aScelta(rb) && rb.serie && !Array.isArray(scelta)) scelteTrovate[i] = caselleDiRiga(rb).map(() => scelta || '')
          if (!aScelta(rb) && !scelta) {
            abbinati[i].esatti.forEach((t, k) => { if (leggiMedia(t)) medieTrovate[`${i}-${k}`] = leggiMedia(t) })
          } else {
            const gruppi = gruppiPerStile(conScelte([rb], [scelta])[0])
            ;[...abbinati[i].esatti, ...abbinati[i].posizionali].forEach((t) => {
              const k = t ? gruppi.findIndex((g) => g.stile === t.stile) : -1
              if (k >= 0 && leggiMedia(t)) medieTrovate[`${i}-${k}`] = leggiMedia(t)
            })
          }
          return v
        })
        setValori(nuoviValori)
        setScelte(scelteTrovate)
        setMedie(medieTrovate)
      })
    return () => { attivo = false }
  }, [atletaId, giorno, piano?.id, ps]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambia = (i, j, v) => {
    const copia = valori.map((a) => [...a])
    copia[i] = copia[i] || []
    copia[i][j] = v
    setValori(copia)
  }

  // Per ogni riga del piano, il lavoro già salvato che le corrisponde (se c'è)
  // Ogni stile di una riga è un lavoro salvato a sé: il tempo resta nella categoria del suo stile
  const gruppiRighe = righe.map(gruppiPerStile)
  const abbinati = abbinaTempiAtleta(base, esistenti)
  const perStile = []
  const avanzati = [] // lavori salvati in uno stile che ora non c'è più nella riga (si cancellano salvando)
  base.forEach((rb, i) => {
    const { esatti, posizionali } = abbinati[i]
    if (!aScelta(rb) && !perPassaggio(i)) {
      perStile[i] = esatti
      avanzati[i] = posizionali // l'atleta è tornato agli stili del coach
      return
    }
    const liberi = [...esatti.filter(Boolean), ...posizionali]
    // prima lo stesso stile; un gruppo con uno stile nuovo riusa un lavoro salvato rimasto libero
    const presi = gruppiRighe[i].map((g) => {
      const k = liberi.findIndex((t) => t.stile === g.stile)
      return k >= 0 ? liberi.splice(k, 1)[0] : null
    })
    perStile[i] = presi.map((t, k) => t || (gruppiRighe[i][k].stile !== A_SCELTA && liberi.length ? liberi.shift() : null))
    avanzati[i] = liberi
  })
  const salvata = base.map((rb, i) => {
    const tutti = [...abbinati[i].esatti.filter(Boolean), ...abbinati[i].posizionali]
    return tutti.length ? { passaggi: letturaRiga(rb, abbinati[i]).valori, medie: tutti.map((t) => leggiMedia(t)).filter(Boolean) } : null
  })
  // l'atleta vede i tempi già salvati al posto delle caselle; "Correggi" riapre le caselle già compilate
  const fisso = (i) => proprio && salvata[i] && !aperti.has(i)
  const Salvati = ({ i, gruppo }) => (
    <div className="flex items-center justify-between gap-2 text-sm text-green-700 bg-green-50 rounded-xl pl-3 pr-1 py-1 mt-3">
      <span className="min-w-0">Salvato: {[(salvata[i].passaggi || []).map((p) => p || '–').join(' · '), ...salvata[i].medie.map((m) => `media ${m}`)].filter(Boolean).join(' · ') || 'senza tempi'}</span>
      <button type="button" onClick={() => setAperti(new Set([...aperti, ...(gruppo || [i])]))}
        className="cliccabile shrink-0 min-h-[40px] px-3 rounded-lg font-bold text-blue-600 hover:bg-white">Correggi</button>
    </div>
  )

  // Lavoro "A scelta" del coach: prima dei tempi si dice che stile si è fatto, per tutto il lavoro
  // oppure (n = passaggi, se più di uno) uno stile diverso per ogni passaggio
  const SceltaStile = ({ i, titolo, n = 1 }) => (aScelta(base[i]) ? (
    <div className={`mt-3 rounded-2xl p-3 ${scelte[i] ? 'bg-gray-50' : 'border-2 border-blue-300 bg-blue-50'}`}>
      <p className="mb-2 text-sm font-bold text-blue-700">{titolo || (proprio ? 'Che stile hai fatto?' : 'Che stile ha fatto?')}</p>
      {perPassaggio(i) ? (
        <p className="text-sm text-slate-600">Scegli lo stile sotto ogni passaggio.</p>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label={titolo || 'Stile fatto'}>
          {STILI.map((s) => (
            <button key={s} type="button" aria-pressed={scelte[i] === s} onClick={() => setScelte({ ...scelte, [i]: s })}
              className={`cliccabile min-h-[40px] rounded-full px-3.5 text-sm font-semibold ${scelte[i] === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>
              {s}
            </button>
          ))}
        </div>
      )}
      {n > 1 && (
        <button type="button" onClick={() => setScelte({
          ...scelte,
          // passando a "uno per passaggio" si parte dallo stile già scelto; tornando indietro si tiene il primo scelto
          [i]: perPassaggio(i) ? scelte[i].find(Boolean) : Array.from({ length: n }, () => scelte[i] || ''),
        })} className="cliccabile min-h-[44px] mt-1 text-sm font-semibold text-blue-600">
          {perPassaggio(i) ? 'Stesso stile per tutto il lavoro' : 'Stili diversi nei passaggi'}
        </button>
      )}
    </div>
  ) : null)
  const scegliPassaggio = (i, j, s) => setScelte({ ...scelte, [i]: scelte[i].map((x, k) => (k === j ? s : x)) })
  const StilePassaggio = ({ i, j, nome }) => (
    <select aria-label={`Stile ${nome}`} value={scelte[i][j] || ''} onChange={(e) => scegliPassaggio(i, j, e.target.value)}
      className={`mt-1.5 w-full min-h-[40px] rounded-xl px-2 text-sm font-semibold ${scelte[i][j] ? 'bg-white border border-slate-200 text-slate-700' : 'border-2 border-blue-300 bg-blue-50 text-blue-700'}`}>
      <option value="">Che stile?</option>
      {STILI.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  )

  // Tempo medio (per chi non ricorda i singoli passaggi): uno per ogni stile del lavoro
  const mediaDi = (i, r, conDistanza = false) => gruppiRighe[i].map((g, k) => {
    if (g.stile === A_SCELTA) return null // passaggi "A scelta" senza stile scelto: niente media
    const chiave = `${i}-${k}`
    const nome = (conDistanza || haTratti(r) ? ` ${g.distanza} m` : '') + (gruppiRighe[i].length > 1 ? ` · ${g.stile}` : '')
    return chiave in medie ? (
      <div key={chiave} className="mt-3 rounded-2xl border-2 border-blue-300 bg-blue-50 p-3">
        <p className="mb-1 text-sm font-bold text-blue-700">Tempo medio{nome}</p>
        <InputTempo ariaLabel={`Tempo medio${nome}`} value={medie[chiave] || ''} vuotoOk
          onChange={(v) => setMedie({ ...medie, [chiave]: v })} />
        <button type="button" onClick={() => { const { [chiave]: _tolta, ...resto } = medie; setMedie(resto) }}
          className="cliccabile min-h-[44px] text-xs font-bold text-red-600">Togli la media</button>
      </div>
    ) : (
      <button key={chiave} type="button" onClick={() => setMedie({ ...medie, [chiave]: '' })}
        className="cliccabile min-h-[44px] mt-2 flex w-fit items-center rounded-xl border border-blue-300 px-3 text-sm font-semibold text-blue-600 text-left">
        Non ricordo tutti i tempi: scrivo la media{nome}
      </button>
    )
  })

  async function salva() {
    setErrore('')
    setOk('')
    const lavori = []
    for (let i = 0; i < righe.length; i++) {
      const caselle = caselleDiRiga(righe[i])
      const n = caselle.length
      const pulito = []
      for (let j = 0; j < n; j++) {
        const t = normalizzaTempo(valori[i]?.[j] || '')
        if (!t) { pulito.push(''); continue }
        if (!tempoValido(t)) return setErrore(`Lavoro ${i + 1}, passaggio ${j + 1}: ${ERRORE_TEMPO_BREVE}`)
        if (!tempoPlausibile(t, caselle[j].distanza)) return setErrore(`Lavoro ${i + 1}, passaggio ${j + 1}: ${erroreTempoImpossibile(caselle[j].distanza)}`)
        pulito.push(t)
      }
      // i vuoti in fondo non servono
      while (pulito.length && !pulito[pulito.length - 1]) pulito.pop()
      lavori.push(pulito)
    }
    // tempo medio di ogni stile (facoltativo)
    const medieOk = {}
    for (const [chiave, v] of Object.entries(medie)) {
      const t = normalizzaTempo(v || '')
      if (!t) continue
      if (!tempoValido(t)) return setErrore(`Tempo medio del lavoro ${Number(chiave.split('-')[0]) + 1}: ${ERRORE_TEMPO_BREVE}`)
      medieOk[chiave] = t
    }
    // nei lavori "A scelta" serve sapere lo stile, sennò il tempo finirebbe in una categoria che non esiste
    const senzaStile = base.findIndex((rb, i) => aScelta(rb) && !scelte[i]
      && (lavori[i].some(Boolean) || Object.keys(medieOk).some((c) => c.startsWith(`${i}-`))))
    if (senzaStile >= 0) return setErrore(`Lavoro ${senzaStile + 1}: scegli lo stile che hai fatto.`)
    for (let i = 0; i < base.length; i++) {
      if (!perPassaggio(i)) continue
      const j = lavori[i].findIndex((t, k) => t && !scelte[i][k])
      if (j >= 0) return setErrore(`Lavoro ${i + 1}, passaggio ${j + 1}: scegli lo stile che hai fatto.`)
    }

    setSalvo(true)
    // Un lavoro per ogni stile della riga: [{ i, g, riga: lavoro già salvato | null, passaggi }]
    // Nei lavori "A scelta" e in quelli con uno stile diverso dal coach ogni tempo resta nel suo passaggio
    // (serve a ricordare lo stile di ognuno); negli altri i tempi si salvano per stile
    const sceltoIo = (i) => aScelta(base[i]) || perPassaggio(i)
    const pezzi = righe.flatMap((r, i) => gruppiRighe[i].map((g, k) => ({
      i, g, r, riga: perStile[i][k], media: medieOk[`${i}-${k}`] || '',
      passaggi: !sceltoIo(i) ? raccogli(g, lavori[i]) : inPosizione(g, lavori[i], aScelta(base[i]) ? 0 : caselleDiRiga(r).length),
      // correggendo si può cambiare anche lo stile
      stile: sceltoIo(i) ? { stile: g.stile, ripetizioni: g.reps.length } : {},
    })).filter((x) => x.g.stile !== A_SCELTA))
    if (proprio) {
      // l'atleta aggiunge i lavori nuovi e corregge quelli riaperti con "Correggi"
      const nuove = pezzi.filter((x) => !x.riga && (x.passaggi.some(Boolean) || x.media)).map(({ r, g, passaggi, media }) => ({
        ...(media ? campiMedia(media) : {}),
        id: crypto.randomUUID(), atleta_id: atletaId, tipo_lavoro: r.tipo_lavoro, distanza: g.distanza,
        ripetizioni: g.reps.length, stile: g.stile, passaggi, data_allenamento: giorno,
        created_at: new Date().toISOString(),
      }))
      const corrette = pezzi.filter((x) => x.riga && aperti.has(x.i))
      // stili che non ci sono più in un lavoro "A scelta" corretto
      const daTogliere = avanzati.flatMap((l, i) => (aperti.has(i) ? l : []))
      if (!nuove.length && !corrette.length && !daTogliere.length) {
        setSalvo(false)
        return setErrore('Scrivi almeno un tempo.')
      }
      // un lavoro ancora in coda sul telefono (salvato senza connessione) si corregge lì, non nel database
      const inCodaIds = new Set(leggiCoda('allenamenti', atletaId).map((r) => r.id))
      if ([...corrette.map((x) => x.riga), ...daTogliere].some((e) => !inCodaIds.has(e.id)) && !navigator.onLine) {
        setSalvo(false)
        return setErrore('Per correggere un tempo già inviato serve la connessione: riprova appena torna.')
      }
      for (const x of corrette) {
        if (inCodaIds.has(x.riga.id)) {
          rimuoviDaCoda('allenamenti', x.riga.id)
          aggiungiInCoda('allenamenti', { ...x.riga, passaggi: x.passaggi, ...aggiornaMedia(x.riga, x.media), ...x.stile })
          continue
        }
        const { error } = await supabase.from('allenamenti').update({ passaggi: x.passaggi, ...aggiornaMedia(x.riga, x.media), ...x.stile }).eq('id', x.riga.id)
        if (error) {
          setSalvo(false)
          return setErrore('Non sono riuscito a correggere: ' + error.message)
        }
      }
      for (const e of daTogliere) {
        if (inCodaIds.has(e.id)) { rimuoviDaCoda('allenamenti', e.id); continue }
        const { error } = await supabase.from('allenamenti').delete().eq('id', e.id)
        if (error) {
          setSalvo(false)
          return setErrore('Non sono riuscito a correggere: ' + error.message)
        }
      }
      const tolti = new Set(daTogliere.map((e) => e.id))
      const aggiornate = esistenti.filter((e) => !tolti.has(e.id)).map((e) => {
        const x = corrette.find((c) => c.riga.id === e.id)
        return x ? { ...e, passaggi: x.passaggi, ...aggiornaMedia(e, x.media), ...x.stile } : e
      })
      setAperti(new Set())
      setValori(lavori.map((l) => [...l])) // "Correggi" riapre i tempi già nel formato giusto
      if (!nuove.length) {
        setEsistenti(aggiornate)
        setSalvo(false)
        return setOk('Tempi corretti.')
      }
      let inCoda = !navigator.onLine
      if (!inCoda) {
        const { error } = await supabase.from('allenamenti').insert(nuove)
        if (error && !erroreDiRete(error)) {
          setSalvo(false)
          return setErrore('Non sono riuscito a salvare: ' + error.message)
        }
        inCoda = !!error
      }
      if (inCoda) nuove.forEach((r) => aggiungiInCoda('allenamenti', r))
      setEsistenti([...aggiornate, ...nuove])
      setSalvo(false)
      return setOk(inCoda ? 'Salvati sul telefono: partono appena torna la connessione.' : 'Tempi salvati.')
    }
    for (const { r, g, riga, passaggi, media, stile } of pezzi) {
      // I vuoti in mezzo restano (''), così ogni tempo resta nel suo passaggio o nel suo giro
      if (!passaggi.some(Boolean) && !media && !riga) continue // niente da salvare per questo stile
      const { error } = riga
        ? await supabase.from('allenamenti').update({ passaggi, ...aggiornaMedia(riga, media), ripetizioni: g.reps.length, ...stile }).eq('id', riga.id)
        : await supabase.from('allenamenti').insert({
            atleta_id: atletaId, tipo_lavoro: r.tipo_lavoro, distanza: g.distanza,
            ripetizioni: g.reps.length, stile: g.stile, passaggi, ...(media ? campiMedia(media) : {}), data_allenamento: giorno,
          })
      if (error) {
        setSalvo(false)
        return setErrore('Non sono riuscito a salvare: ' + error.message)
      }
    }
    // lavori "A scelta" salvati in uno stile che ora non c'è più
    const daTogliere = avanzati.flat()
    if (daTogliere.length) {
      const { error } = await supabase.from('allenamenti').delete().in('id', daTogliere.map((e) => e.id))
      if (error) {
        setSalvo(false)
        return setErrore('Non sono riuscito a salvare: ' + error.message)
      }
    }
    setSalvo(false)
    setOk('Risultati salvati.')
    const { data } = await supabase.from('allenamenti').select('*').eq('atleta_id', atletaId).eq('data_allenamento', giorno).order('created_at')
    setEsistenti(data || [])
  }

  if (!piano) {
    return (
      <p className="text-sm text-slate-500 bg-white rounded-3xl p-6 text-center shadow-card">
        Nessun allenamento in questo giorno. Preparalo da Allenamenti.
      </p>
    )
  }

  return (
    <>
      <p className="text-sm text-slate-500 mb-2 px-1">
        {proprio ? 'Scrivi i tempi sotto ogni lavoro del coach: anche solo alcuni, il resto puoi lasciarlo vuoto.' : `📋 ${piano.titolo || 'Allenamento del giorno'}`}
      </p>
      {blocchiPiano(righe).map((b) => {
        if (b.serie) {
          // Serie a giri: i tempi si scrivono giro per giro, nell'ordine in cui si nuotano
          const giri = giriSerie(b.righe[0].riga)
          return (
            <div key={b.righe[0].indice} className="bg-white border border-blue-100 rounded-3xl p-4 mb-3 shadow-sm">
              <p className="text-sm font-bold text-blue-700">
                🔁 {giri} giri
                {b.serie.recupero && <span className="text-xs font-normal text-slate-500 ml-2">rec {b.serie.recupero} tra i giri</span>}
              </p>
              {b.righe.map(({ riga: r }, k) => (
                <p key={k} className="text-xs text-slate-500 mt-1">
                  {perGiro(r) > 1 && `${perGiro(r)}×`}{r.distanza} m {r.stile} · {r.tipo_lavoro}
                  {r.ripartenza && ` · ↻ ${r.ripartenza}`}{r.note && ` · ${r.note}`}
                </p>
              ))}
              {b.righe.some(({ indice }) => fisso(indice)) && b.righe.filter(({ indice }) => fisso(indice)).map(({ indice }) => <Salvati key={indice} i={indice} gruppo={b.righe.map((x) => x.indice)} />)}
              {!b.righe.some(({ indice }) => fisso(indice)) && b.righe.every(({ indice }) => chiuso(indice)) && (
                <Apri i={b.righe[0].indice} n={giri * b.righe.reduce((s, { riga }) => s + perGiro(riga), 0)} />
              )}
              {!b.righe.some(({ indice }) => fisso(indice)) && !b.righe.every(({ indice }) => chiuso(indice)) && b.righe.some(({ riga: r }) => aScelta(r)) && (
                <p className="mt-3 rounded-2xl border-2 border-blue-300 bg-blue-50 p-3 text-sm font-bold text-blue-700">
                  {proprio ? 'Sotto ogni tempo "A scelta" scegli lo stile che hai fatto.' : 'Sotto ogni tempo "A scelta" scegli lo stile che ha fatto.'}
                </p>
              )}
              {!b.righe.some(({ indice }) => fisso(indice)) && !b.righe.every(({ indice }) => chiuso(indice)) && Array.from({ length: giri }, (_, g) => (
                <div key={g} className="bg-gray-50 rounded-2xl p-3 mt-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">Giro {g + 1}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {b.righe.flatMap(({ riga: r, indice: i }) => Array.from({ length: perGiro(r) }, (_, k) => {
                      const j = g * perGiro(r) + k
                      // ripartenza di questo giro, se il coach l'ha cambiata rispetto a quella generale
                      const rip = r.ripartenze?.[j] && r.ripartenze[j] !== r.ripartenza ? ` ↻ ${r.ripartenze[j]}` : ''
                      const etichetta = `${r.distanza} m${haVarianti(r) ? ` ${ripetizioniDiRiga(r)[j].stile}${ripetizioniDiRiga(r)[j].nota ? ` ${ripetizioniDiRiga(r)[j].nota}` : ''}` : ''}${perGiro(r) > 1 ? ` (${k + 1})` : ''}${rip}`
                      return (
                        <div key={`${i}-${j}`}>
                          <InputTempo etichetta={etichetta} value={valori[i]?.[j] || ''} vuotoOk onChange={(v) => cambia(i, j, v)} />
                          {perPassaggio(i) && <StilePassaggio i={i} j={j} nome={`${etichetta}, giro ${g + 1}`} />}
                        </div>
                      )
                    }))}
                  </div>
                </div>
              ))}
              {!b.righe.some(({ indice }) => fisso(indice)) && !b.righe.every(({ indice }) => chiuso(indice)) && b.righe.map(({ riga: r, indice: i }) => <div key={i}>{mediaDi(i, r, true)}</div>)}
            </div>
          )
        }
        const { riga: r, indice: i } = b
        // con le vasche scelte dal coach si scrive un tempo per ogni tratto, non per ogni ripetizione
        const caselle = caselleDiRiga(r)
        const tratti = haTratti(r)
        const n = tratti ? caselle.length : Math.min(30, Number(r.ripetizioni) || 1)
        return (
          <div key={i} className="bg-white rounded-3xl p-4 mb-3 shadow-card">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
            <span className="ml-1.5"><PiuStili r={r} /></span>
            <span className="text-sm text-slate-600 ml-2">{Number(r.ripetizioni) || 1}×{r.distanza} m {r.stile}</span>
            {tratti && <p className="text-xs text-blue-700 mt-1">⏱ Tempi solo delle vasche scelte dal coach</p>}
            {ripartenzeDiRiga(r).length > 0 && <span className="text-xs text-slate-500 ml-2">↻ ripartenza {ripartenzeDiRiga(r).join(' · ')}</span>}
            {r.note && <p className="text-xs text-slate-500 mt-1">{r.note}</p>}
            {fisso(i) ? <Salvati i={i} /> : chiuso(i) ? <Apri i={i} n={n} /> : <><SceltaStile i={i} n={n} /><div className="grid grid-cols-2 gap-3 mt-3">
              {perPassaggio(i) ? Array.from({ length: n }, (_, j) => (
                <div key={j}>
                  <InputTempo etichetta={`Passaggio ${j + 1}`} value={valori[i]?.[j] || ''} vuotoOk onChange={(v) => cambia(i, j, v)} />
                  <StilePassaggio i={i} j={j} nome={`del passaggio ${j + 1}`} />
                </div>
              )) : Array.from({ length: n }, (_, j) => (
                <InputTempo key={j} etichetta={tratti ? `${caselle[j].etichetta}${caselle[j].nota ? ` · ${caselle[j].nota}` : ''}` : haVarianti(r) ?`${j + 1}ª · ${ripetizioniDiRiga(r)[j].stile}${ripetizioniDiRiga(r)[j].nota ? ` · ${ripetizioniDiRiga(r)[j].nota}` : ''}` : `Passaggio ${j + 1}`} value={valori[i]?.[j] || ''} vuotoOk
                  onChange={(v) => cambia(i, j, v)} />
              ))}
            </div>
            {stileCambiabile(base[i]) && (
              <div className="mt-1">
                {perPassaggio(i) && <p className="text-xs text-slate-500 mt-2">Sotto ogni tempo c'è lo stile: cambia quelli che {proprio ? 'hai fatto' : 'ha fatto'} diversi dal coach.</p>}
                <button type="button" onClick={() => setScelte({
                  ...scelte,
                  // si parte dagli stili scritti dal coach (il proprio stile già nello stile dell'atleta)
                  [i]: perPassaggio(i) ? undefined : caselleDiRiga(base[i]).slice(0, n).map((c) => (STILI.includes(c.stile) ? c.stile : '')),
                })} className="cliccabile min-h-[44px] text-sm font-semibold text-blue-600">
                  {perPassaggio(i) ? 'Torna agli stili del coach' : proprio ? 'Ho fatto un altro stile' : 'Ha fatto un altro stile'}
                </button>
              </div>
            )}
            {!tratti && mediaDi(i, r)}</>}
          </div>
        )
      })}
      {errore && <p className="text-sm text-white bg-red-600 rounded-lg px-3 py-2 mb-3">{errore}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}
      <button onClick={salva} disabled={salvo} className="w-full font-bold text-white bg-blue-600 disabled:opacity-60 rounded-2xl py-3.5">
        {salvo ? 'Salvo…' : proprio ? 'Salva i tempi' : 'Salva risultati'}
      </button>
    </>
  )
}
