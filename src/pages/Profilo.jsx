import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'

// Il ruolo (atleta, coach, genitore) si sceglie solo alla registrazione: qui non si cambia
export default function Profilo() {
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function esci() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <AppShell titolo="Profilo" attiva="profilo">
      <div className="bg-white border border-gray-100 rounded-3xl p-6 text-center shadow-sm mb-3">
        <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-blue-600 text-white text-3xl font-bold flex items-center justify-center">
          {(profile?.nome || 'A').charAt(0).toUpperCase()}
        </div>
        <p className="text-xl font-bold">{profile?.nome} {profile?.cognome}</p>
        <p className="text-sm text-gray-400 capitalize">{profile?.role}</p>
      </div>

      {isAdmin && (
        <Link to="/admin" className="block text-center font-semibold text-blue-600 bg-blue-50 rounded-2xl py-3.5 mb-3">
          ⚙️ Pannello admin
        </Link>
      )}
      <button onClick={esci} className="w-full font-semibold text-gray-600 bg-white border border-gray-200 rounded-2xl py-3.5">
        Esci
      </button>
    </AppShell>
  )
}
