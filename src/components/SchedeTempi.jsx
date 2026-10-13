import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// "I miei tempi" dell'atleta: quattro pagine (Progressi, Record, Previsioni, Storico) unite da schede in alto,
// raggiungibili dalla barra in basso. Per gli altri ruoli le pagine restano come prima (da Funzioni, con Indietro).
const SCHEDE = [['/progressi', 'Progressi'], ['/record', 'Record'], ['/previsioni', 'Previsioni'], ['/storico', 'Storico']]

// Proprietà della testata per queste pagine: titolo, voce attiva della barra e tasto Indietro
export function useShellTempi(titolo) {
  const { ruolo } = useAuth()
  return ruolo === 'atleta'
    ? { titolo: 'I miei tempi', attiva: 'tempi' }
    : { titolo, attiva: 'funzioni', indietro: '/funzioni' }
}

export default function SchedeTempi() {
  const { ruolo } = useAuth()
  const { pathname } = useLocation()
  if (ruolo !== 'atleta') return null
  return (
    <nav aria-label="I miei tempi" className="grid grid-cols-4 gap-1 bg-white rounded-2xl p-1.5 mb-3 shadow-card">
      {SCHEDE.map(([percorso, nome]) => (
        <Link key={percorso} to={percorso} replace aria-current={pathname === percorso ? 'page' : undefined}
          className={`cliccabile min-h-[44px] rounded-xl px-1 flex items-center justify-center text-[14px] font-bold ${
            pathname === percorso ? 'bg-blue-600 text-white' : 'text-slate-600'
          }`}>
          {nome}
        </Link>
      ))}
    </nav>
  )
}
