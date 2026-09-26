import { useState } from 'react'
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
  const navigate = useNavigate()

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError('Errore nella registrazione: ' + error.message)
      return
    }

    const userId = data.user?.id
    if (userId) {
      await supabase.from('profiles').insert({
        id: userId,
        nome,
        cognome,
        data_nascita: dataNascita,
        role,
      })
    }

    setSuccess(true)
    setTimeout(() => navigate('/login'), 2000)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <p className="text-lg text-black text-center">
          Registrazione completata! Controlla la tua email per confermare l'account.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-8">
      <form onSubmit={handleRegister} className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-black mb-1 text-center">SwimLine4</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Registrati</p>

        <label className="block text-sm text-gray-700 mb-1">Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" required />

        <label className="block text-sm text-gray-700 mb-1">Cognome</label>
        <input value={cognome} onChange={(e) => setCognome(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" required />

        <label className="block text-sm text-gray-700 mb-1">Data di nascita</label>
        <input type="date" value={dataNascita} onChange={(e) => setDataNascita(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" required />

        <label className="block text-sm text-gray-700 mb-1">Sei...</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4">
          <option value="atleta">Atleta</option>
          <option value="coach">Coach</option>
          <option value="genitore">Genitore</option>
        </select>

        <label className="block text-sm text-gray-700 mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" required />

        <label className="block text-sm text-gray-700 mb-1">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4" required />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button type="submit"
          className="w-full bg-blue-500 text-white font-semibold rounded-lg py-2 hover:bg-blue-600 transition">
          Crea account
        </button>

        <p className="text-sm text-gray-600 text-center mt-4">
          Hai già un account?{' '}
          <Link to="/login" className="text-blue-500 hover:underline">Accedi</Link>
        </p>
      </form>
    </div>
  )
}
