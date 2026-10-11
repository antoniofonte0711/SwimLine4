import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { erroreAuth } from '../lib/erroriAuth'
import { casellaDi, pulisciCodice } from '../lib/posta'
import Icona from './Icona'

const ATTESA = 60 // secondi prima di poter rimandare l'email (lo stesso limite di Supabase)
const CAMPO = 'w-full min-h-[52px] border border-slate-200 bg-bordo rounded-2xl px-3.5 text-center font-display text-2xl font-extrabold tracking-[0.3em] text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'

// Dopo la registrazione o "Password dimenticata": schermata grande che dice di aprire l'email.
// Si può toccare il link dell'email oppure scrivere qui il codice che c'è dentro (si resta nell'app).
// tipo: 'signup' (conferma dell'account) | 'recovery' (nuova password). onFatto(sessione) quando è confermato.
export default function ControllaEmail({ email, tipo, onFatto, onIndietro }) {
  const [codice, setCodice] = useState('')
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState(false)
  const [mancano, setMancano] = useState(ATTESA)
  const casella = casellaDi(email)

  useEffect(() => {
    if (mancano <= 0) return
    const t = setTimeout(() => setMancano((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [mancano])

  // link dell'email aperto in un'altra scheda dello stesso browser: si entra anche qui, da soli
  // (onFatto in un ref: ci si iscrive una volta sola, non a ogni secondo del conto alla rovescia)
  const fatto = useRef(onFatto)
  fatto.current = onFatto
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_evento, sessione) => { if (sessione) fatto.current(sessione) })
    return () => data.subscription.unsubscribe()
  }, [])

  async function conferma(e) {
    e.preventDefault()
    setErrore('')
    setOk('')
    if (codice.length < 6) return setErrore('Il codice ha almeno 6 cifre: lo trovi nell\'email.')
    setInvio(true)
    const { data, error } = await supabase.auth.verifyOtp({ email, token: codice, type: tipo })
    setInvio(false)
    if (error) return setErrore(erroreAuth(error))
    if (data?.session) onFatto(data.session)
  }

  async function rimanda() {
    setErrore('')
    setOk('')
    setInvio(true)
    const { error } = tipo === 'signup'
      ? await supabase.auth.resend({ type: 'signup', email })
      : await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nuova-password` })
    setInvio(false)
    if (error) return setErrore(erroreAuth(error))
    setCodice('')
    setMancano(ATTESA)
    setOk('Email rimandata: usa quella più recente (il codice di prima non vale più).')
  }

  return (
    <div className="text-center" role="status">
      <span className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
        <Icona nome="busta" className="w-8 h-8" />
      </span>
      <h1 className="font-display text-[26px] font-extrabold text-abisso leading-tight">Controlla la tua email</h1>
      <p className="text-[15px] text-slate-600 mt-2">
        Ti abbiamo appena mandato un'email a
        <b className="block text-abisso [overflow-wrap:anywhere]">{email}</b>
      </p>
      <p className="text-sm text-slate-600 mt-2">
        {tipo === 'signup' ? 'Per attivare l\'account' : 'Per scegliere la nuova password'} tocca il link dentro l'email,
        oppure scrivi qui sotto il codice che trovi nel messaggio. Non la vedi? Guarda in Spam o Promozioni.
      </p>

      {casella && (
        <a href={casella.url} target="_blank" rel="noreferrer"
          className="cliccabile mt-4 w-full min-h-[48px] rounded-2xl bg-schiuma text-blue-600 font-bold flex items-center justify-center gap-2">
          <Icona nome="busta" className="w-5 h-5" /> Apri {casella.nome}
        </a>
      )}

      <form onSubmit={conferma} className="mt-5 text-left">
        <label htmlFor="codice-email" className="block text-sm font-semibold text-slate-600 mb-1">Codice dell'email</label>
        <input id="codice-email" value={codice} onChange={(e) => setCodice(pulisciCodice(e.target.value))}
          inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" className={CAMPO} />
        {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mt-3">{errore}</p>}
        {ok && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-3">{ok}</p>}
        <button type="submit" disabled={invio}
          className="w-full min-h-[52px] mt-3 bg-blue-600 text-white font-display font-extrabold text-lg rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60">
          {invio ? 'Controllo…' : 'Conferma il codice'}
        </button>
      </form>

      <button type="button" onClick={rimanda} disabled={mancano > 0 || invio}
        className="min-h-[44px] mt-3 text-sm font-semibold text-blue-600 underline disabled:text-slate-500 disabled:no-underline">
        {mancano > 0 ? `Non è arrivata? Puoi rimandarla tra ${mancano} s` : 'Rimanda l\'email'}
      </button>
      {onIndietro && (
        <button type="button" onClick={onIndietro} className="block mx-auto min-h-[44px] text-sm font-semibold text-slate-500">
          Ho sbagliato email, torna indietro
        </button>
      )}
    </div>
  )
}
