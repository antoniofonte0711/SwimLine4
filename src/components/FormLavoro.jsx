import { useState } from 'react'
import { useCarrello, filePerLavoro } from '../context/CarrelloContext'
import { STILI, distanzaDaTipo } from '../lib/lavori'
import { infoLavoro, lavoriDaScegliere } from '../lib/tipiLavoro'
import { useTipiLavoro } from '../lib/useTipiLavoro'
import InputTempo from './InputTempo'
import { VIDEO_ATTIVI } from '../lib/permessi'
import { leggiPreferenze } from '../lib/preferenze'
import { ERRORE_TEMPO, erroreTempoImpossibile, normalizzaTempo, tempoPlausibile, tempoValido } from '../lib/tempo'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'
const BASE = { tipo_lavoro: 'C1', distanza: 75, ripetizioni: 4, stile: 'Stile libero', passaggi: [], file: null }

// Tipo di lavoro e stile partono da quelli preferiti (Profilo → Allenamento)
function iniziale() {
  const p = leggiPreferenze()
  const tipo = infoLavoro(p.tipoLavoro || '') ? p.tipoLavoro : BASE.tipo_lavoro
  return {
    ...BASE,
    tipo_lavoro: tipo,
    distanza: distanzaDaTipo(tipo) ?? BASE.distanza,
    stile: STILI.includes(p.stile) ? p.stile : BASE.stile,
  }
}

// Scegli il lavoro, la distanza, quanti passaggi fai e scrivi il risultato di ognuno
export default function FormLavoro({ titolo }) {
  const { aggiungi } = useCarrello()
  const [f, setF] = useState(iniziale)
  const [fileKey, setFileKey] = useState(0)
  const [errore, setErrore] = useState('')
  useTipiLavoro()
  const tipi = lavoriDaScegliere({ tieni: f.tipo_lavoro })

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

    const media = normalizzaTempo(f.media || '')
    if (media && !tempoValido(media)) {
      setErrore(`Tempo medio: ${ERRORE_TEMPO}`)
      return
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
      media,
      conVideo: !!f.file,
    })
    setF({ ...BASE, tipo_lavoro: f.tipo_lavoro, distanza: f.distanza, ripetizioni: f.ripetizioni, stile: f.stile })
    setFileKey((k) => k + 1)
  }

  return (
    <form onSubmit={aggiungiAlCarrello} className="bg-white rounded-3xl p-5 mb-3 shadow-card">
      <p className="text-sm text-slate-500 mb-3">{titolo || "Scegli il tuo lavoro"}</p>

      <label className="block text-xs text-slate-500 mb-1">Tipo di lavoro</label>
      <select value={f.tipo_lavoro} onChange={(e) => cambiaTipo(e.target.value)} className={CAMPO + ' mb-3'}>
        {tipi.map((t) => <option key={t}>{t}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Distanza (m, da 25 in su)</label>
          <input type="number" min="25" step="25" inputMode="numeric" value={f.distanza}
            onChange={(e) => setF({ ...f, distanza: e.target.value })} className={CAMPO} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Passaggi</label>
          <input type="number" min="1" max="30" inputMode="numeric" value={f.ripetizioni}
            onChange={(e) => setF({ ...f, ripetizioni: e.target.value })} className={CAMPO} />
        </div>
      </div>

      <label className="block text-xs text-slate-500 mb-1">Stile</label>
      <select value={f.stile} onChange={(e) => setF({ ...f, stile: e.target.value })} className={CAMPO + ' mb-4'}>
        {STILI.map((s) => <option key={s}>{s}</option>)}
      </select>

      <p className="text-sm text-slate-500 mb-2">Risultato di ogni passaggio</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Array.from({ length: n }, (_, i) => (
          <div key={i}>
            <InputTempo etichetta={`Passaggio ${i + 1}`} value={f.passaggi[i] || ''} vuotoOk
              onChange={(v) => cambiaPassaggio(i, v)} />
          </div>
        ))}
      </div>

      {f.media === undefined ? (
        <button type="button" onClick={() => setF({ ...f, media: '' })}
          className="cliccabile min-h-[44px] mb-3 -mt-2 text-sm font-semibold text-blue-600 text-left">
          Non ricordo tutti i tempi: scrivo la media
        </button>
      ) : (
        <div className="mb-4 -mt-2 rounded-2xl border-2 border-blue-300 bg-blue-50 p-3">
          <p className="mb-1 text-sm font-bold text-blue-700">Tempo medio <span className="font-normal text-blue-600">(conta come un tempo normale)</span></p>
          <InputTempo ariaLabel="Tempo medio" value={f.media} vuotoOk
            onChange={(v) => setF({ ...f, media: v })} />
          <button type="button" onClick={() => setF({ ...f, media: undefined })}
            className="cliccabile min-h-[44px] text-xs font-bold text-red-600">Togli la media</button>
        </div>
      )}

      {VIDEO_ATTIVI && <>
      <label className="block text-xs text-slate-500 mb-1">Video (facoltativo, finisce anche nella sezione Video)</label>
      <input key={fileKey} type="file" accept="video/*" className="w-full text-sm disabled:opacity-50" disabled={!VIDEO_ATTIVI}
        onChange={(e) => setF({ ...f, file: e.target.files[0] || null })} />
      <div className="mb-4" />
      </>}

      {errore && <p className="text-sm text-white bg-red-600 rounded-lg px-3 py-2 mb-3">{errore}</p>}

      <button type="submit"
        className="w-full bg-blue-50 text-blue-600 font-bold rounded-2xl py-3.5 hover:bg-blue-100 active:scale-[0.98] transition">
        Aggiungi alla lista di oggi
      </button>
    </form>
  )
}
