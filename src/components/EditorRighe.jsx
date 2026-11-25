import { useState } from 'react'
import { Reorder, AnimatePresence } from 'framer-motion'
import { FoglioLavoro, RigaLavoro, nuovaRiga } from './EditorAllenamento'
import { distanzaDaTipo } from '../lib/lavori'
import { useTipiLavoro } from '../lib/useTipiLavoro'
import { metriPiano } from '../lib/pianoSquadra'

// Righe con l'_id che serve all'editor (si toglie al salvataggio con senzaId)
export const conIdRighe = (righe = []) => righe.map((r) => ({ ...r, _id: r._id || crypto.randomUUID() }))
export const senzaIdRighe = (righe = []) => righe.map(({ _id, ...r }) => r)

// Lista di lavori scritta come fa il coach (stesso pannello: ripetizioni, distanza, tipo, stile, ripartenza, note),
// senza serie a giri. Serve all'atleta per i riscaldamenti gara. righe: righe con _id (vedi conIdRighe); setRighe: il setState del genitore (aggiornamenti a funzione).
export default function EditorRighe({ righe, setRighe, primaRiga = { tipo_lavoro: 'Riscaldamento', ripetizioni: 1, distanza: 200 } }) {
  useTipiLavoro()
  const [aperto, setAperto] = useState(null)
  const chiavi = righe.map((r) => r._id)
  const cambia = (i, campo, v) => setRighe((rr) => rr.map((r, k) => (k === i ? { ...r, [campo]: v } : r)))
  const cambiaTipo = (i, tipo) => {
    const d = distanzaDaTipo(tipo)
    setRighe((rr) => rr.map((r, k) => (k === i ? { ...r, tipo_lavoro: tipo, distanza: d ?? r.distanza } : r)))
  }
  const sposta = (i, verso) => {
    const j = i + verso
    if (j < 0 || j >= righe.length) return
    const copia = [...righe]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    setRighe(copia)
  }
  const togli = (i) => setRighe((rr) => rr.filter((_, k) => k !== i))
  const aggiungi = () => {
    const ultima = righe[righe.length - 1]
    // il nuovo lavoro parte dal tipo e dallo stile dell'ultimo, così si scrive in fretta
    const r = nuovaRiga(ultima ? { tipo_lavoro: ultima.tipo_lavoro, stile: ultima.stile, distanza: 50, ripetizioni: 2 } : primaRiga)
    setRighe((rr) => [...rr, r])
    setAperto(r._id)
  }

  const i = righe.findIndex((r) => r._id === aperto)
  const metri = metriPiano(righe)
  return (
    <>
      {righe.length === 0 && (
        <p className="text-sm text-slate-500 bg-white rounded-3xl p-5 mb-2 text-center shadow-card">
          Ancora nessun lavoro. Tocca "Aggiungi lavoro" e scegli ripetizioni, distanza, tipo e stile.
        </p>
      )}
      <Reorder.Group as="div" axis="y" values={chiavi} onReorder={(nuove) => setRighe(nuove.map((k) => righe.find((r) => r._id === k)))}>
        <AnimatePresence initial={false}>
          {righe.map((r, k) => (
            <RigaLavoro key={r._id} chiave={r._id} r={r} onApri={() => setAperto(r._id)} onTogli={() => togli(k)} />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <button type="button" onClick={aggiungi}
        className="cliccabile w-full min-h-[56px] mb-2 font-display text-lg font-extrabold text-blue-600 bg-schiuma border-2 border-dashed border-blue-200 rounded-3xl">
        + Aggiungi lavoro
      </button>
      {metri > 0 && (
        <p className="font-display text-2xl font-extrabold text-abisso px-1 mb-2">
          {metri} <span className="text-base">m</span>
        </p>
      )}
      <AnimatePresence>
        {i >= 0 && (
          <FoglioLavoro key={aperto} r={righe[i]} i={i} n={i + 1} inSerie={false} semplice squadraId={null}
            cambia={cambia} cambiaTipo={cambiaTipo}
            onSu={() => sposta(i, -1)} onGiu={() => sposta(i, 1)} primo={i === 0} ultimo={i === righe.length - 1}
            onTogli={() => { togli(i); setAperto(null) }} onChiudi={() => setAperto(null)} />
        )}
      </AnimatePresence>
    </>
  )
}
