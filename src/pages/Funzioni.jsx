import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { funzioniConsentite, IN_ARRIVO, mostraInArrivo } from '../lib/permessi'
import AppShell from '../components/AppShell'

const FUNZIONI = [
  ['/allenamenti', '⏱', 'Allenamenti'],
  ['/storico', '📖', 'Storico'],
  ['/presenze', '✅', 'Presenze'],
  ['/gare', '🏆', 'Gare'],
  ['/video', '🎥', 'Video'],
  ['/progressi', '📈', 'Progressi'],
  ['/record', '🏅', 'Record'],
  ['/archivio', '📋', 'Archivio gare'],
  ['/squadra', '👥', 'Squadra'],
  ['/calendario', '🗓', 'Calendario'],
  ['/punti', '⭐', 'Punti'],
  ['/impostazioni', '⚙️', 'Impostazioni'],
]

export default function Funzioni() {
  const { ruolo } = useAuth()
  const consentite = funzioniConsentite(ruolo)
  const voci = FUNZIONI.filter(([percorso]) =>
    consentite.includes(percorso) && (mostraInArrivo || !IN_ARRIVO.includes(percorso)))

  return (
    <AppShell titolo="Funzioni" attiva="funzioni">
      <div className="grid grid-cols-3 gap-3">
        {voci.map(([percorso, icona, nome]) => (
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
