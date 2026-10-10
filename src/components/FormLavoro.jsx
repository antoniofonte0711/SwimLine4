import { useState } from 'react'
import { useCarrello, filePerLavoro } from '../context/CarrelloContext'
import { TIPI_LAVORO, STILI, distanzaDaTipo } from '../lib/lavori'
import InputTempo from './InputTempo'
import { leggiPreferenze } from '../lib/preferenze'
import { ERRORE_TEMPO, erroreTempoImpossibile, normalizzaTempo, tempoPlausibile, tempoValido } from '../lib/tempo'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const BASE = { tipo_lavoro: 'C1', distanza: 75, ripetizioni: 4, stile: 'Stile libero', passaggi: [], file: null }

// Tipo di lavoro e stile partono da quelli preferiti (Profilo → Allenamento)
function iniziale() {
  const p = leggiPreferenze()
  const tipo = TIPI_LAVORO.includes(p.tipoLavoro) ? p.tipoLavoro : BASE.tipo_lavoro
  return {
    ...BASE,
    tipo_lavoro: tipo,
    distanza: distanzaDaTipo(tipo) ?? BASE.distanza,
    stile: STILI.includes(p.stile) ? p.stile : BASE.stile,
  }
}

// Scegli il lavoro, la distanza, quanti passaggi fai e scrivi il risultato di ognuno
export default function FormLavoro() {
  const { aggiungi } = useCarrello()
  const [f, setF] = useState(iniziale)
  const [fileKey, setFileKey] = useState(0)
  const [errore, setErrore] = useState('')

  const n = Math.min(30, Math.max(1, Number(f.ripetizioni) || 1))

  function cambiaTipo(tipo) {
    const d = distanzaDaTipo(tipo)
    setF({ ...f, tipo_lavoro: tipo, distanza: d ?? f.distanza })
  }

  function cambiaPassaggio(i, valore) {
    const p = [...f.passaggi]
    p[i] = valore
    setF({ ...f, passaggi: p })
  }

  function aggiungiAlCarrello(e) {
    e.preventDefault()
    setErrore('')

    if (Number(f.distanza) < 25) {
      setErrore('La distanza parte da 25 metri.')
      return
    }

    const passaggi = []
    for (let i = 0; i < n; i++) {
      const t = normalizzaTempo(f.passaggi[i])
      if (!t) continue
      if (!tempoValido(t)) {
        setErrore(`Passaggio ${i + 1}: ${ERRORE_TEMPO}`)
        return
      }
      if (!tempoPlausibile(t, f.distanza)) {
        setErrore(`Passaggio ${i + 1}: ${erroreTempoImpossibile(f.distanza)}`)
        return
      }
      passaggi.push(t)
    }

    const id = crypto.randomUUID()
    if (f.file) filePerLavoro.set(id, f.file)
    aggiungi({
      id,
      tipo_lavoro: f.tipo_lavoro,
      distanza: Number(f.distanza),
      ripetizioni: n,
      stile: f.stile,
      passaggi,
      conVideo: !!f.file,
    })
    setF({ ...BASE, tipo_lavoro: f.tipo_lavoro, distanza: f.distanza, ripetizioni: f.ripetizioni, stile: f.stile })
    setFileKey((k) => k + 1)
  }

  return (
    <form onSubmit={aggiungiAlCarrello} className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
      <p className="text-sm text-gray-500 mb-3">Scegli il tuo lavoro</p>

      <label className="block text-xs text-gray-500 mb-1">Tipo di lavoro</label>
      <select value={f.tipo_lavoro} onChange={(e) => cambiaTipo(e.target.value)} className={CAMPO + ' mb-3'}>
        {TIPI_LAVORO.map((t) => <option key={t}>{t}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Distanza (m, da 25 in su)</label>
          <input type="number" min="25" step="25" inputMode="numeric" value={f.distanza}
            onChange={(e) => setF({ ...f, distanza: e.target.value })} className={CAMPO} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Passaggi</label>
          <input type="number" min="1" max="30" inputMode="numeric" value={f.ripetizioni}
            onChange={(e) => setF({ ...f, ripetizioni: e.target.value })} className={CAMPO} />
        </div>
      </div>

      <label className="block text-xs text-gray-500 mb-1">Stile</label>
      <select value={f.stile} onChange={(e) => setF({ ...f, stile: e.target.value })} className={CAMPO + ' mb-4'}>
        {STILI.map((s) => <option key={s}>{s}</option>)}
      </select>

      <p className="text-sm text-gray-500 mb-2">Risultato di ogni passaggio</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Array.from({ length: n }, (_, i) => (
          <div key={i}>
            <InputTempo etichetta={`Passaggio ${i + 1}`} value={f.passaggi[i] || ''} vuotoOk
              onChange={(v) => cambiaPassaggio(i, v)} />
          </div>
        ))}
      </div>

      <label className="block text-xs text-gray-500 mb-1">Video (facoltativo, finisce anche nella sezione Video)</label>
      <input key={fileKey} type="file" accept="video/*" className="w-full text-sm mb-4"
        onChange={(e) => setF({ ...f, file: e.target.files[0] || null })} />

      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}

      <button type="submit"
        className="w-full bg-blue-50 text-blue-600 font-bold rounded-2xl py-3.5 hover:bg-blue-100 active:scale-[0.98] transition">
        Aggiungi al carrello
      </button>
    </form>
  )
}
