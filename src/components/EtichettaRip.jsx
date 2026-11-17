import { ripartenzeInBreve } from '../lib/tempo'

// Etichetta piccola "RIP 1'30"": a quanto si riparte. Se le ripartenze scalano: "RIP 1'30" → 1'15" (−5")".
// perGiro (serie a giri): se dentro ogni giro la ripartenza è la stessa, se ne mostra una per giro.
export default function EtichettaRip({ lista, perGiro = 1, className = '' }) {
  let l = (lista || []).filter(Boolean)
  if (perGiro > 1 && l.length > perGiro) {
    const giri = Array.from({ length: Math.ceil(l.length / perGiro) }, (_, g) => l.slice(g * perGiro, (g + 1) * perGiro))
    if (giri.every((g) => new Set(g).size === 1)) l = giri.map((g) => g[0])
  }
  const testo = ripartenzeInBreve(l)
  if (!testo) return null
  return (
    <span title={`Ripartenza: ${l.join(' · ')}`}
      className={`inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700 whitespace-nowrap ${className}`}>
      <span className="font-extrabold tracking-wide text-blue-500">RIP</span>{testo}
    </span>
  )
}
