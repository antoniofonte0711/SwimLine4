import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Indirizzo che non esiste (link vecchio o scritto male): invece di una pagina bianca
export default function NonTrovata() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-500 to-sky-300 flex flex-col items-center justify-center px-6 text-white text-center">
      <p className="text-6xl font-extrabold tracking-tight">404</p>
      <h1 className="text-2xl font-semibold mt-3">Pagina non trovata</h1>
      <p className="text-blue-50 mt-2 text-sm max-w-xs">Il link potrebbe essere vecchio o scritto male.</p>
      <Link to={user ? '/dashboard' : '/'}
        className="mt-8 w-full max-w-xs bg-white text-blue-700 font-bold rounded-2xl py-4 text-lg shadow-xl active:scale-[0.98] transition">
        Torna alla Home
      </Link>
    </div>
  )
}
