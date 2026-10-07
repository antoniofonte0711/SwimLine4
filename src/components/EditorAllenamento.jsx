import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Reorder, AnimatePresence, useDragControls } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { TIPI_LAVORO, distanzaDaTipo } from '../lib/lavori'
import { RIGA_VUOTA, STILI_COACH, TIPI_COACH, addGiorni, blocchiPiano, metriPiano, minutiPiano, perGiro } from '../lib/pianoSquadra'
import { normalizzaRipartenza, ripartenzaValida } from '../lib/tempo'
import PianoCard from './PianoCard'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const STATO = { nuovo: 'Nuovo', bozza: 'Bozza', pubblicato: 'Pubblicato' }
const ANIMA = {
  initial: { opacity: 0, y: 16, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
  whileDrag: { scale: 1.03, boxShadow: '0 18px 40px rgba(37,99,235,0.25)', zIndex: 20 },
  transition: { type: 'spring', stiffness: 500, damping: 38 },
}

const nuovaRiga = (extra = {}) => ({ ...RIGA_VUOTA, ...extra, _id: crypto.randomUUID() })
// Nell'editor le righe di una serie a giri tengono le ripetizioni di un solo giro (si moltiplicano al salvataggio)
const conId = (lista) => lista.map((r) => ({ ...r, _id: r._id || crypto.randomUUID(), ...(r.serie && { ripetizioni: perGiro(r) }) }))
// Stato del form in forma confrontabile, per capire se ci sono modifiche non salvate
const fotografia = (titolo, righe, vis) => JSON.stringify({ titolo, vis, righe: righe.map(({ _id, ...r }) => r) })
// Chiave di un blocco (riga singola o serie a giri) per riordinarli
const chiaveBlocco = (b) => (b.serie ? 's:' + b.serie.id : b.riga._id)

// Campo ripartenza: si scrive come si vuole (130, 1:30...) e uscendo diventa 1'30"; rosso solo se non si capisce
function InputRipartenza({ value, onChange, etichetta, placeholder = `Es. 1'30"` }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{etichetta}</label>
      <input value={value ?? ''} placeholder={placeholder} inputMode="decimal" autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(normalizzaRipartenza(e.target.value))}
        className={`${CAMPO} ${ripartenzaValida(normalizzaRipartenza(value)) ? '' : 'border-red-400'}`} />
    </div>
  )
}

function Frecce({ su, giu, primo, ultimo }) {
  return (
    <div className="flex gap-2">
      <button onClick={su} disabled={primo} aria-label="Sposta su"
        className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold disabled:opacity-30 active:scale-90 transition">↑</button>
      <button onClick={giu} disabled={ultimo} aria-label="Sposta giù"
        className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 font-bold disabled:opacity-30 active:scale-90 transition">↓</button>
    </div>
  )
}

// I campi di una riga di lavoro. Dentro una serie a giri le ripetizioni sono "per giro"
// e il tempo si scrive una volta sola per tutta la serie.
function CampiRiga({ r, i, inSerie, cambia, cambiaTipo }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 lg:items-end gap-2 mb-2">
        <select value={r.tipo_lavoro} onChange={(e) => cambiaTipo(i, e.target.value)} className={CAMPO}>
          {[...TIPI_COACH, ...TIPI_LAVORO].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={r.stile} onChange={(e) => cambia(i, 'stile', e.target.value)} className={CAMPO}>
          {STILI_COACH.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{inSerie ? 'Ripetizioni per giro' : 'Ripetizioni'}</label>
          <input type="number" min="1" max="50" value={r.ripetizioni} onChange={(e) => cambia(i, 'ripetizioni', e.target.value)} className={CAMPO} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Distanza (m)</label>
          <input type="number" min="25" step="25" value={r.distanza} onChange={(e) => cambia(i, 'distanza', e.target.value)} className={CAMPO} />
        </div>
      </div>
      <div className={`grid grid-cols-2 gap-2 lg:items-end ${inSerie ? 'lg:grid-cols-[1fr_7rem]' : 'lg:grid-cols-[1fr_7rem_7rem]'}`}>
        <div className="col-span-2 lg:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Note (facoltative: recupero, ritmo...)</label>
          <input value={r.note} onChange={(e) => cambia(i, 'note', e.target.value)} placeholder={'Es. rec 20", gambe veloci'} className={CAMPO} />
        </div>
        <InputRipartenza etichetta="Ripartenza" value={r.ripartenza} onChange={(v) => cambia(i, 'ripartenza', v)} />
        {!inSerie && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tempo (min)</label>
            <input type="number" min="1" step="1" inputMode="numeric" value={r.minuti ?? ''} placeholder="Es. 10"
              onChange={(e) => cambia(i, 'minuti', e.target.value)} className={CAMPO} />
          </div>
        )}
      </div>
    </>
  )
}

// Una riga di lavoro: si trascina dalla maniglia ⠿ oppure con le frecce, e si muove con un'animazione
function RigaLavoro({ chiave, r, i, primo, ultimo, puoiTogliere, cambia, cambiaTipo, sposta, togli }) {
  const controlli = useDragControls()
  const n = Math.min(50, Math.max(1, Number(r.ripetizioni) || 1))
  // Ripartenze personalizzate: una casella per ogni ripetizione (vuota = usa la ripartenza generale)
  const personali = Array.isArray(r.ripartenze)
  const cambiaRipartenza = (j, v) => {
    const lista = Array.from({ length: n }, (_, k) => r.ripartenze?.[k] ?? '')
    lista[j] = v
    cambia(i, 'ripartenze', lista)
  }
  return (
    <Reorder.Item as="div" value={chiave} dragListener={false} dragControls={controlli} {...ANIMA}
      className="relative bg-white border border-gray-100 rounded-3xl p-4 mb-3 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div onPointerDown={(e) => controlli.start(e)} style={{ touchAction: 'none' }}
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing select-none text-gray-400 text-sm font-semibold">
          <span className="text-xl leading-none">⠿</span> Lavoro {i + 1}
        </div>
        <Frecce su={() => sposta(chiave, -1)} giu={() => sposta(chiave, 1)} primo={primo} ultimo={ultimo} />
      </div>
      <CampiRiga r={r} i={i} cambia={cambia} cambiaTipo={cambiaTipo} />
      {personali && n > 1 && (
        <div className="bg-gray-50 rounded-2xl p-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600">Ripartenza di ogni ripetizione</p>
            <button onClick={() => cambia(i, 'ripartenze', undefined)} className="text-xs text-red-500">Togli</button>
          </div>
          <p className="text-xs text-gray-400 mb-2">Le caselle vuote usano la ripartenza generale.</p>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            {Array.from({ length: n }, (_, j) => (
              <InputRipartenza key={j} etichetta={`${j + 1}° ${r.distanza || ''}`} value={r.ripartenze[j]}
                placeholder={r.ripartenza || `1'30"`} onChange={(v) => cambiaRipartenza(j, v)} />
            ))}
          </div>
        </div>
      )}
      {((!personali && n > 1) || puoiTogliere) && (
        <div className="flex items-center justify-between gap-2 mt-2">
          {!personali && n > 1
            ? <button onClick={() => cambia(i, 'ripartenze', [])} className="text-xs font-semibold text-blue-600">+ Ripartenza diversa per ogni ripetizione</button>
            : <span />}
          {puoiTogliere && <button onClick={() => togli(i)} className="text-xs text-red-500">Togli lavoro</button>}
        </div>
      )}
    </Reorder.Item>
  )
}

// Serie a giri: un gruppo di lavori nuotati in sequenza e ripetuti N volte (es. 3 giri di 400-300-200)
function SerieGiri({ chiave, serie, righe, primo, ultimo, cambia, cambiaTipo, cambiaSerie, sposta, spostaInSerie, togli, aggiungiInSerie, sciogli }) {
  const controlli = useDragControls()
  return (
    <Reorder.Item as="div" value={chiave} dragListener={false} dragControls={controlli} {...ANIMA}
      className="relative bg-blue-50/60 border-2 border-blue-200 rounded-3xl p-3 mb-3 shadow-sm">
      <div className="flex items-center justify-between mb-3 px-1">
        <div onPointerDown={(e) => controlli.start(e)} style={{ touchAction: 'none' }}
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing select-none text-blue-700 text-sm font-bold">
          <span className="text-xl leading-none">⠿</span> 🔁 Serie a giri
        </div>
        <Frecce su={() => sposta(chiave, -1)} giu={() => sposta(chiave, 1)} primo={primo} ultimo={ultimo} />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-1 px-1">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Giri</label>
          <input type="number" min="1" max="20" value={serie.giri} onChange={(e) => cambiaSerie(serie.id, 'giri', e.target.value)} className={CAMPO} />
        </div>
        <InputRipartenza etichetta="Recupero tra i giri" placeholder={'Es. 20"'} value={serie.recupero}
          onChange={(v) => cambiaSerie(serie.id, 'recupero', v)} />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tempo (min)</label>
          <input type="number" min="1" step="1" inputMode="numeric" value={serie.minuti ?? ''} placeholder="Es. 45"
            onChange={(e) => cambiaSerie(serie.id, 'minuti', e.target.value)} className={CAMPO} />
        </div>
      </div>
      <p className="text-xs text-blue-700/70 mb-3 px-1">
        Ogni giro: {righe.map(({ riga }) => `${Number(riga.ripetizioni) > 1 ? riga.ripetizioni + '×' : ''}${riga.distanza}`).join(' – ')}
      </p>
      {righe.map(({ riga, indice }, k) => (
        <div key={riga._id} className="bg-white border border-gray-100 rounded-2xl p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-500">{k + 1}° della serie</p>
            <Frecce su={() => spostaInSerie(indice, -1)} giu={() => spostaInSerie(indice, 1)} primo={k === 0} ultimo={k === righe.length - 1} />
          </div>
          <CampiRiga r={riga} i={indice} inSerie cambia={cambia} cambiaTipo={cambiaTipo} />
          <div className="text-right mt-2">
            <button onClick={() => togli(indice)} className="text-xs text-red-500">Togli dalla serie</button>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <button onClick={() => aggiungiInSerie(serie.id)} className="text-xs font-semibold text-blue-600">+ Lavoro nella serie</button>
        <button onClick={() => sciogli(serie.id)} className="text-xs text-gray-500">Sciogli serie</button>
      </div>
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

  const blocchi = blocchiPiano(righe)
  const chiavi = blocchi.map(chiaveBlocco)
  // Ricostruisce le righe dall'ordine dei blocchi (una serie si sposta tutta insieme)
  const riordina = (nuove) => {
    const perChiave = Object.fromEntries(blocchi.map((b) => [chiaveBlocco(b), b.serie ? b.righe.map((x) => x.riga) : [b.riga]]))
    setRighe(nuove.flatMap((k) => perChiave[k]))
  }
  const sposta = (chiave, verso) => {
    const i = chiavi.indexOf(chiave)
    const j = i + verso
    if (j < 0 || j >= chiavi.length) return
    const copia = [...chiavi]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    riordina(copia)
  }
  // Dentro una serie si scambia solo con la riga vicina della stessa serie
  const spostaInSerie = (i, verso) => {
    const j = i + verso
    if (righe[j]?.serie?.id !== righe[i].serie?.id) return
    const copia = [...righe]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    setRighe(copia)
  }

  const cambia = (i, campo, v) => setRighe(righe.map((r, k) => (k === i ? { ...r, [campo]: v } : r)))
  const cambiaTipo = (i, tipo) => {
    const d = distanzaDaTipo(tipo)
    setRighe(righe.map((r, k) => (k === i ? { ...r, tipo_lavoro: tipo, distanza: d ?? r.distanza } : r)))
  }
  const cambiaSerie = (id, campo, v) =>
    setRighe(righe.map((r) => (r.serie?.id === id ? { ...r, serie: { ...r.serie, [campo]: v } } : r)))
  const aggiungiLavoro = (tipo) => {
    const d = tipo ? distanzaDaTipo(tipo) : null
    setRighe([...righe, nuovaRiga({ ...(tipo ? { tipo_lavoro: tipo } : {}), ...(d ? { distanza: d } : {}) })])
  }
  const aggiungiSerie = () => {
    const serie = { id: crypto.randomUUID(), giri: 3, recupero: '', minuti: '' }
    setRighe([...righe, nuovaRiga({ ripetizioni: 1, distanza: 200, serie }), nuovaRiga({ ripetizioni: 1, distanza: 100, serie })])
  }
  const aggiungiInSerie = (id) => {
    const ultima = righe.findLastIndex((r) => r.serie?.id === id)
    const copia = [...righe]
    copia.splice(ultima + 1, 0, nuovaRiga({ ripetizioni: 1, distanza: righe[ultima].distanza, serie: righe[ultima].serie }))
    setRighe(copia)
  }
  // La serie torna righe normali, con le ripetizioni di tutti i giri (i metri non cambiano)
  const sciogli = (id) => setRighe(righe.map((r) => {
    if (r.serie?.id !== id) return r
    const { serie, ...resto } = r
    return { ...resto, ripetizioni: (Number(r.ripetizioni) || 1) * (Number(serie.giri) || 1) }
  }))
  const togli = (i) => setRighe(righe.filter((_, k) => k !== i))
  // Tutti i giorni, weekend compreso: le due settimane dopo la data scelta
  const prossimi = Array.from({ length: 14 }, (_, i) => addGiorni(giorno, i + 1))
  const toggleExtra = (d) => setExtra(extra.includes(d) ? extra.filter((x) => x !== d) : [...extra, d])

  // Righe come si salvano: nelle serie le ripetizioni diventano il totale di tutti i giri
  const righeSalvate = (lista) => lista.map((r) => {
    if (!r.serie) return r
    const giri = Math.max(1, Number(r.serie.giri) || 1)
    return { ...r, ripetizioni: (Number(r.ripetizioni) || 1) * giri, serie: { ...r.serie, giri } }
  })

  async function salva(pubblica) {
    setErrore('')
    setOk('')
    const storta = righe.findIndex((r) => !(Number(r.distanza) >= 25))
    if (storta >= 0) {
      setErrore(`Riga ${storta + 1}: scrivi la distanza (da 25 metri in su) nel campo "Distanza (m)".`)
      return
    }
    // La ripartenza si salva (e si mostra) sempre nel formato standard, anche se non sei uscito dal campo
    const ordinate = righe.map((r) => ({
      ...r,
      ripartenza: normalizzaRipartenza(r.ripartenza),
      ...(Array.isArray(r.ripartenze) && {
        ripartenze: Array.from({ length: Math.min(50, Math.max(1, Number(r.ripetizioni) || 1)) }, (_, k) => normalizzaRipartenza(r.ripartenze[k])),
      }),
      ...(r.serie && { serie: { ...r.serie, recupero: normalizzaRipartenza(r.serie.recupero) } }),
    }))
    const ripStorta = ordinate.findIndex((r) => !ripartenzaValida(r.ripartenza))
    if (ripStorta >= 0) {
      setErrore(`Riga ${ripStorta + 1}: scrivi la ripartenza come 1'30" (oppure 45" sotto il minuto), o lasciala vuota.`)
      return
    }
    for (let k = 0; k < ordinate.length; k++) {
      const j = (ordinate[k].ripartenze || []).findIndex((x) => !ripartenzaValida(x))
      if (j >= 0) {
        setErrore(`Riga ${k + 1}, ripetizione ${j + 1}: scrivi la ripartenza come 1'30" (oppure 45" sotto il minuto), o lasciala vuota.`)
        return
      }
    }
    const serieStorta = ordinate.findIndex((r) => r.serie && !ripartenzaValida(r.serie.recupero))
    if (serieStorta >= 0) {
      setErrore(`Riga ${serieStorta + 1}: scrivi il recupero tra i giri come 20" oppure 1'00", o lascialo vuoto.`)
      return
    }
    // Delle ripartenze personalizzate si tengono solo quelle scritte (i vuoti in fondo non servono)
    const soloScritte = (lista = []) => {
      const l = [...lista]
      while (l.length && !l[l.length - 1]) l.pop()
      return l.length ? l : null
    }
    const pulite = righeSalvate(ordinate).map((r) => ({
      tipo_lavoro: r.tipo_lavoro,
      distanza: Number(r.distanza),
      ripetizioni: Number(r.ripetizioni) || 1,
      stile: r.stile,
      note: r.note || '',
      minuti: !r.serie && Number(r.minuti) > 0 ? Number(r.minuti) : null,
      ripartenza: r.ripartenza || null,
      ripartenze: !r.serie && Number(r.ripetizioni) > 1 ? soloScritte(r.ripartenze) : null,
      ...(r.serie && {
        serie: {
          id: r.serie.id, giri: r.serie.giri, recupero: r.serie.recupero || null,
          minuti: Number(r.serie.minuti) > 0 ? Number(r.serie.minuti) : null,
        },
      }),
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
    setRighe(ordinate)
    setSalvato(fotografia(titolo, ordinate, vis))
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
        <PianoCard piano={{ titolo: titolo || 'Allenamento', righe: righeSalvate(righe) }} />
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

      <Reorder.Group as="div" axis="y" values={chiavi} onReorder={riordina}>
        <AnimatePresence initial={false}>
          {blocchi.map((b, k) => {
            const chiave = chiaveBlocco(b)
            const comuni = { chiave, primo: k === 0, ultimo: k === blocchi.length - 1, cambia, cambiaTipo, sposta, togli }
            return b.serie
              ? <SerieGiri key={chiave} {...comuni} serie={b.serie} righe={b.righe} cambiaSerie={cambiaSerie}
                  spostaInSerie={spostaInSerie} aggiungiInSerie={aggiungiInSerie} sciogli={sciogli} />
              : <RigaLavoro key={chiave} {...comuni} r={b.riga} i={b.indice} puoiTogliere={righe.length > 1} />
          })}
        </AnimatePresence>
      </Reorder.Group>
      <div className="bg-white border border-gray-100 rounded-3xl p-4 mb-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => aggiungiLavoro()}
            className="text-blue-600 font-bold bg-blue-50 rounded-2xl py-3">+ Aggiungi Lavoro</button>
          <button onClick={aggiungiSerie}
            className="text-blue-600 font-bold bg-blue-50 rounded-2xl py-3">+ Serie a giri 🔁</button>
        </div>
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
          Totale: {(metriPiano(righeSalvate(righe)) / 1000).toFixed(1).replace('.', ',')} km
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
