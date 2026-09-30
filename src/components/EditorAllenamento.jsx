import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { TIPI_LAVORO, STILI, distanzaDaTipo } from '../lib/lavori'
import { GIORNI_ALLENAMENTO } from '../lib/presenze'
import { RIGA_VUOTA, TIPI_COACH, addGiorni, metriPiano } from '../lib/pianoSquadra'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const STATO = { nuovo: 'Nuovo', bozza: 'Bozza', pubblicato: 'Pubblicato' }

// Il coach prepara l'allenamento di un giorno per la squadra (non un allenamento per sé)
export default function EditorAllenamento({ squadra, giorno }) {
  const { user } = useAuth()
  const [titolo, setTitolo] = useState('')
  const [righe, setRighe] = useState([{ ...RIGA_VUOTA }])
  const [vis, setVis] = useState('squadra')
  const [stato, setStato] = useState('nuovo')
  const [extra, setExtra] = useState([])
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    let attivo = true
    setErrore('')
    setOk('')
    setExtra([])
    supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id).eq('data', giorno).maybeSingle()
      .then(({ data }) => {
        if (!attivo) return
        setTitolo(data?.titolo || '')
        setRighe(data?.righe?.length ? data.righe : [{ ...RIGA_VUOTA }])
        setVis(data?.visibilita || 'squadra')
        setStato(data ? (data.pubblicato ? 'pubblicato' : 'bozza') : 'nuovo')
      })
    return () => { attivo = false }
  }, [giorno, squadra.id])

  const cambia = (i, campo, v) => setRighe(righe.map((r, k) => (k === i ? { ...r, [campo]: v } : r)))
  const cambiaTipo = (i, tipo) => {
    const d = distanzaDaTipo(tipo)
    setRighe(righe.map((r, k) => (k === i ? { ...r, tipo_lavoro: tipo, distanza: d ?? r.distanza } : r)))
  }
  // Solo giorni di allenamento (lunedì-venerdì): i prossimi 10 dopo la data scelta
  const prossimi = Array.from({ length: 21 }, (_, i) => addGiorni(giorno, i + 1))
    .filter((d) => GIORNI_ALLENAMENTO.includes(new Date(d + 'T12:00:00').getDay()))
    .slice(0, 10)
  const toggleExtra = (d) => setExtra(extra.includes(d) ? extra.filter((x) => x !== d) : [...extra, d])

  async function salva(pubblica) {
    setErrore('')
    setOk('')
    const storta = righe.findIndex((r) => !(Number(r.distanza) >= 25))
    if (storta >= 0) {
      setErrore(`Riga ${storta + 1}: scrivi la distanza (da 25 metri in su) nel campo "Distanza (m)".`)
      return
    }
    const pulite = righe.map((r) => ({
      tipo_lavoro: r.tipo_lavoro,
      distanza: Number(r.distanza),
      ripetizioni: Number(r.ripetizioni) || 1,
      stile: r.stile,
      note: r.note || '',
    }))
    const giorni = [giorno, ...extra]
    const { error } = await supabase.from('allenamenti_squadra').upsert(
      giorni.map((data) => ({
        squadra_id: squadra.id, coach_id: user.id, data,
        titolo: titolo.trim() || null, righe: pulite, visibilita: vis, pubblicato: pubblica,
      })),
      { onConflict: 'squadra_id,data' }
    )
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    setStato(pubblica ? 'pubblicato' : 'bozza')
    setExtra([])
    setOk(pubblica
      ? (vis === 'squadra' ? `Pubblicato alla squadra su ${giorni.length} giorno/i.` : 'Salvato: lo vedi solo tu.')
      : 'Bozza salvata.')
  }

  async function elimina() {
    const { error } = await supabase.from('allenamenti_squadra').delete().eq('squadra_id', squadra.id).eq('data', giorno)
    if (error) return setErrore('Non sono riuscito a eliminare: ' + error.message)
    setTitolo('')
    setRighe([{ ...RIGA_VUOTA }])
    setStato('nuovo')
    setOk('Allenamento eliminato.')
  }

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold">Allenamento di {squadra.nome}</p>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{STATO[stato]}</span>
        </div>
        <label className="block text-xs text-gray-500 mb-1">Titolo (facoltativo)</label>
        <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Resistenza aerobica" className={CAMPO} />
      </div>

      {righe.map((r, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-3xl p-4 mb-3 shadow-sm">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select value={r.tipo_lavoro} onChange={(e) => cambiaTipo(i, e.target.value)} className={CAMPO}>
              {[...TIPI_COACH, ...TIPI_LAVORO].map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={r.stile} onChange={(e) => cambia(i, 'stile', e.target.value)} className={CAMPO}>
              {STILI.map((s) => <option key={s}>{s}</option>)}
            </select>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ripetizioni</label>
              <input type="number" min="1" max="50" value={r.ripetizioni} onChange={(e) => cambia(i, 'ripetizioni', e.target.value)} className={CAMPO} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Distanza (m)</label>
              <input type="number" min="25" step="25" value={r.distanza} onChange={(e) => cambia(i, 'distanza', e.target.value)} className={CAMPO} />
            </div>
          </div>
          <label className="block text-xs text-gray-500 mb-1">Note (facoltative: recupero, ritmo...)</label>
          <input value={r.note} onChange={(e) => cambia(i, 'note', e.target.value)} placeholder="Es. rec 20&quot;, gambe veloci" className={CAMPO} />
          {righe.length > 1 && (
            <button onClick={() => setRighe(righe.filter((_, k) => k !== i))} className="text-xs text-red-500 mt-2">Togli riga</button>
          )}
        </div>
      ))}
      <button onClick={() => setRighe([...righe, { ...RIGA_VUOTA }])}
        className="w-full text-blue-600 font-bold bg-blue-50 rounded-2xl py-3 mb-3">+ Aggiungi riga</button>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <p className="text-sm font-bold mb-2">Chi lo vede</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[['coach', '🔒 Solo coach'], ['squadra', '👥 Tutta la squadra']].map(([k, n]) => (
            <button key={k} onClick={() => setVis(k)}
              className={`rounded-xl py-2.5 text-sm font-semibold ${vis === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{n}</button>
          ))}
        </div>
        <p className="text-sm font-bold mb-2">Copia anche su altri giorni</p>
        <div className="flex flex-wrap gap-2">
          {prossimi.map((d) => (
            <button key={d} onClick={() => toggleExtra(d)}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 ${extra.includes(d) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {GG[new Date(d + 'T12:00:00').getDay()]} {Number(d.slice(8))}
            </button>
          ))}
        </div>
        {extra.length > 0 && <p className="text-xs text-amber-700 mt-2">Se in quei giorni c'è già un allenamento, verrà sostituito.</p>}
        <p className="text-xs text-gray-400 mt-3">Totale: {(metriPiano(righe) / 1000).toFixed(1).replace('.', ',')} km</p>
      </div>

      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => salva(false)} className="font-bold text-blue-600 bg-blue-50 rounded-2xl py-3.5">Salva bozza</button>
        <button onClick={() => salva(true)} className="font-bold text-white bg-blue-600 rounded-2xl py-3.5">
          {vis === 'squadra' ? 'Pubblica' : 'Salva'}
        </button>
      </div>
      {stato !== 'nuovo' && (
        <button onClick={elimina} className="w-full text-sm text-red-500 mt-3 py-2">Elimina allenamento di questo giorno</button>
      )}
    </>
  )
}
