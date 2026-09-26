import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o password non corretti.')
    else navigate('/')
  }

  async function handleResetPassword() {
    if (!email) {
      setError('Inserisci la tua email qui sopra, poi premi di nuovo su "Password dimenticata".')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) setError('Errore nell\'invio dell\'email di recupero.')
    else setError('Ti abbiamo inviato una email per reimpostare la password.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-black mb-6 text-center">SwimLine4</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Accedi</p>

        <label className="block text-sm text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <label className="block text-sm text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <button
          type="button"
          onClick={handleResetPassword}
          className="text-sm text-blue-500 hover:underline mb-4 block"
        >
          Password dimenticata?
        </button>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white font-semibold rounded-lg py-2 hover:bg-blue-600 transition"
        >
          Accedi
        </button>

        <p className="text-sm text-gray-600 text-center mt-4">
          Non hai un account?{' '}
          <Link to="/registrati" className="text-blue-500 hover:underline">Registrati</Link>
        </p>
      </form>
    </div>
  )
}
