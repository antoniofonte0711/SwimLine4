import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import InputPassword from '../components/InputPassword'

const CAMPO = 'w-full border border-white/30 bg-white/90 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-white transition'

// Si arriva qui dal link "Password dimenticata" dell'email: il link apre una sessione temporanea
// con cui si può solo scegliere la nuova password.
export default function NuovaPassword() {
  const [pronto, setPronto] = useState(null) // null = controllo, true = link valido, false = link scaduto
  const [password, setPassword] = useState('')
  const [ripeti, setRipeti] = useState('')
  const [errore, setErrore] = useState('')
  const [salvo, setSalvo] = useState(false)
  const [fatto, setFatto] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let attivo = true
    // la sessione del link può arrivare subito o poco dopo (Supabase legge il link nell'indirizzo)
    const { data: listener } = supabase.auth.onAuthStateChange((evento, sessione) => {
      if (attivo && sessione && (evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN')) setPronto(true)
    })
    supabase.auth.getSession().then(({ data }) => { if (attivo && data.session) setPronto(true) })
    const scaduto = setTimeout(() => { if (attivo) setPronto((p) => p ?? false) }, 4000)
    return () => { attivo = false; clearTimeout(scaduto); listener.subscription.unsubscribe() }
  }, [])

  async function salva(e) {
    e.preventDefault()
    setErrore('')
    if (password.length < 8) return setErrore('La password deve avere almeno 8 caratteri.')
    if (password !== ripeti) return setErrore('Le due password non coincidono.')
    setSalvo(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSalvo(false)
    if (error) {
      return setErrore(/different|same/i.test(error.message)
        ? 'La nuova password deve essere diversa da quella vecchia.'
        : 'Non sono riuscito a cambiare la password: ' + error.message)
    }
    setFatto(true)
    setTimeout(() => navigate('/dashboard'), 2500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-50 to-white px-4">
      <div className="w-full max-w-sm bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-2xl shadow-blue-300 p-8 text-white">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">🔑</div>
        </div>
        <h1 className="text-2xl font-extrabold mb-1 text-center tracking-tight">Nuova password</h1>

        {fatto ? (
          <p className="text-center text-blue-50 mt-4">✅ Password cambiata. Ti porto alla Home…</p>
        ) : pronto === null ? (
          <p className="text-center text-blue-100 mt-4">Controllo il link…</p>
        ) : pronto === false ? (
          <>
            <p className="text-center text-blue-50 mt-4">Il link non è valido o è scaduto.</p>
            <p className="text-center text-sm text-blue-100 mt-2">Torna al login, scrivi la tua email e premi di nuovo "Password dimenticata".</p>
            <Link to="/login" className="block text-center w-full bg-white text-blue-600 font-bold rounded-xl py-3 mt-6">Vai al login</Link>
          </>
        ) : (
          <form onSubmit={salva}>
            <p className="text-sm text-blue-100 text-center mb-6">Scegli la nuova password per il tuo account.</p>
            <label className="block text-sm font-medium text-blue-50 mb-1">Nuova password</label>
            <InputPassword value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password" className={`${CAMPO} text-gray-900`} />
            <label className="block text-sm font-medium text-blue-50 mb-1">Ripeti la password</label>
            <InputPassword value={ripeti} onChange={(e) => setRipeti(e.target.value)}
              autoComplete="new-password" className={`${CAMPO} text-gray-900`} />
            {errore && <p className="text-sm text-white bg-red-500/80 rounded-lg px-3 py-2 mb-4">{errore}</p>}
            <button type="submit" disabled={salvo}
              className="w-full bg-white text-blue-600 font-bold rounded-xl py-3 disabled:opacity-60 active:scale-[0.98] transition shadow-lg">
              {salvo ? 'Salvo…' : 'Salva la nuova password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
