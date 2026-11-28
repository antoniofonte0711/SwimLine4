import { testoPiazzamento } from '../lib/piazzamento'

// Posto in batteria e in classifica, presi dai risultati ufficiali
export default function Piazzamento({ g }) {
  const righe = testoPiazzamento(g?.piazzamento)
  if (!righe.length) return null
  return (
    <p className="text-xs font-semibold text-blue-700 mt-2">
      {righe.map((r) => <span key={r} className="block">🏁 {r}</span>)}
    </p>
  )
}
