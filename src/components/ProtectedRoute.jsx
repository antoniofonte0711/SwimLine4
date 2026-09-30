import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { percorsoConsentito } from '../lib/permessi'

export default function ProtectedRoute({ children, requireAdmin = false, requireCoach = false }) {
  const { user, loading, isAdmin, isCoach, ruolo } = useAuth()
  const { pathname } = useLocation()

  if (loading) return <div className="p-6 text-center text-gray-500">Caricamento...</div>

  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />
  if (requireCoach && !isCoach) return <Navigate to="/dashboard" replace />
  if (!percorsoConsentito(ruolo, pathname)) return <Navigate to="/funzioni" replace />

  return children
}
