import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { RUOLI_VISTA, nomeRuolo } from '../lib/permessi'
import AppShell from '../components/AppShell'

// Il ruolo (atleta, coach, genitore) si sceglie solo alla registrazione: qui non si cambia.
// Solo l'admin può "vedere come" un altro ruolo, per controllare cosa vedrebbe.
export default function Profilo() {
  const { profile, isAdmin, ruolo, adminReale, cambiaVista } = useAuth()
  const navigate = useNavigate()

  async function esci() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function vediCome(r) {
    cambiaVista(r)
    navigate('/dashboard')
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

      {adminReale && (
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-3">
          <p className="font-bold mb-1">👁 Vedi l'app come</p>
          <p className="text-xs text-gray-400 mb-3">
            Cambia solo cosa si vede sullo schermo e cosa si può fare. I dati restano i tuoi.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {RUOLI_VISTA.map(([chiave, nome]) => (
              <button key={chiave} onClick={() => vediCome(chiave)}
                className={`text-sm font-semibold rounded-xl py-3 transition active:scale-95 ${
                  ruolo === chiave ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                {nome}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Ora stai vedendo come: <b>{nomeRuolo(ruolo)}</b></p>
        </div>
      )}

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
