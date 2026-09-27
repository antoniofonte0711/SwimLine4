import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

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
    setTimeout(() => navigate('/login'), 2000)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-white px-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-2xl shadow-blue-300 p-8 text-center max-w-sm text-white">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-lg font-bold">Registrazione completata!</p>
          <p className="text-sm text-blue-100 mt-2">Controlla la tua email per confermare l'account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-white px-4 py-8">
      <form onSubmit={handleRegister} className="w-full max-w-sm bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-2xl shadow-blue-300 p-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl">
            🏊
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-1 text-center tracking-tight">SwimLine4</h1>
        <p className="text-sm text-blue-100 text-center mb-6">Crea il tuo account</p>

        <label className="block text-sm font-medium text-blue-50 mb-1">Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)}
          className="w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-white transition" required />

        <label className="block text-sm font-medium text-blue-50 mb-1">Cognome</label>
        <input value={cognome} onChange={(e) => setCognome(e.target.value)}
          className="w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-white transition" required />

        <label className="block text-sm font-medium text-blue-50 mb-1">Data di nascita</label>
        <input type="date" value={dataNascita} onChange={(e) => setDataNascita(e.target.value)}
          className="w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-white transition" required />

        <label className="block text-sm font-medium text-blue-50 mb-1">Sei...</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-white transition">
          <option value="atleta">Atleta</option>
          <option value="coach">Coach</option>
          <option value="genitore">Genitore</option>
        </select>

        {role === 'coach' ? (
          <>
            <label className="block text-sm font-medium text-blue-50 mb-1">Nome della tua squadra</label>
            <input value={nomeSquadra} onChange={(e) => setNomeSquadra(e.target.value)}
              placeholder="Es. Delfini Nuoto Club"
              className="w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-white transition" />
          </>
        ) : (
          <>
            <label className="block text-sm font-medium text-blue-50 mb-1">Squadra (facoltativo)</label>
            <select value={squadraScelta} onChange={(e) => setSquadraScelta(e.target.value)}
              className="w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-white transition">
              <option value="">Nessuna squadra per ora</option>
              {squadre.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </>
        )}

        <label className="block text-sm font-medium text-blue-50 mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-white transition" required />

        <label className="block text-sm font-medium text-blue-50 mb-1">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-white transition" required />

        {error && <p className="text-sm text-white bg-red-500/80 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <button type="submit"
          className="w-full bg-white text-blue-600 font-bold rounded-xl py-3 hover:bg-blue-50 active:scale-[0.98] transition shadow-lg">
          Crea account
        </button>

        <p className="text-sm text-blue-100 text-center mt-5">
          Hai già un account?{' '}
          <Link to="/login" className="text-white font-semibold hover:underline">Accedi</Link>
        </p>
      </form>
    </div>
  )
}