import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireAdmin = false, requireCoach = false }) {
  const { user, loading, isAdmin, isCoach } = useAuth()

  if (loading) return <div className="p-6 text-center text-gray-500">Caricamento...</div>

  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />
  if (requireCoach && !isCoach) return <Navigate to="/" replace />

  return children
}
