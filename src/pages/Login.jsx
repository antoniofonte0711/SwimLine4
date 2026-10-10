import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SfondoVasca from '../components/SfondoVasca'
import Icona from '../components/Icona'
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#0a3fbf] px-4 py-8">
      <SfondoVasca />
      <form onSubmit={handleLogin} className="w-full max-w-sm relative bg-white rounded-[28px] shadow-[0_24px_60px_rgba(4,26,77,0.35)] p-7">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <Icona nome="onde" className="w-8 h-8" />
          </div>
        </div>
        <h1 className="font-display text-[28px] font-extrabold text-abisso mb-1 text-center">SwimLine4</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Bentornato, accedi al tuo account</p>

        <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4"
          required
        />

        <label className="block text-sm font-semibold text-slate-600 mb-1">Password</label>
        <InputPassword
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-2"
        />

        <button
          type="button"
          onClick={handleResetPassword}
          className="text-sm font-semibold text-blue-600 underline mb-4 block transition"
        >
          Password dimenticata?
        </button>

        {error && <p className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-4">{error}</p>}

        <button
          type="submit"
          className="w-full min-h-[52px] bg-blue-600 text-white font-display font-extrabold text-lg rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition"
        >
          Accedi
        </button>

        <p className="text-sm text-slate-500 text-center mt-5">
          Non hai un account?{' '}
          <Link to="/registrati" className="text-blue-600 font-bold hover:underline">Registrati</Link>
        </p>
      </form>
    </div>
  )
}