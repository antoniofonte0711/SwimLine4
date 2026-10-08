import { useState } from 'react'
import { difficoltaPiano, formattaVoto } from '../lib/difficolta'

// Difficoltà calcolata dal piano: voto, livello e una barra che mostra in quali zone va la fatica
export default function Difficolta({ righe }) {
  const [aperto, setAperto] = useState(false)
  const d = difficoltaPiano(righe)
  if (!d) return null
  return (
    <div className="bg-gray-50 rounded-2xl p-3 mb-2">
      <button onClick={() => setAperto(!aperto)} aria-expanded={aperto} className="w-full text-left">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-500">Difficoltà stimata</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${d.livello.colore}`}>
            {d.livello.nome} · {formattaVoto(d.voto)}/10
          </span>
        </div>
        {/* Dieci tacche: si riempiono fino al voto */}
        <div className="grid grid-cols-10 gap-1 mb-2" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => {
            const pieno = Math.min(1, Math.max(0, d.voto - i))
            return (
              <div key={i} className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-gray-800 rounded-full" style={{ width: `${pieno * 100}%` }} />
              </div>
            )
          })}
        </div>
        <div className="flex h-2 rounded-full overflow-hidden" aria-hidden="true">
          {d.gruppi.map((g) => <div key={g.id} className={g.colore} style={{ width: `${g.quota * 100}%` }} />)}
        </div>
      </button>
      {aperto && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">Dove va la fatica:</p>
          {d.gruppi.map((g) => (
            <div key={g.id} className="flex items-center justify-between text-xs py-0.5">
              <span className="flex items-center gap-2 text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-full ${g.colore}`} />{g.nome}
              </span>
              <span className="font-semibold text-gray-700">{Math.round(g.quota * 100)}%</span>
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-2">
            Calcolata dai metri di ogni lavoro e dalla sua zona (A2 il più leggero, C2 il più pesante).
          </p>
        </div>
      )}
    </div>
  )
}
