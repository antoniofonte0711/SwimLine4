import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { erroreAuth } from '../lib/erroriAuth'
import { casellaDi } from '../lib/posta'
import Icona from './Icona'

const ATTESA = 60 // secondi prima di poter rimandare l'email (lo stesso limite di Supabase)

// Dopo la registrazione o "Password dimenticata": schermata grande che dice di aprire l'email e toccare il link.
// tipo: 'signup' (conferma dell'account) | 'recovery' (nuova password). onFatto(sessione) quando è confermato.
export default function ControllaEmail({ email, tipo, onFatto, onIndietro }) {
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

  async function rimanda() {
    setErrore('')
    setOk('')
    setInvio(true)
    const { error } = tipo === 'signup'
      ? await supabase.auth.resend({ type: 'signup', email })
      : await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nuova-password` })
    setInvio(false)
    if (error) return setErrore(erroreAuth(error))
    setMancano(ATTESA)
    setOk('Email rimandata: apri quella più recente (il link di prima non vale più).')
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
        {tipo === 'signup' ? 'Per attivare l\'account' : 'Per scegliere la nuova password'} apri l'email e tocca il link:
        entri direttamente nell'app. Non la vedi? Guarda in Spam o Promozioni.
      </p>

      {casella && (
        <a href={casella.url} target="_blank" rel="noreferrer"
          className="cliccabile mt-4 w-full min-h-[52px] rounded-2xl bg-blue-600 text-white font-display font-extrabold text-lg flex items-center justify-center gap-2">
          <Icona nome="busta" className="w-5 h-5" /> Apri {casella.nome}
        </a>
      )}

      {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mt-3 text-left">{errore}</p>}
      {ok && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-3 text-left">{ok}</p>}

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
