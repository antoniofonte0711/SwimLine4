import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SfondoVasca from '../components/SfondoVasca'
import InputPassword from '../components/InputPassword'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4'

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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#0a3fbf] px-4 py-8">
      <SfondoVasca />
      <div className="w-full max-w-sm relative bg-white rounded-[28px] shadow-[0_24px_60px_rgba(4,26,77,0.35)] p-7 text-abisso">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl">🔑</div>
        </div>
        <h1 className="font-display text-[28px] font-extrabold mb-1 text-center">Nuova password</h1>

        {fatto ? (
          <p className="text-center text-emerald-700 font-semibold mt-4">✅ Password cambiata. Ti porto alla Home…</p>
        ) : pronto === null ? (
          <p className="text-center text-slate-500 mt-4">Controllo il link…</p>
        ) : pronto === false ? (
          <>
            <p className="text-center font-semibold mt-4">Il link non è valido o è scaduto.</p>
            <p className="text-center text-sm text-slate-600 mt-2">Torna al login, scrivi la tua email e premi di nuovo "Password dimenticata".</p>
            <Link to="/login" className="block text-center w-full bg-blue-600 text-white font-bold rounded-2xl py-3 mt-6">Vai al login</Link>
          </>
        ) : (
          <form onSubmit={salva}>
            <p className="text-sm text-slate-500 text-center mb-6">Scegli la nuova password per il tuo account.</p>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Nuova password</label>
            <InputPassword value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password" className={`${CAMPO} text-gray-900`} />
            <label className="block text-sm font-semibold text-slate-600 mb-1">Ripeti la password</label>
            <InputPassword value={ripeti} onChange={(e) => setRipeti(e.target.value)}
              autoComplete="new-password" className={`${CAMPO} text-gray-900`} />
            {errore && <p className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-4">{errore}</p>}
            <button type="submit" disabled={salvo}
              className="w-full min-h-[52px] bg-blue-600 text-white font-display font-extrabold text-lg rounded-2xl disabled:opacity-60 active:scale-[0.98] transition">
              {salvo ? 'Salvo…' : 'Salva la nuova password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
