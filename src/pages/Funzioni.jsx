import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'

const FUNZIONI = [
  ['/allenamenti', '⏱', 'Allenamenti'],
  ['/gare', '🏆', 'Gare'],
  ['/video', '🎥', 'Video'],
  ['/progressi', '📈', 'Progressi'],
  ['/record', '🏅', 'Record'],
  ['/archivio', '📋', 'Archivio gare'],
  ['/squadra', '👥', 'Squadra'],
  ['/calendario', '🗓', 'Calendario'],
  ['/impostazioni', '⚙️', 'Impostazioni'],
]

export default function Funzioni() {
  return (
    <AppShell titolo="Funzioni" attiva="funzioni">
      <div className="grid grid-cols-3 gap-3">
        {FUNZIONI.map(([percorso, icona, nome]) => (
          <Link key={percorso} to={percorso}
            className="bg-white border border-gray-100 rounded-2xl min-h-[96px] px-1 py-4 text-center text-[13px] font-medium shadow-sm hover:shadow-md active:scale-95 transition">
            <span className="block text-2xl mb-1.5">{icona}</span>
            {nome}
          </Link>
        ))}
      </div>
    </AppShell>
  )
}
