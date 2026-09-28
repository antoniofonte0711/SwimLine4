import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm text-gray-400">Bentornato</p>
            <h1 className="text-3xl font-extrabold text-black tracking-tight">
              {profile?.nome || 'Ciao'} 👋
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link to="/admin" className="text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-full transition shadow-md shadow-blue-200">
                ⚙️ Admin
              </Link>
            )}
            <button onClick={handleLogout} className="text-sm font-semibold text-gray-500 hover:text-white hover:bg-gray-800 px-4 py-2 rounded-full transition border border-gray-200">
              Esci
            </button>
          </div>
        </header>

        <div className="bg-white border border-blue-100 rounded-2xl p-6 mb-8 shadow-sm">
          <p className="text-gray-400 text-sm mb-1">Ultimo tempo migliorato</p>
          <p className="text-3xl font-extrabold text-blue-600">— nessun dato ancora —</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/allenamenti"
            className="group bg-blue-500 text-white rounded-2xl py-10 text-center hover:bg-blue-600 hover:-translate-y-1 active:translate-y-0 transition shadow-lg shadow-blue-200">
            <div className="text-4xl mb-2 group-hover:scale-110 transition">🏊</div>
            <div className="text-xl font-bold">Allenamento</div>
          </Link>
          <Link to="/gare"
            className="group bg-black text-white rounded-2xl py-10 text-center hover:bg-gray-800 hover:-translate-y-1 active:translate-y-0 transition shadow-lg shadow-gray-300">
            <div className="text-4xl mb-2 group-hover:scale-110 transition">🏆</div>
            <div className="text-xl font-bold">Gare</div>
          </Link>
        </div>
      </div>
    </div>
  )
}