import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Reorder, AnimatePresence, useDragControls } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { TIPI_LAVORO, STILI, distanzaDaTipo } from '../lib/lavori'
import { RIGA_VUOTA, TIPI_COACH, addGiorni, metriPiano, minutiPiano } from '../lib/pianoSquadra'
import PianoCard from './PianoCard'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const STATO = { nuovo: 'Nuovo', bozza: 'Bozza', pubblicato: 'Pubblicato' }

const nuovaRiga = (extra = {}) => ({ ...RIGA_VUOTA, ...extra, _id: crypto.randomUUID() })
const conId = (lista) => lista.map((r) => ({ ...r, _id: r._id || crypto.randomUUID() }))
// Stato del form in forma confrontabile, per capire se ci sono modifiche non salvate
const fotografia = (titolo, righe, vis) => JSON.stringify({ titolo, vis, righe: righe.map(({ _id, ...r }) => r) })

// Una riga di lavoro: si trascina dalla maniglia ⠿ oppure con le frecce, e si muove con un'animazione
function RigaLavoro({ r, i, totale, cambia, cambiaTipo, sposta, togli }) {
  const controlli = useDragControls()
  return (
    <Reorder.Item as="div" value={r} dragListener={false} dragControls={controlli}
      initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      whileDrag={{ scale: 1.03, boxShadow: '0 18px 40px rgba(37,99,235,0.25)', zIndex: 20 }}
      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
      className="relative bg-white border border-gray-100 rounded-3xl p-4 mb-3 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div onPointerDown={(e) => controlli.start(e)} style={{ touchAction: 'none' }}
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing select-none text-gray-400 text-sm font-semibold">
          <span className="text-xl leading-none">⠿</span> Lavoro {i + 1}
        </div>
        <div className="flex gap-2">
          <button onClick={() => sposta(i, -1)} disabled={i === 0} aria-label="Sposta su"
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold disabled:opacity-30 active:scale-90 transition">↑</button>
          <button onClick={() => sposta(i, 1)} disabled={i === totale - 1} aria-label="Sposta giù"
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold disabled:opacity-30 active:scale-90 transition">↓</button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 lg:items-end gap-2 mb-2">
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
      <div className="grid grid-cols-[1fr_6.5rem] gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Note (facoltative: recupero, ritmo...)</label>
          <input value={r.note} onChange={(e) => cambia(i, 'note', e.target.value)} placeholder={'Es. rec 20", gambe veloci'} className={CAMPO} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tempo (min)</label>
          <input type="number" min="1" step="1" inputMode="numeric" value={r.minuti ?? ''} placeholder="Es. 10"
            onChange={(e) => cambia(i, 'minuti', e.target.value)} className={CAMPO} />
        </div>
      </div>
      {totale > 1 && (
        <div className="text-right mt-2">
          <button onClick={() => togli(i)} className="text-xs text-red-500">Togli lavoro</button>
        </div>
      )}
    </Reorder.Item>
  )
}

// Il coach prepara l'allenamento di un giorno per la squadra (non un allenamento per sé)
export default function EditorAllenamento({ squadra, giorno }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [titolo, setTitolo] = useState('')
  const [righe, setRighe] = useState(() => [nuovaRiga()])
  const [vis, setVis] = useState('squadra')
  const [stato, setStato] = useState('nuovo')
  const [extra, setExtra] = useState([])
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  // Dopo la pubblicazione si vede la vista compatta; "Modifica" riapre l'editor
  const [modifica, setModifica] = useState(true)
  const [salvato, setSalvato] = useState(() => fotografia('', righe, 'squadra'))

  async function carica() {
    const { data } = await supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id).eq('data', giorno).maybeSingle()
    const t = data?.titolo || ''
    const r = data?.righe?.length ? conId(data.righe) : [nuovaRiga()]
    const v = data?.visibilita || 'squadra'
    setTitolo(t)
    setRighe(r)
    setVis(v)
    setSalvato(fotografia(t, r, v))
    setStato(data ? (data.pubblicato ? 'pubblicato' : 'bozza') : 'nuovo')
    return data
  }

  useEffect(() => {
    let attivo = true
    setErrore('')
    setOk('')
    setExtra([])
    setModifica(true)
    carica().then((data) => { if (attivo) setModifica(!data?.pubblicato) })
    return () => { attivo = false }
  }, [giorno, squadra.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const modificato = extra.length > 0 || fotografia(titolo, righe, vis) !== salvato

  // Esce dalla modifica scartando ciò che non hai salvato (chiede conferma se c'è qualcosa da perdere)
  async function esci() {
    if (modificato && !window.confirm('Ci sono modifiche non salvate. Uscire senza salvare?')) return
    setErrore('')
    setOk('')
    setExtra([])
    if (stato === 'nuovo') return navigate('/funzioni')
    await carica()
    setModifica(false)
  }

  const cambia = (i, campo, v) => setRighe(righe.map((r, k) => (k === i ? { ...r, [campo]: v } : r)))
  const cambiaTipo = (i, tipo) => {
    const d = distanzaDaTipo(tipo)
    setRighe(righe.map((r, k) => (k === i ? { ...r, tipo_lavoro: tipo, distanza: d ?? r.distanza } : r)))
  }
  const sposta = (i, verso) => {
    const j = i + verso
    if (j < 0 || j >= righe.length) return
    const copia = [...righe]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    setRighe(copia)
  }
  const aggiungiLavoro = (tipo) => {
    const d = tipo ? distanzaDaTipo(tipo) : null
    setRighe([...righe, nuovaRiga({ ...(tipo ? { tipo_lavoro: tipo } : {}), ...(d ? { distanza: d } : {}) })])
  }
  const togli = (i) => setRighe(righe.filter((_, k) => k !== i))
  // Tutti i giorni, weekend compreso: le due settimane dopo la data scelta
  const prossimi = Array.from({ length: 14 }, (_, i) => addGiorni(giorno, i + 1))
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
      minuti: Number(r.minuti) > 0 ? Number(r.minuti) : null,
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
    setSalvato(fotografia(titolo, righe, vis))
    setModifica(!pubblica)
    setExtra([])
    setOk(pubblica
      ? (vis === 'squadra' ? `Pubblicato alla squadra su ${giorni.length} giorno/i.` : 'Salvato: lo vedi solo tu.')
      : 'Bozza salvata.')
  }

  async function elimina() {
    const { error } = await supabase.from('allenamenti_squadra').delete().eq('squadra_id', squadra.id).eq('data', giorno)
    if (error) return setErrore('Non sono riuscito a eliminare: ' + error.message)
    const vuote = [nuovaRiga()]
    setTitolo('')
    setRighe(vuote)
    setSalvato(fotografia('', vuote, vis))
    setStato('nuovo')
    setModifica(true)
    setOk('Allenamento eliminato.')
  }

  if (stato !== 'nuovo' && !modifica) {
    return (
      <>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="font-bold">Allenamento di {squadra.nome}</p>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
            {stato === 'bozza' ? 'Bozza' : vis === 'coach' ? 'Solo coach' : 'Pubblicato'}
          </span>
        </div>
        <PianoCard piano={{ titolo: titolo || 'Allenamento', righe }} />
        {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}
        <button onClick={() => setModifica(true)} className="w-full font-bold text-blue-600 bg-blue-50 rounded-2xl py-3 mb-3">✏️ Modifica</button>
        {stato === 'pubblicato' && (
          <div className="text-right">
            <Link to={`/risultati?data=${giorno}`} className="text-sm font-semibold text-blue-600">
              Entra nella registrazione risultati per ogni atleta →
            </Link>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="font-bold">Allenamento di {squadra.nome}</p>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">{STATO[stato]}</span>
            <button onClick={esci} className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600 active:scale-95 transition">✕ Esci senza salvare</button>
          </div>
        </div>
        <label className="block text-xs text-gray-500 mb-1">Titolo (facoltativo)</label>
        <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Resistenza aerobica" className={CAMPO} />
      </div>

      <Reorder.Group as="div" axis="y" values={righe} onReorder={setRighe}>
        <AnimatePresence initial={false}>
          {righe.map((r, i) => (
            <RigaLavoro key={r._id} r={r} i={i} totale={righe.length}
              cambia={cambia} cambiaTipo={cambiaTipo} sposta={sposta} togli={togli} />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <div className="bg-white border border-gray-100 rounded-3xl p-4 mb-3 shadow-sm">
        <button onClick={() => aggiungiLavoro()}
          className="w-full text-blue-600 font-bold bg-blue-50 rounded-2xl py-3 mb-3">+ Aggiungi Lavoro</button>
        <p className="text-xs text-gray-400 mb-2">Oppure scegli subito il tipo di lavoro:</p>
        <div className="flex flex-wrap gap-2">
          {[...TIPI_COACH, ...TIPI_LAVORO].map((t) => (
            <button key={t} onClick={() => aggiungiLavoro(t)}
              className="text-xs font-semibold rounded-full px-3 py-1.5 bg-gray-100 text-gray-600 active:scale-95">+ {t}</button>
          ))}
        </div>
      </div>

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
        <p className="text-xs text-gray-400 mt-3">
          Totale: {(metriPiano(righe) / 1000).toFixed(1).replace('.', ',')} km
          {minutiPiano(righe) > 0 && ` · ${minutiPiano(righe)} min`}
        </p>
      </div>

      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => salva(false)} className="font-bold text-blue-600 bg-blue-50 rounded-2xl py-3.5">Salva bozza</button>
        <button onClick={() => salva(true)} className="font-bold text-white bg-blue-600 rounded-2xl py-3.5">
          {vis === 'squadra' ? 'Pubblica' : 'Salva'}
        </button>
      </div>
      <button onClick={esci} className="w-full font-bold text-gray-600 bg-gray-100 rounded-2xl py-3 mt-2 active:scale-[0.98] transition">✕ Esci senza salvare</button>
      {stato !== 'nuovo' && (
        <button onClick={elimina} className="w-full text-sm text-red-500 mt-3 py-2">Elimina allenamento di questo giorno</button>
      )}
    </>
  )
}
