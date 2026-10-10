import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SfondoVasca from '../components/SfondoVasca'
import Icona from '../components/Icona'
import InputPassword from '../components/InputPassword'

export default function Registrati() {
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [dataNascita, setDataNascita] = useState('')
  const [role, setRole] = useState('atleta')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [nomeSquadra, setNomeSquadra] = useState('')
  const [squadre, setSquadre] = useState([])
  const [squadraScelta, setSquadraScelta] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('squadre').select('id, nome').then(({ data }) => {
      if (data) setSquadre(data)
    })
  }, [])

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    const metadata = { nome, cognome, data_nascita: dataNascita, role }
    if (role === 'coach' && nomeSquadra) {
      metadata.nome_squadra = nomeSquadra
    } else if (role !== 'coach' && squadraScelta) {
      metadata.squadra_id = squadraScelta
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })

    if (error) {
      setError('Errore nella registrazione: ' + error.message)
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/login'), 5000)
  }

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#0a3fbf] px-4 py-8">
      <SfondoVasca />
        <div className="relative bg-white rounded-[28px] shadow-[0_24px_60px_rgba(4,26,77,0.35)] p-7 text-center max-w-sm text-white">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-display text-xl font-extrabold text-abisso">Registrazione completata!</p>
          <p className="text-sm text-slate-600 mt-2">Controlla la tua email per confermare l'account.</p>
          {role === 'coach' && (
            <p className="text-sm text-slate-600 mt-2">Il profilo coach si attiva quando l'amministratore lo approva: fino ad allora entri come atleta.</p>
          )}
          {role !== 'coach' && squadraScelta && (
            <p className="text-sm text-slate-600 mt-2">Il coach della squadra riceve la tua richiesta: entri quando la approva.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#0a3fbf] px-4 py-8">
      <SfondoVasca />
      <form onSubmit={handleRegister} className="w-full max-w-sm relative bg-white rounded-[28px] shadow-[0_24px_60px_rgba(4,26,77,0.35)] p-7">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <Icona nome="onde" className="w-8 h-8" />
          </div>
        </div>
        <h1 className="font-display text-[28px] font-extrabold text-abisso mb-1 text-center">SwimLine4</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Crea il tuo account</p>

        <label className="block text-sm font-semibold text-slate-600 mb-1">Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4" required />

        <label className="block text-sm font-semibold text-slate-600 mb-1">Cognome</label>
        <input value={cognome} onChange={(e) => setCognome(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4" required />

        <label className="block text-sm font-semibold text-slate-600 mb-1">Data di nascita</label>
        <input type="date" value={dataNascita} onChange={(e) => setDataNascita(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4" required />

        <label className="block text-sm font-semibold text-slate-600 mb-1">Sei...</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4">
          <option value="atleta">Atleta</option>
          <option value="coach">Coach</option>
          <option value="genitore">Genitore</option>
        </select>

        {role === 'coach' ? (
          <>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Nome della tua squadra</label>
            <input value={nomeSquadra} onChange={(e) => setNomeSquadra(e.target.value)}
              placeholder="Es. Delfini Nuoto Club"
              className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-1" />
            <p className="text-xs text-slate-500 mb-4">L'account coach va approvato dall'amministratore: dopo l'approvazione nasce la tua squadra.</p>
          </>
        ) : (
          <>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Chiedi di entrare in una squadra (facoltativo)</label>
            <select value={squadraScelta} onChange={(e) => setSquadraScelta(e.target.value)}
              className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4">
              <option value="">Nessuna squadra per ora</option>
              {squadre.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
            {squadraScelta && <p className="text-xs text-slate-500 -mt-3 mb-4">Entri quando il coach approva la richiesta.</p>}
          </>
        )}

        <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4" required />

        <label className="block text-sm font-semibold text-slate-600 mb-1">Password</label>
        <InputPassword value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4" />

        {error && <p className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-4">{error}</p>}

        <button type="submit"
          className="w-full min-h-[52px] bg-blue-600 text-white font-display font-extrabold text-lg rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition">
          Crea account
        </button>

        <p className="text-sm text-slate-500 text-center mt-5">
          Hai già un account?{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">Accedi</Link>
        </p>
      </form>
    </div>
  )
}