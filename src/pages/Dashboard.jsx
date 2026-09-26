import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()

  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-3xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-black">
          Ciao{profile?.nome ? `, ${profile.nome}` : ''}!
        </h1>
        {isAdmin && (
          <Link to="/admin" className="text-sm text-blue-500 hover:underline">
            Pannello amministratore
          </Link>
        )}
      </header>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
        <p className="text-gray-600 text-sm mb-1">Ultimo tempo migliorato</p>
        <p className="text-3xl font-bold text-blue-600">— nessun dato ancora —</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/allenamenti"
          className="bg-blue-500 text-white text-xl font-semibold rounded-2xl py-10 text-center hover:bg-blue-600 transition shadow-md">
          🏊 Allenamento
        </Link>
        <Link to="/gare"
          className="bg-black text-white text-xl font-semibold rounded-2xl py-10 text-center hover:bg-gray-800 transition shadow-md">
          🏆 Gare
        </Link>
      </div>
    </div>
  )
}
