import { coloreLavoro } from '../lib/lavori'
import { metriPiano, minutiPiano } from '../lib/pianoSquadra'

// Allenamento del coach in sola lettura (lo vedono gli atleti)
export default function PianoCard({ piano }) {
  if (!piano) return null
  return (
    <div className="bg-white border border-blue-100 rounded-3xl p-5 shadow-sm mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold">📋 {piano.titolo || 'Allenamento del coach'}</p>
        <span className="text-xs text-gray-400">
          {(metriPiano(piano.righe) / 1000).toFixed(1).replace('.', ',')} km
          {minutiPiano(piano.righe) > 0 && ` · ${minutiPiano(piano.righe)} min`}
        </span>
      </div>
      {(piano.righe || []).map((r, i) => (
        <div key={i} className={`py-2 ${i ? 'border-t border-gray-100' : ''}`}>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
          <span className="text-sm text-gray-600 ml-2">{r.ripetizioni}×{r.distanza} m {r.stile}</span>
          {r.ripartenza && <span className="text-xs text-gray-500 ml-2">↻ ripartenza {r.ripartenza}</span>}
          {Number(r.minuti) > 0 && <span className="text-xs text-gray-400 ml-2">⏱ {Number(r.minuti)} min</span>}
          {r.note && <p className="text-xs text-gray-400 mt-1">{r.note}</p>}
        </div>
      ))}
    </div>
  )
}

export function SenzaSquadra() {
  return (
    <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-3xl p-6 text-center shadow-sm">
      Non trovo una squadra collegata a questo account. Il coach crea la squadra in registrazione; se stai
      provando come admin, assegna un nome squadra al tuo profilo o crea una squadra con coach_id uguale al tuo utente.
    </p>
  )
}
