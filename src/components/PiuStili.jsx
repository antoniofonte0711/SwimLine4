import { haVarianti } from '../lib/varianti'

// Sigla accanto al tipo di lavoro quando le ripetizioni hanno stili o note diversi
export default function PiuStili({ r }) {
  if (!haVarianti(r)) return null
  return (
    <span title="Le ripetizioni hanno stili o note diversi"
      className="shrink-0 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">+ stili</span>
  )
}
