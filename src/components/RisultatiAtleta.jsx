import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import InputTempo from './InputTempo'
import { coloreLavoro } from '../lib/lavori'
import { blocchiPiano, chiaveRisultato as chiaveRiga, giriSerie, perGiro, ripartenzeDiRiga } from '../lib/pianoSquadra'
import { aggiungiInCoda, erroreDiRete, leggiCoda } from '../lib/codaOffline'
import { ERRORE_TEMPO_BREVE, erroreTempoImpossibile, normalizzaTempo, tempoPlausibile, tempoValido } from '../lib/tempo'

// Il coach vede il piano del giorno e scrive i risultati di ogni passaggio per un atleta.
// Funziona anche se l'atleta non ha ancora nessun tempo: si parte dalle righe del piano.
// proprio: è l'atleta che scrive i suoi tempi. Può solo aggiungere (un lavoro già salvato si vede qui
// e si toglie dallo Storico); senza connessione i tempi restano sul telefono e partono appena torna.
export default function RisultatiAtleta({ piano, atletaId, giorno, proprio = false }) {
  const righe = piano?.righe || []
  const [esistenti, setEsistenti] = useState([]) // righe già salvate in "allenamenti" per quel giorno
  const [valori, setValori] = useState([])       // valori[i] = array di passaggi della riga i del piano
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
        setValori(righe.map((r) => {
          const k = chiaveRiga(r)
          const trovata = lista.find((e) => !usati.has(e.id) && chiaveRiga(e) === k)
          if (trovata) usati.add(trovata.id)
          return [...(trovata?.passaggi || [])]
        }))
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
  const usatiOra = new Set()
  const salvata = righe.map((r) => {
    const t = esistenti.find((e) => !usatiOra.has(e.id) && chiaveRiga(e) === chiaveRiga(r))
    if (t) usatiOra.add(t.id)
    return t || null
  })
  // l'atleta vede i tempi già salvati al posto delle caselle
  const fisso = (i) => proprio && salvata[i]
  const Salvati = ({ i }) => (
    <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2 mt-3">
      Salvato: {(salvata[i].passaggi || []).map((p) => p || '–').join(' · ') || 'senza tempi'}
    </p>
  )

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

    setSalvo(true)
    if (proprio) {
      // l'atleta aggiunge solo i lavori non ancora salvati
      const nuove = righe.map((r, i) => (!salvata[i] && lavori[i].some(Boolean) ? {
        id: crypto.randomUUID(), atleta_id: atletaId, tipo_lavoro: r.tipo_lavoro, distanza: Number(r.distanza),
        ripetizioni: Number(r.ripetizioni) || 1, stile: r.stile, passaggi: lavori[i], data_allenamento: giorno,
        created_at: new Date().toISOString(),
      } : null)).filter(Boolean)
      if (!nuove.length) {
        setSalvo(false)
        return setErrore('Scrivi almeno un tempo.')
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
      setEsistenti([...esistenti, ...nuove])
      setSalvo(false)
      return setOk(inCoda ? 'Salvati sul telefono: partono appena torna la connessione.' : 'Tempi salvati.')
    }
    const usati = new Set()
    for (let i = 0; i < righe.length; i++) {
      const r = righe[i]
      const k = chiaveRiga(r)
      const trovata = esistenti.find((e) => !usati.has(e.id) && chiaveRiga(e) === k)
      if (trovata) usati.add(trovata.id)
      // I vuoti in mezzo restano (''), così ogni tempo resta nel suo passaggio o nel suo giro
      const passaggi = lavori[i]
      if (!passaggi.some(Boolean) && !trovata) continue // niente da salvare per questa riga
      const { error } = trovata
        ? await supabase.from('allenamenti').update({ passaggi, ripetizioni: Number(r.ripetizioni) || 1 }).eq('id', trovata.id)
        : await supabase.from('allenamenti').insert({
            atleta_id: atletaId, tipo_lavoro: r.tipo_lavoro, distanza: Number(r.distanza),
            ripetizioni: Number(r.ripetizioni) || 1, stile: r.stile, passaggi, data_allenamento: giorno,
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
              {b.righe.some(({ indice }) => fisso(indice)) && b.righe.filter(({ indice }) => fisso(indice)).map(({ indice }) => <Salvati key={indice} i={indice} />)}
              {!b.righe.some(({ indice }) => fisso(indice)) && chiuso(b.righe[0].indice) && (
                <Apri i={b.righe[0].indice} n={giri * b.righe.reduce((s, { riga }) => s + perGiro(riga), 0)} />
              )}
              {!b.righe.some(({ indice }) => fisso(indice)) && !chiuso(b.righe[0].indice) && Array.from({ length: giri }, (_, g) => (
                <div key={g} className="bg-gray-50 rounded-2xl p-3 mt-3">
                  <p className="text-xs font-bold text-slate-600 mb-2">Giro {g + 1}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {b.righe.flatMap(({ riga: r, indice: i }) => Array.from({ length: perGiro(r) }, (_, k) => {
                      const j = g * perGiro(r) + k
                      // ripartenza di questo giro, se il coach l'ha cambiata rispetto a quella generale
                      const rip = r.ripartenze?.[j] && r.ripartenze[j] !== r.ripartenza ? ` ↻ ${r.ripartenze[j]}` : ''
                      return (
                        <InputTempo key={`${i}-${j}`} etichetta={`${r.distanza} m${perGiro(r) > 1 ? ` (${k + 1})` : ''}${rip}`}
                          value={valori[i]?.[j] || ''} vuotoOk onChange={(v) => cambia(i, j, v)} />
                      )
                    }))}
                  </div>
                </div>
              ))}
            </div>
          )
        }
        const { riga: r, indice: i } = b
        const n = Math.min(30, Number(r.ripetizioni) || 1)
        return (
          <div key={i} className="bg-white rounded-3xl p-4 mb-3 shadow-card">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
            <span className="text-sm text-slate-600 ml-2">{n}×{r.distanza} m {r.stile}</span>
            {ripartenzeDiRiga(r).length > 0 && <span className="text-xs text-slate-500 ml-2">↻ ripartenza {ripartenzeDiRiga(r).join(' · ')}</span>}
            {r.note && <p className="text-xs text-slate-500 mt-1">{r.note}</p>}
            {fisso(i) ? <Salvati i={i} /> : chiuso(i) ? <Apri i={i} n={n} /> : <div className="grid grid-cols-2 gap-3 mt-3">
              {Array.from({ length: n }, (_, j) => (
                <InputTempo key={j} etichetta={`Passaggio ${j + 1}`} value={valori[i]?.[j] || ''} vuotoOk
                  onChange={(v) => cambia(i, j, v)} />
              ))}
            </div>}
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
