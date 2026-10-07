import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import InputTempo from './InputTempo'
import { coloreLavoro } from '../lib/lavori'
import { blocchiPiano, giriSerie, perGiro, ripartenzeDiRiga } from '../lib/pianoSquadra'
import { ERRORE_TEMPO_BREVE, erroreTempoImpossibile, normalizzaTempo, tempoPlausibile, tempoValido } from '../lib/tempo'

const chiaveRiga = (r) => [r.tipo_lavoro, Number(r.distanza), r.stile, Number(r.ripetizioni) || 1].join('|')

// Il coach vede il piano del giorno e scrive i risultati di ogni passaggio per un atleta.
// Funziona anche se l'atleta non ha ancora nessun tempo: si parte dalle righe del piano.
export default function RisultatiAtleta({ piano, atletaId, giorno }) {
  const righe = piano?.righe || []
  const [esistenti, setEsistenti] = useState([]) // righe già salvate in "allenamenti" per quel giorno
  const [valori, setValori] = useState([])       // valori[i] = array di passaggi della riga i del piano
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    let attivo = true
    setErrore('')
    setOk('')
    if (!atletaId || !piano) return
    supabase.from('allenamenti').select('*').eq('atleta_id', atletaId).eq('data_allenamento', giorno).order('created_at')
      .then(({ data }) => {
        if (!attivo) return
        const lista = data || []
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
    const usati = new Set()
    for (let i = 0; i < righe.length; i++) {
      const r = righe[i]
      const k = chiaveRiga(r)
      const trovata = esistenti.find((e) => !usati.has(e.id) && chiaveRiga(e) === k)
      if (trovata) usati.add(trovata.id)
      const passaggi = lavori[i].filter(Boolean)
      if (!passaggi.length && !trovata) continue // niente da salvare per questa riga
      const { error } = trovata
        ? await supabase.from('allenamenti').update({ passaggi }).eq('id', trovata.id)
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
      <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-3xl p-6 text-center shadow-sm">
        Nessun allenamento in questo giorno. Preparalo da Allenamenti.
      </p>
    )
  }

  return (
    <>
      <p className="text-sm text-gray-500 mb-2 px-1">📋 {piano.titolo || 'Allenamento del giorno'}</p>
      {blocchiPiano(righe).map((b) => {
        if (b.serie) {
          // Serie a giri: i tempi si scrivono giro per giro, nell'ordine in cui si nuotano
          const giri = giriSerie(b.righe[0].riga)
          return (
            <div key={b.righe[0].indice} className="bg-white border border-blue-100 rounded-3xl p-4 mb-3 shadow-sm">
              <p className="text-sm font-bold text-blue-700">
                🔁 {giri} giri
                {b.serie.recupero && <span className="text-xs font-normal text-gray-500 ml-2">rec {b.serie.recupero} tra i giri</span>}
              </p>
              {b.righe.map(({ riga: r }, k) => (
                <p key={k} className="text-xs text-gray-500 mt-1">
                  {perGiro(r) > 1 && `${perGiro(r)}×`}{r.distanza} m {r.stile} · {r.tipo_lavoro}
                  {r.ripartenza && ` · ↻ ${r.ripartenza}`}{r.note && ` · ${r.note}`}
                </p>
              ))}
              {Array.from({ length: giri }, (_, g) => (
                <div key={g} className="bg-gray-50 rounded-2xl p-3 mt-3">
                  <p className="text-xs font-bold text-gray-600 mb-2">Giro {g + 1}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {b.righe.flatMap(({ riga: r, indice: i }) => Array.from({ length: perGiro(r) }, (_, k) => {
                      const j = g * perGiro(r) + k
                      return (
                        <InputTempo key={`${i}-${j}`} etichetta={`${r.distanza} m${perGiro(r) > 1 ? ` (${k + 1})` : ''}`}
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
          <div key={i} className="bg-white border border-gray-100 rounded-3xl p-4 mb-3 shadow-sm">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
            <span className="text-sm text-gray-600 ml-2">{n}×{r.distanza} m {r.stile}</span>
            {ripartenzeDiRiga(r).length > 0 && <span className="text-xs text-gray-500 ml-2">↻ ripartenza {ripartenzeDiRiga(r).join(' · ')}</span>}
            {r.note && <p className="text-xs text-gray-400 mt-1">{r.note}</p>}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {Array.from({ length: n }, (_, j) => (
                <InputTempo key={j} etichetta={`Passaggio ${j + 1}`} value={valori[i]?.[j] || ''} vuotoOk
                  onChange={(v) => cambia(i, j, v)} />
              ))}
            </div>
          </div>
        )
      })}
      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}
      <button onClick={salva} disabled={salvo} className="w-full font-bold text-white bg-blue-600 disabled:opacity-60 rounded-2xl py-3.5">
        {salvo ? 'Salvo…' : 'Salva risultati'}
      </button>
    </>
  )
}
