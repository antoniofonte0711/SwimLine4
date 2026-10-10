import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { percorsoConsentito, IN_ARRIVO, mostraInArrivo } from '../lib/permessi'
import { percorsoAttivo, useRegole } from '../lib/regole'

export default function ProtectedRoute({ children, requireAdmin = false, requireCoach = false }) {
  const { user, loading, isAdmin, isCoach, ruolo } = useAuth()
  const { pathname } = useLocation()
  const { puo, pronto } = useRegole()

  if (loading) return <div className="p-6 text-center text-gray-500">Caricamento...</div>

  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />
  if (requireCoach && !isCoach) return <Navigate to="/dashboard" replace />
  if (!percorsoConsentito(ruolo, pathname)) return <Navigate to="/funzioni" replace />
  // Sezioni spente dal Pannello di controllo (per la squadra o per tutta l'app)
  const puoQui = (k) => (IN_ARRIVO.includes(pathname) && mostraInArrivo) || puo(k)
  if (pronto && !percorsoAttivo(pathname, ruolo, puoQui)) return <Navigate to="/funzioni" replace />

  return children
}
