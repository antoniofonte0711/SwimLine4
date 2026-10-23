import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SfondoVasca from '../components/SfondoVasca'

// Indirizzo che non esiste (link vecchio o scritto male): stessa vasca della pagina d'ingresso, invece di una pagina bianca
export default function NonTrovata() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a3fbf] flex flex-col items-center justify-center px-6 text-white text-center">
      <SfondoVasca />

      <div className="relative">
        <p className="font-display text-xl font-extrabold">
          Swim<span className="font-semibold text-sky-200">Line4</span>
        </p>
        <p className="font-display text-[96px] sm:text-[120px] font-extrabold leading-none mt-2 drop-shadow-[0_4px_24px_rgba(4,26,77,0.5)]">404</p>
        <h1 className="font-display text-2xl font-extrabold mt-2">Hai sbagliato corsia!</h1>
        <p className="text-white/90 mt-2 text-[15px] max-w-xs mx-auto">
          Qui non c'è nessuno a nuotare: la pagina non esiste o il link è vecchio.
        </p>
      </div>

      <Link to={user ? '/dashboard' : '/'}
        className="relative mt-8 w-full max-w-xs bg-white text-blue-600 font-display font-extrabold rounded-2xl py-4 text-lg shadow-[0_12px_32px_rgba(4,26,77,0.35)] active:scale-[0.98] transition">
        Torna alla Home
      </Link>
    </div>
  )
}
