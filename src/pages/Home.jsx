import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Schermata d'ingresso: solo nome, Registrati e Accedi.
// Chi ha già una sessione attiva entra direttamente nell'app (Home con il calendario).
export default function Home() {
  const { user, loading } = useAuth()

  if (loading) return <div className="min-h-screen bg-blue-600" />
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-blue-600 via-blue-500 to-sky-300 flex flex-col items-center justify-center px-6 text-white">
      {/* Quattro corsie: il "4" di SwimLine4 */}
      <svg aria-hidden="true" viewBox="0 0 400 800" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-25">
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M0 ${140 + i * 150} Q 100 ${100 + i * 150} 200 ${140 + i * 150} T 400 ${140 + i * 150}`}
            fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 14" />
        ))}
      </svg>

      <div className="relative text-center mb-14">
        <h1 className="text-5xl font-extrabold tracking-tight">
          Swim<span className="font-light">Line4</span>
        </h1>
        <p className="text-blue-100 mt-3 text-sm">I tuoi tempi, la tua squadra.</p>
      </div>

      <div className="relative w-full max-w-xs flex flex-col gap-3">
        <Link to="/registrati"
          className="text-center bg-white text-blue-600 font-bold rounded-2xl py-4 text-lg shadow-xl active:scale-[0.98] transition">
          Registrati
        </Link>
        <Link to="/login"
          className="text-center bg-blue-700/60 border border-white/40 text-white font-bold rounded-2xl py-4 text-lg active:scale-[0.98] transition">
          Accedi
        </Link>
      </div>
    </div>
  )
}
