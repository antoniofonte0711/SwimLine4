import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import InputPassword from '../components/InputPassword'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // arrivo da un link email scaduto o già usato (vedi AuthContext)
  const [error, setError] = useState(() => (new URLSearchParams(window.location.search).get('link') === 'scaduto'
    ? 'Il link dell\'email è scaduto o è già stato usato. Ogni nuova richiesta annulla i link precedenti: scrivi la tua email e premi "Password dimenticata" per riceverne uno nuovo, poi apri l\'email più recente.'
    : ''))
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o password non corretti.')
    else navigate('/dashboard')
  }

  async function handleResetPassword() {
    if (!email) {
      setError('Inserisci la tua email qui sopra, poi premi di nuovo su "Password dimenticata".')
      return
    }
    // il link dell'email porta alla pagina dove si sceglie la nuova password
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nuova-password` })
    if (error) setError('Errore nell\'invio dell\'email di recupero.')
    else setError('Ti abbiamo inviato una email per reimpostare la password.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-white px-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-2xl shadow-blue-300 p-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl">
            🏊
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-1 text-center tracking-tight">SwimLine4</h1>
        <p className="text-sm text-blue-100 text-center mb-6">Bentornato, accedi al tuo account</p>

        <label className="block text-sm font-medium text-blue-50 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-white transition"
          required
        />

        <label className="block text-sm font-medium text-blue-50 mb-1">Password</label>
        <InputPassword
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-2 focus:outline-none focus:ring-2 focus:ring-white transition"
        />

        <button
          type="button"
          onClick={handleResetPassword}
          className="text-sm text-blue-100 hover:text-white underline mb-4 block transition"
        >
          Password dimenticata?
        </button>

        {error && <p className="text-sm text-white bg-red-500/80 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <button
          type="submit"
          className="w-full bg-white text-blue-600 font-bold rounded-xl py-3 hover:bg-blue-50 active:scale-[0.98] transition shadow-lg"
        >
          Accedi
        </button>

        <p className="text-sm text-blue-100 text-center mt-5">
          Non hai un account?{' '}
          <Link to="/registrati" className="text-white font-semibold hover:underline">Registrati</Link>
        </p>
      </form>
    </div>
  )
}