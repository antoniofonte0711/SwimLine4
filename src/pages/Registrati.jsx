import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SfondoVasca from '../components/SfondoVasca'
import Icona from '../components/Icona'
import InputPassword from '../components/InputPassword'
import { ETA_CONSENSO, erroreAuth, eta } from '../lib/erroriAuth'
import { VERSIONE_INFORMATIVA } from '../lib/privacy'

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
  const [privacy, setPrivacy] = useState(false)
  const [consensoGenitore, setConsensoGenitore] = useState(false)
  const [invio, setInvio] = useState(false)
  const [entrato, setEntrato] = useState(false) // account attivo subito (senza conferma email)
  const navigate = useNavigate()
  // atleta sotto i 14 anni: serve il consenso di un genitore
  const anni = eta(dataNascita)
  const minore = role === 'atleta' && anni !== null && anni < ETA_CONSENSO

  useEffect(() => {
    supabase.from('squadre').select('id, nome').then(({ data }) => {
      if (data) setSquadre(data)
    })
  }, [])

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('La password deve avere almeno 8 caratteri.')
    if (!privacy) return setError('Per continuare leggi e accetta l\'informativa privacy.')
    if (minore && !consensoGenitore) return setError('Sotto i 14 anni serve il consenso di un genitore: chiedi a mamma o papà di spuntare la casella.')

    // il consenso resta salvato insieme all'account (data e versione dell'informativa)
    const metadata = {
      nome, cognome, data_nascita: dataNascita, role,
      privacy_accettata: new Date().toISOString(), privacy_versione: VERSIONE_INFORMATIVA,
      ...(minore ? { consenso_genitore: true } : {}),
    }
    if (role === 'coach' && nomeSquadra) {
      metadata.nome_squadra = nomeSquadra
    } else if (role !== 'coach' && squadraScelta) {
      metadata.squadra_id = squadraScelta
    }

    setInvio(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })
    setInvio(false)

    if (error) {
      setError(erroreAuth(error))
      return
    }

    // Se Supabase non chiede la conferma dell'email l'account è già attivo: si entra subito
    const attivo = !!data?.session
    setEntrato(attivo)
    setSuccess(true)
    setTimeout(() => navigate(attivo ? '/dashboard' : '/login'), attivo ? 3500 : 6000)
  }

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#0a3fbf] px-4 py-8">
      <SfondoVasca />
        <div className="relative bg-white rounded-[28px] shadow-[0_24px_60px_rgba(4,26,77,0.35)] p-7 text-center max-w-sm text-white">
          <span className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <Icona nome="spunta" className="w-8 h-8" />
          </span>
          <p className="font-display text-xl font-extrabold text-abisso">Registrazione completata!</p>
          <p className="text-sm text-slate-600 mt-2">
            {entrato
              ? 'Il tuo account è pronto: tra un attimo entri nell\'app.'
              : 'Ti abbiamo mandato un\'email: apri il link per confermare l\'account (se non la trovi, guarda nello spam). Poi accedi.'}
          </p>
          {role === 'coach' && (
            <p className="text-sm text-slate-600 mt-2">Il profilo coach si attiva quando l'amministratore lo approva: fino ad allora entri come atleta.</p>
          )}
          {role !== 'coach' && squadraScelta && (
            <p className="text-sm text-slate-600 mt-2">Il coach della squadra riceve la tua richiesta: entri quando la approva.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#0a3fbf] px-4 py-8">
      <SfondoVasca />
      <form onSubmit={handleRegister} className="w-full max-w-sm relative bg-white rounded-[28px] shadow-[0_24px_60px_rgba(4,26,77,0.35)] p-7">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <Icona nome="onde" className="w-8 h-8" />
          </div>
        </div>
        <h1 className="font-display text-[28px] font-extrabold text-abisso mb-1 text-center">SwimLine4</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Crea il tuo account</p>

        <label className="block text-sm font-semibold text-slate-600 mb-1">Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4" required />

        <label className="block text-sm font-semibold text-slate-600 mb-1">Cognome</label>
        <input value={cognome} onChange={(e) => setCognome(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4" required />

        <label className="block text-sm font-semibold text-slate-600 mb-1">Data di nascita</label>
        <input type="date" value={dataNascita} onChange={(e) => setDataNascita(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4" required />

        <label className="block text-sm font-semibold text-slate-600 mb-1">Sei...</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4">
          <option value="atleta">Atleta</option>
          <option value="coach">Coach</option>
          <option value="genitore">Genitore</option>
        </select>

        {role === 'coach' ? (
          <>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Nome della tua squadra</label>
            <input value={nomeSquadra} onChange={(e) => setNomeSquadra(e.target.value)}
              placeholder="Es. Delfini Nuoto Club"
              className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-1" />
            <p className="text-xs text-slate-500 mb-4">L'account coach va approvato dall'amministratore: dopo l'approvazione nasce la tua squadra.</p>
          </>
        ) : (
          <>
            <label className="block text-sm font-semibold text-slate-600 mb-1">Chiedi di entrare in una squadra (facoltativo)</label>
            <select value={squadraScelta} onChange={(e) => setSquadraScelta(e.target.value)}
              className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4">
              <option value="">Nessuna squadra per ora</option>
              {squadre.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
            {squadraScelta && <p className="text-xs text-slate-500 -mt-3 mb-4">Entri quando il coach approva la richiesta.</p>}
          </>
        )}

        <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4" required />

        <label className="block text-sm font-semibold text-slate-600 mb-1">Password (almeno 8 caratteri)</label>
        <InputPassword value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
          className="w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition mb-4" />

        {minore && (
          <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-3 cursor-pointer">
            <input type="checkbox" checked={consensoGenitore} onChange={(e) => setConsensoGenitore(e.target.checked)} className="mt-1 w-5 h-5 shrink-0 accent-blue-600" />
            <span className="text-sm text-amber-900">
              <b>Per il genitore:</b> l'atleta ha meno di 14 anni. Sono il genitore (o chi ne fa le veci), ho letto l'informativa e do il consenso al trattamento dei suoi dati.
            </span>
          </label>
        )}
        <label className="flex items-start gap-3 mb-4 cursor-pointer">
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1 w-5 h-5 shrink-0 accent-blue-600" />
          <span className="text-sm text-slate-600">
            Ho letto l'<Link to="/privacy" className="text-blue-600 font-bold underline">informativa privacy</Link> e accetto il trattamento dei dati per usare l'app.
          </span>
        </label>

        {error && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mb-4">{error}</p>}

        <button type="submit" disabled={invio}
          className="w-full min-h-[52px] bg-blue-600 text-white font-display font-extrabold text-lg rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60">
          {invio ? 'Creo l\'account…' : 'Crea account'}
        </button>

        <p className="text-sm text-slate-500 text-center mt-5">
          Hai già un account?{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">Accedi</Link>
        </p>
      </form>
    </div>
  )
}