import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import PiuStili from './PiuStili'
import { aggiornaMedia, campiMedia, leggiMedia } from '../lib/media'
import InputTempo from './InputTempo'
import { coloreLavoro } from '../lib/lavori'
import { blocchiPiano, chiaveRisultato as chiaveRiga, giriSerie, haVarianti, perGiro, ripartenzeDiRiga, ripetizioniDiRiga } from '../lib/pianoSquadra'
import { aggiungiInCoda, erroreDiRete, leggiCoda, rimuoviDaCoda } from '../lib/codaOffline'
import { distribuisci, gruppiPerStile, raccogli } from '../lib/varianti'
import { ERRORE_TEMPO_BREVE, erroreTempoImpossibile, normalizzaTempo, tempoPlausibile, tempoValido } from '../lib/tempo'

// Il coach vede il piano del giorno e scrive i risultati di ogni passaggio per un atleta.
// Funziona anche se l'atleta non ha ancora nessun tempo: si parte dalle righe del piano.
// proprio: è l'atleta che scrive i suoi tempi. Un lavoro già salvato si vede in verde e si corregge con "Correggi"
// (serve la connessione); i lavori nuovi senza connessione restano sul telefono e partono appena torna.
export default function RisultatiAtleta({ piano, atletaId, giorno, proprio = false }) {
  const righe = piano?.righe || []
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
    if (!atletaId || !piano) return
    supabase.from('allenamenti').select('*').eq('atleta_id', atletaId).eq('data_allenamento', giorno).order('created_at')
      .then(({ data }) => {
        if (!attivo) return
        const lista = [...(data || []), ...(proprio ? leggiCoda('allenamenti', atletaId).filter((r) => r.data_allenamento === giorno) : [])]
        setEsistenti(lista)
        const usati = new Set()
        const medieTrovate = {}
        setValori(righe.map((r, i) => {
          const gruppi = gruppiPerStile(r)
          const trovate = gruppi.map((g) => {
            const t = lista.find((e) => !usati.has(e.id) && chiaveRiga(e) === chiaveRiga({ ...r, stile: g.stile }))
            if (t) usati.add(t.id)
            return t
          })
          trovate.forEach((t, k) => { if (leggiMedia(t)) medieTrovate[`${i}-${k}`] = leggiMedia(t) })
          return distribuisci(gruppi, trovate.map((t) => t?.passaggi || []))
        }))
        setMedie(medieTrovate)
      })
    return () => { attivo = false }
  }, [atletaId, giorno, piano?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambia = (i, j, v) => {
    const copia = valori.map((a) => [...a])
    copia[i] = copia[i] || []
    copia[i][j] = v
    setValori(copia)
  }

  // Per ogni riga del piano, il lavoro già salvato che le corrisponde (se c'è)
  // Ogni stile di una riga è un lavoro salvato a sé: il tempo resta nella categoria del suo stile
  const usatiOra = new Set()
  const gruppiRighe = righe.map(gruppiPerStile)
  const perStile = righe.map((r, i) => gruppiRighe[i].map((g) => {
    const t = esistenti.find((e) => !usatiOra.has(e.id) && chiaveRiga(e) === chiaveRiga({ ...r, stile: g.stile }))
    if (t) usatiOra.add(t.id)
    return t || null
  }))
  const salvata = perStile.map((lista, i) => (lista.some(Boolean)
    ? { passaggi: distribuisci(gruppiRighe[i], lista.map((t) => t?.passaggi || [])), medie: lista.map((t) => leggiMedia(t)).filter(Boolean) }
    : null))
  // l'atleta vede i tempi già salvati al posto delle caselle; "Correggi" riapre le caselle già compilate
  const fisso = (i) => proprio && salvata[i] && !aperti.has(i)
  const Salvati = ({ i, gruppo }) => (
    <div className="flex items-center justify-between gap-2 text-sm text-green-700 bg-green-50 rounded-xl pl-3 pr-1 py-1 mt-3">
      <span className="min-w-0">Salvato: {[(salvata[i].passaggi || []).map((p) => p || '–').join(' · '), ...salvata[i].medie.map((m) => `media ${m}`)].filter(Boolean).join(' · ') || 'senza tempi'}</span>
      <button type="button" onClick={() => setAperti(new Set([...aperti, ...(gruppo || [i])]))}
        className="cliccabile shrink-0 min-h-[40px] px-3 rounded-lg font-bold text-blue-600 hover:bg-white">Correggi</button>
    </div>
  )

  // Tempo medio (per chi non ricorda i singoli passaggi): uno per ogni stile del lavoro
  const mediaDi = (i, r, conDistanza = false) => gruppiRighe[i].map((g, k) => {
    const chiave = `${i}-${k}`
    const nome = (conDistanza ? ` ${r.distanza} m` : '') + (gruppiRighe[i].length > 1 ? ` · ${g.stile}` : '')
    return chiave in medie ? (
      <div key={chiave} className="mt-3">
        <InputTempo etichetta={`Tempo medio${nome}`} value={medie[chiave] || ''} vuotoOk
          onChange={(v) => setMedie({ ...medie, [chiave]: v })} />
        <button type="button" onClick={() => { const { [chiave]: _tolta, ...resto } = medie; setMedie(resto) }}
          className="cliccabile min-h-[44px] text-xs font-bold text-slate-500">Togli la media</button>
      </div>
    ) : (
      <button key={chiave} type="button" onClick={() => setMedie({ ...medie, [chiave]: '' })}
        className="cliccabile min-h-[44px] mt-2 block text-sm font-semibold text-blue-600 text-left">
        Non ricordo tutti i tempi: scrivo la media{nome}
      </button>
    )
  })

  async function salva() {
    setErrore('')
    setOk('')
    const lavori = []
    for (let i = 0; i < righe.length; i++) {
      const n = Number(righe[i].ripetizioni) || 1
      const pulito = []
      for (let j = 0; j < n; j++) {
        const t = normalizzaTempo(valori[i]?.[j] || '')
        if (!t) { pulito.push(''); continue }
        if (!tempoValido(t)) return setErrore(`Lavoro ${i + 1}, passaggio ${j + 1}: ${ERRORE_TEMPO_BREVE}`)
        if (!tempoPlausibile(t, righe[i].distanza)) return setErrore(`Lavoro ${i + 1}, passaggio ${j + 1}: ${erroreTempoImpossibile(righe[i].distanza)}`)
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

    setSalvo(true)
    // Un lavoro per ogni stile della riga: [{ i, g, riga: lavoro già salvato | null, passaggi }]
    const pezzi = righe.flatMap((r, i) => gruppiRighe[i].map((g, k) => ({
      i, g, r, riga: perStile[i][k], passaggi: raccogli(g, lavori[i]), media: medieOk[`${i}-${k}`] || '',
    })))
    if (proprio) {
      // l'atleta aggiunge i lavori nuovi e corregge quelli riaperti con "Correggi"
      const nuove = pezzi.filter((x) => !x.riga && (x.passaggi.some(Boolean) || x.media)).map(({ r, g, passaggi, media }) => ({
        ...(media ? campiMedia(media) : {}),
        id: crypto.randomUUID(), atleta_id: atletaId, tipo_lavoro: r.tipo_lavoro, distanza: Number(r.distanza),
        ripetizioni: g.reps.length, stile: g.stile, passaggi, data_allenamento: giorno,
        created_at: new Date().toISOString(),
      }))
      const corrette = pezzi.filter((x) => x.riga && aperti.has(x.i))
      if (!nuove.length && !corrette.length) {
        setSalvo(false)
        return setErrore('Scrivi almeno un tempo.')
      }
      // un lavoro ancora in coda sul telefono (salvato senza connessione) si corregge lì, non nel database
      const inCodaIds = new Set(leggiCoda('allenamenti', atletaId).map((r) => r.id))
      if (corrette.some((x) => !inCodaIds.has(x.riga.id)) && !navigator.onLine) {
        setSalvo(false)
        return setErrore('Per correggere un tempo già inviato serve la connessione: riprova appena torna.')
      }
      for (const x of corrette) {
        if (inCodaIds.has(x.riga.id)) {
          rimuoviDaCoda('allenamenti', x.riga.id)
          aggiungiInCoda('allenamenti', { ...x.riga, passaggi: x.passaggi, ...aggiornaMedia(x.riga, x.media) })
          continue
        }
        const { error } = await supabase.from('allenamenti').update({ passaggi: x.passaggi, ...aggiornaMedia(x.riga, x.media) }).eq('id', x.riga.id)
        if (error) {
          setSalvo(false)
          return setErrore('Non sono riuscito a correggere: ' + error.message)
        }
      }
      const aggiornate = esistenti.map((e) => {
        const x = corrette.find((c) => c.riga.id === e.id)
        return x ? { ...e, passaggi: x.passaggi, ...aggiornaMedia(e, x.media) } : e
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
    for (const { r, g, riga, passaggi, media } of pezzi) {
      // I vuoti in mezzo restano (''), così ogni tempo resta nel suo passaggio o nel suo giro
      if (!passaggi.some(Boolean) && !media && !riga) continue // niente da salvare per questo stile
      const { error } = riga
        ? await supabase.from('allenamenti').update({ passaggi, ...aggiornaMedia(riga, media), ripetizioni: g.reps.length }).eq('id', riga.id)
        : await supabase.from('allenamenti').insert({
            atleta_id: atletaId, tipo_lavoro: r.tipo_lavoro, distanza: Number(r.distanza),
            ripetizioni: g.reps.length, stile: g.stile, passaggi, ...(media ? campiMedia(media) : {}), data_allenamento: giorno,
          })
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
              {!b.righe.some(({ indice }) => fisso(indice)) && !b.righe.every(({ indice }) => chiuso(indice)) && Array.from({ length: giri }, (_, g) => (
                <div key={g} className="bg-gray-50 rounded-2xl p-3 mt-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">Giro {g + 1}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {b.righe.flatMap(({ riga: r, indice: i }) => Array.from({ length: perGiro(r) }, (_, k) => {
                      const j = g * perGiro(r) + k
                      // ripartenza di questo giro, se il coach l'ha cambiata rispetto a quella generale
                      const rip = r.ripartenze?.[j] && r.ripartenze[j] !== r.ripartenza ? ` ↻ ${r.ripartenze[j]}` : ''
                      return (
                        <InputTempo key={`${i}-${j}`} etichetta={`${r.distanza} m${haVarianti(r) ? ` ${ripetizioniDiRiga(r)[j].stile}${ripetizioniDiRiga(r)[j].nota ? ` ${ripetizioniDiRiga(r)[j].nota}` : ''}` : ''}${perGiro(r) > 1 ? ` (${k + 1})` : ''}${rip}`}
                          value={valori[i]?.[j] || ''} vuotoOk onChange={(v) => cambia(i, j, v)} />
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
        const n = Math.min(30, Number(r.ripetizioni) || 1)
        return (
          <div key={i} className="bg-white rounded-3xl p-4 mb-3 shadow-card">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
            <span className="ml-1.5"><PiuStili r={r} /></span>
            <span className="text-sm text-slate-600 ml-2">{n}×{r.distanza} m {r.stile}</span>
            {ripartenzeDiRiga(r).length > 0 && <span className="text-xs text-slate-500 ml-2">↻ ripartenza {ripartenzeDiRiga(r).join(' · ')}</span>}
            {r.note && <p className="text-xs text-slate-500 mt-1">{r.note}</p>}
            {fisso(i) ? <Salvati i={i} /> : chiuso(i) ? <Apri i={i} n={n} /> : <><div className="grid grid-cols-2 gap-3 mt-3">
              {Array.from({ length: n }, (_, j) => (
                <InputTempo key={j} etichetta={haVarianti(r) ? `${j + 1}ª · ${ripetizioniDiRiga(r)[j].stile}${ripetizioniDiRiga(r)[j].nota ? ` · ${ripetizioniDiRiga(r)[j].nota}` : ''}` : `Passaggio ${j + 1}`} value={valori[i]?.[j] || ''} vuotoOk
                  onChange={(v) => cambia(i, j, v)} />
              ))}
            </div>
            {mediaDi(i, r)}</>}
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
