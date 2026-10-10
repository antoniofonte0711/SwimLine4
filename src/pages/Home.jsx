import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SfondoVasca from '../components/SfondoVasca'

// Schermata d'ingresso: solo nome, Registrati e Accedi, su una vasca vista dall'alto.
// Chi ha già una sessione attiva entra direttamente nell'app (Home con il calendario).
export default function Home() {
  const { user, loading } = useAuth()

  if (loading) return <div className="min-h-screen bg-[#0a3fbf]" />
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a3fbf] flex flex-col items-center justify-center px-6 text-white">
      <SfondoVasca />

      <div className="relative text-center mb-12">
        <h1 className="font-display text-[56px] sm:text-[72px] font-extrabold leading-none drop-shadow-[0_4px_24px_rgba(4,26,77,0.5)]">
          Swim<span className="font-semibold text-sky-200">Line4</span>
        </h1>
        <p className="text-white/90 mt-4 text-base font-semibold">I tuoi tempi, la tua squadra.</p>
      </div>

      <div className="relative w-full max-w-xs flex flex-col gap-3">
        <Link to="/registrati"
          className="text-center bg-white text-blue-600 font-display font-extrabold rounded-2xl py-4 text-lg shadow-[0_12px_32px_rgba(4,26,77,0.35)] active:scale-[0.98] transition">
          Registrati
        </Link>
        <Link to="/login"
          className="text-center bg-white/15 backdrop-blur-md border border-white/50 text-white font-display font-extrabold rounded-2xl py-4 text-lg active:scale-[0.98] transition">
          Accedi
        </Link>
      </div>
    </div>
  )
}
