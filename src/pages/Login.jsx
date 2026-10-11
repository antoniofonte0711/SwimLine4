import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SfondoVasca from '../components/SfondoVasca'
import Icona from '../components/Icona'
import InputPassword from '../components/InputPassword'
import { erroreAuth } from '../lib/erroriAuth'
import { registraErrore } from '../lib/registroErrori'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // arrivo da un link email scaduto o già usato (vedi AuthContext)
  const [error, setError] = useState(() => (new URLSearchParams(window.location.search).get('link') === 'scaduto'
    ? 'Il link dell\'email è scaduto o è già stato usato. Ogni nuova richiesta annulla i link precedenti: scrivi la tua email e premi "Password dimenticata" per riceverne uno nuovo, poi apri l\'email più recente.'
    : ''))
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setOk('')
    setInvio(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setInvio(false)
    if (error) setError(erroreAuth(error))
    else navigate('/dashboard')
  }

  async function handleResetPassword() {
    setOk('')
    if (!email) {
      setError('Inserisci la tua email qui sopra, poi premi di nuovo su "Password dimenticata".')
      return
    }
    setError('')
    // il link dell'email porta alla pagina dove si sceglie la nuova password
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nuova-password` })
    if (error) {
      if (/sending|not authorized|smtp/i.test(error.message || '')) registraErrore(error, 'Password dimenticata: email non inviata')
      setError(erroreAuth(error))
    } else setOk('Ti abbiamo inviato un\'email per scegliere una nuova password (se non la trovi, guarda nello spam).')
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
          autoComplete="username"
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
          className="min-h-[44px] text-sm font-semibold text-blue-600 underline mb-2 block transition"
        >
          Password dimenticata?
        </button>

        {error && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-4">{error}</p>}
        {ok && <p role="status" className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-4">{ok}</p>}

        <button
          type="submit"
          disabled={invio}
          className="w-full min-h-[52px] bg-blue-600 text-white font-display font-extrabold text-lg rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60"
        >
          {invio ? 'Entro…' : 'Accedi'}
        </button>

        <p className="text-sm text-slate-500 text-center mt-5">
          Non hai un account?{' '}
          <Link to="/registrati" className="text-blue-600 font-bold hover:underline">Registrati</Link>
        </p>
        <p className="text-sm text-slate-500 text-center mt-2">
          Prima volta? <Link to="/guida" className="text-blue-600 font-bold hover:underline">Leggi la guida</Link>
        </p>
      </form>
    </div>
  )
}