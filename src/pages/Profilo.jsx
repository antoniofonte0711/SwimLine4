import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { RUOLI_VISTA, nomeRuolo, puoModificare } from '../lib/permessi'
import { TIPI_LAVORO, STILI } from '../lib/lavori'
import { usePreferenze } from '../lib/preferenze'
import { attivaNotifiche, disattivaNotifiche, notificheAttive, notificheSupportate, serveHome } from '../lib/notifiche'
import AppShell from '../components/AppShell'
import BoxSquadra from '../components/BoxSquadra'
import SquadreAdmin from '../components/SquadreAdmin'
import RichiesteSquadra from '../components/RichiesteSquadra'
import InputPassword from '../components/InputPassword'
import { CAMPO, Interruttore, Riga, Scelta, Sezione } from '../components/Impostazione'
import { version } from '../../package.json'

const BOTTONE = 'text-sm font-bold text-blue-600 bg-schiuma rounded-full px-4 py-2 active:scale-95 transition'
const PRIMARIO = 'w-full bg-blue-600 text-white font-bold rounded-2xl py-3 active:scale-[0.98] transition disabled:opacity-50'

function Messaggio({ ok, errore }) {
  if (errore) return <p role="alert" className="text-sm text-white bg-red-500 rounded-xl px-3 py-2 mt-2">{errore}</p>
  if (ok) return <p role="status" className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 mt-2">{ok}</p>
  return null
}

// Nome e cognome: ognuno cambia solo i suoi (il ruolo resta quello scelto alla registrazione)
function CambiaNome() {
  const { profile, ricaricaProfilo } = useAuth()
  const [aperto, setAperto] = useState(false)
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [esito, setEsito] = useState({})

  function apri() {
    setNome(profile?.nome || '')
    setCognome(profile?.cognome || '')
    setEsito({})
    setAperto(true)
  }

  async function salva(e) {
    e.preventDefault()
    if (!nome.trim()) return setEsito({ errore: 'Scrivi il nome.' })
    const { error } = await supabase.rpc('aggiorna_mio_profilo', { p_nome: nome, p_cognome: cognome, p_tempi_visibili: null })
    if (error) return setEsito({ errore: 'Non sono riuscito a salvare: ' + error.message })
    await ricaricaProfilo()
    setAperto(false)
    setEsito({ ok: 'Nome aggiornato.' })
  }

  return (
    <div className="py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-abisso">Nome</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{profile?.nome} {profile?.cognome}</p>
        </div>
        {!aperto && <button type="button" onClick={apri} className={BOTTONE}>Cambia</button>}
      </div>
      {aperto && (
        <form onSubmit={salva} className="mt-3">
          <label className="block text-xs text-slate-500 mb-1" htmlFor="nome">Nome</label>
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} autoComplete="given-name" className={CAMPO + ' mb-2'} />
          <label className="block text-xs text-slate-500 mb-1" htmlFor="cognome">Cognome</label>
          <input id="cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} maxLength={60} autoComplete="family-name" className={CAMPO + ' mb-3'} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAperto(false)} className="font-bold text-slate-600 bg-bordo rounded-2xl py-3">Annulla</button>
            <button type="submit" className={PRIMARIO}>Salva nome</button>
          </div>
        </form>
      )}
      <Messaggio {...esito} />
    </div>
  )
}

function CambiaPassword() {
  const [aperto, setAperto] = useState(false)
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [esito, setEsito] = useState({})

  async function salva(e) {
    e.preventDefault()
    if (password.length < 8) return setEsito({ errore: 'La password deve avere almeno 8 caratteri.' })
    if (password !== conferma) return setEsito({ errore: 'Le due password non sono uguali.' })
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return setEsito({ errore: 'Non sono riuscito a cambiarla: ' + error.message })
    setPassword('')
    setConferma('')
    setAperto(false)
    setEsito({ ok: 'Password cambiata. Dalla prossima volta entri con quella nuova.' })
  }

  return (
    <div className="py-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-abisso">Password</p>
        {!aperto && <button type="button" onClick={() => { setAperto(true); setEsito({}) }} className={BOTTONE}>Cambia</button>}
      </div>
      {aperto && (
        <form onSubmit={salva} className="mt-3">
          <label className="block text-xs text-slate-500 mb-1">Nuova password (almeno 8 caratteri)</label>
          <InputPassword value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={CAMPO + ' mb-2'} />
          <label className="block text-xs text-slate-500 mb-1">Riscrivila uguale</label>
          <InputPassword value={conferma} onChange={(e) => setConferma(e.target.value)} autoComplete="new-password" className={CAMPO + ' mb-3'} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAperto(false)} className="font-bold text-slate-600 bg-bordo rounded-2xl py-3">Annulla</button>
            <button type="submit" className={PRIMARIO}>Salva password</button>
          </div>
        </form>
      )}
      <Messaggio {...esito} />
    </div>
  )
}

function Notifiche() {
  const { user } = useAuth()
  const [attive, setAttive] = useState(false)
  const [lavoro, setLavoro] = useState(false)
  const [errore, setErrore] = useState('')
  const supportate = notificheSupportate()

  useEffect(() => {
    notificheAttive().then(setAttive).catch(() => {})
  }, [])

  async function cambia(acceso) {
    setErrore('')
    setLavoro(true)
    try {
      if (acceso) await attivaNotifiche(user.id)
      else await disattivaNotifiche()
      setAttive(acceso)
    } catch (e) {
      setErrore(e.message)
    }
    setLavoro(false)
  }

  let nota = 'Vale solo per questo telefono: se usi l\'app anche su un altro, attivale anche lì.'
  if (!supportate && serveHome()) nota = 'Su iPhone: tocca Condividi → "Aggiungi a Home", apri l\'app da lì e attivale qui.'
  else if (!supportate) nota = 'Questo browser non supporta le notifiche.'

  return (
    <Sezione titolo="Notifiche" nota={nota}>
      <Riga etichetta="Nuovo allenamento" descrizione="Quando il coach pubblica l'allenamento">
        <Interruttore acceso={attive} onCambia={cambia} etichetta="Notifica nuovo allenamento" disabilitato={!supportate || lavoro} />
      </Riga>
      {errore && <div className="py-3"><Messaggio errore={errore} /></div>}
    </Sezione>
  )
}

function Privacy() {
  const { profile, ricaricaProfilo } = useAuth()
  const [errore, setErrore] = useState('')
  const visibili = profile?.tempi_visibili !== false

  async function cambia(acceso) {
    setErrore('')
    const { error } = await supabase.rpc('aggiorna_mio_profilo', { p_nome: profile.nome, p_cognome: profile.cognome, p_tempi_visibili: acceso })
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    await ricaricaProfilo()
  }

  return (
    <Sezione titolo="Privacy" nota="Il tuo coach vede sempre i tuoi tempi. Gli allenamenti che registri li vedete solo tu e il coach.">
      <Riga etichetta="I compagni vedono le mie gare" descrizione="Tempi di gara nella pagina Squadra e nei Record">
        <Interruttore acceso={visibili} onCambia={cambia} etichetta="I compagni vedono le mie gare" />
      </Riga>
      {errore && <div className="py-3"><Messaggio errore={errore} /></div>}
    </Sezione>
  )
}

function SegnalaProblema() {
  const { user } = useAuth()
  const [aperto, setAperto] = useState(false)
  const [testo, setTesto] = useState('')
  const [esito, setEsito] = useState({})
  const [invio, setInvio] = useState(false)

  async function invia(e) {
    e.preventDefault()
    if (!testo.trim()) return setEsito({ errore: 'Scrivi cosa non va.' })
    setInvio(true)
    const { error } = await supabase.from('segnalazioni').insert({
      autore_id: user.id, testo: testo.trim().slice(0, 2000),
      dispositivo: navigator.userAgent.slice(0, 300),
    })
    setInvio(false)
    if (error) return setEsito({ errore: 'Non sono riuscito a inviarla: ' + error.message })
    setTesto('')
    setAperto(false)
    setEsito({ ok: 'Grazie! La segnalazione è arrivata all\'amministratore.' })
  }

  return (
    <div className="py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-abisso">Segnala un problema</p>
          <p className="text-xs text-slate-500 mt-0.5">Qualcosa non funziona o manca? Scrivilo qui.</p>
        </div>
        {!aperto && <button type="button" onClick={() => { setAperto(true); setEsito({}) }} className={BOTTONE}>Scrivi</button>}
      </div>
      {aperto && (
        <form onSubmit={invia} className="mt-3">
          <label className="block text-xs text-slate-500 mb-1" htmlFor="segnalazione">Cosa è successo? In quale pagina?</label>
          <textarea id="segnalazione" value={testo} onChange={(e) => setTesto(e.target.value)} rows={4} maxLength={2000}
            className={CAMPO + ' mb-3 resize-none'} />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAperto(false)} className="font-bold text-slate-600 bg-bordo rounded-2xl py-3">Annulla</button>
            <button type="submit" disabled={invio} className={PRIMARIO}>{invio ? 'Invio…' : 'Invia'}</button>
          </div>
        </form>
      )}
      <Messaggio {...esito} />
    </div>
  )
}

// Atleti e genitori chiudono da soli l'account; per un coach si cancellerebbe tutta la squadra
function EliminaAccount() {
  const navigate = useNavigate()
  const [aperto, setAperto] = useState(false)
  const [conferma, setConferma] = useState('')
  const [errore, setErrore] = useState('')

  async function elimina(e) {
    e.preventDefault()
    if (conferma.trim().toUpperCase() !== 'ELIMINA') return setErrore('Scrivi ELIMINA per confermare.')
    const { error } = await supabase.rpc('elimina_mio_account')
    if (error) return setErrore('Non sono riuscito a eliminarlo: ' + error.message)
    await supabase.auth.signOut()
    navigate('/')
  }

  if (!aperto) {
    return (
      <button type="button" onClick={() => setAperto(true)} className="w-full text-sm font-semibold text-red-600 py-3">
        Elimina il mio account
      </button>
    )
  }
  return (
    <form onSubmit={elimina} className="bg-white rounded-3xl p-5 border-2 border-red-200">
      <p className="font-bold text-red-700 mb-1">Eliminare l'account?</p>
      <p className="text-sm text-slate-600 mb-3">
        Si cancellano per sempre il profilo, i tempi, le gare, le presenze, i punti e i video. Non si può tornare indietro.
      </p>
      <label className="block text-xs text-slate-500 mb-1" htmlFor="conferma-elimina">Per confermare scrivi ELIMINA</label>
      <input id="conferma-elimina" value={conferma} onChange={(e) => setConferma(e.target.value)} autoComplete="off" className={CAMPO + ' mb-3'} />
      <Messaggio errore={errore} />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button type="button" onClick={() => { setAperto(false); setConferma(''); setErrore('') }} className="font-bold text-slate-600 bg-bordo rounded-2xl py-3">Annulla</button>
        <button type="submit" className="w-full bg-red-600 text-white font-bold rounded-2xl py-3">Elimina account</button>
      </div>
    </form>
  )
}

// Il ruolo (atleta, coach, genitore) si sceglie solo alla registrazione: qui non si cambia.
// Solo l'admin può "vedere come" un altro ruolo, per controllare cosa vedrebbe.
export default function Profilo() {
  const { user, profile, isAdmin, ruolo, adminReale, cambiaVista } = useAuth()
  const navigate = useNavigate()
  const [pref, salva] = usePreferenze()

  async function esci() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function vediCome(r) {
    cambiaVista(r)
    navigate('/dashboard')
  }

  const registraTempi = puoModificare(ruolo)
  const eAtleta = ['atleta', 'admin'].includes(profile?.role) && ruolo !== 'genitore' && ruolo !== 'ospite'

  return (
    <AppShell titolo="Profilo" attiva="profilo">
      <div className="bg-white rounded-3xl p-6 text-center mb-4 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
        <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-blue-600 text-white font-display text-3xl font-extrabold flex items-center justify-center">
          {(profile?.nome || 'A').charAt(0).toUpperCase()}
        </div>
        <p className="font-display text-2xl font-extrabold text-abisso">{profile?.nome} {profile?.cognome}</p>
        <p className="text-sm text-slate-500">{nomeRuolo(profile?.role)}</p>
      </div>

      {/* L'admin è anche atleta: entra in una squadra accettando l'invito del coach (non creandone una sua) */}
      {adminReale && <RichiesteSquadra completo />}
      {adminReale && <SquadreAdmin />}

      {['atleta', 'genitore', 'coach'].includes(profile?.role) && <BoxSquadra />}

      {adminReale && (
        <div className="bg-white rounded-3xl p-5 mb-4 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
          <p className="font-bold mb-1">Vedi l'app come</p>
          <p className="text-xs text-slate-500 mb-3">
            Cambia solo cosa si vede sullo schermo e cosa si può fare. I dati restano i tuoi.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {RUOLI_VISTA.map(([chiave, nome]) => (
              <button key={chiave} onClick={() => vediCome(chiave)}
                className={`text-sm font-semibold rounded-xl py-3 transition active:scale-95 ${
                  ruolo === chiave ? 'bg-blue-600 text-white' : 'bg-bordo text-slate-600'
                }`}>
                {nome}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Ora stai vedendo come: <b>{nomeRuolo(ruolo)}</b></p>
        </div>
      )}

      {isAdmin && (
        <Link to="/admin" className="block text-center font-bold text-blue-600 bg-schiuma rounded-2xl py-3.5 mb-4">
          Pannello admin
        </Link>
      )}

      <Sezione titolo="Account">
        <CambiaNome />
        <Riga etichetta="Email" descrizione={user?.email} />
        <CambiaPassword />
      </Sezione>

      {registraTempi && (
        <Sezione titolo="Allenamento" nota="Già scelti quando registri i tempi: puoi sempre cambiarli lì.">
          <Riga etichetta="Lavoro preferito">
            <select value={pref.tipoLavoro} onChange={(e) => salva({ tipoLavoro: e.target.value })} aria-label="Lavoro preferito"
              className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm font-semibold max-w-[160px]">
              {TIPI_LAVORO.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Riga>
          <Riga etichetta="Stile preferito">
            <select value={pref.stile} onChange={(e) => salva({ stile: e.target.value })} aria-label="Stile preferito"
              className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm font-semibold max-w-[160px]">
              {STILI.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Riga>
        </Sezione>
      )}

      {ruolo !== 'ospite' && (
        <Sezione titolo="In vasca">
          <Riga etichetta="Schermo sempre acceso" descrizione="Il telefono non si spegne mentre nuoti">
            <Interruttore acceso={pref.schermoAcceso} onCambia={(v) => salva({ schermoAcceso: v })} etichetta="Schermo sempre acceso" />
          </Riga>
          <Riga etichetta="Vibrazione" descrizione="Vibra quando tocchi Fatto (non su iPhone)">
            <Interruttore acceso={pref.vibrazione} onCambia={(v) => salva({ vibrazione: v })} etichetta="Vibrazione" />
          </Riga>
        </Sezione>
      )}

      <Notifiche />

      <Sezione titolo="Aspetto">
        <div className="py-3.5">
          <p className="text-[15px] font-semibold text-abisso mb-2">Tema</p>
          <Scelta valore={pref.tema} onCambia={(v) => salva({ tema: v })} etichetta="Tema"
            opzioni={[['chiaro', 'Chiaro'], ['scuro', 'Scuro'], ['sistema', 'Come il telefono']]} />
        </div>
        <Riga etichetta="Testo più grande">
          <Interruttore acceso={pref.testoGrande} onCambia={(v) => salva({ testoGrande: v })} etichetta="Testo più grande" />
        </Riga>
      </Sezione>

      {eAtleta && <Privacy />}

      <Sezione titolo="Aiuto">
        <SegnalaProblema />
        <Riga etichetta="Versione" descrizione={`SwimLine4 ${version}`} />
      </Sezione>

      <button onClick={esci} className="w-full font-bold text-slate-600 bg-white rounded-2xl py-3.5 mb-2 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
        Esci
      </button>
      {['atleta', 'genitore'].includes(profile?.role) && <EliminaAccount />}
      {['coach', 'coach_in_attesa'].includes(profile?.role) && (
        <p className="text-xs text-slate-500 text-center px-4 py-3">
          Per chiudere un account coach usa «Segnala un problema»: se ne occupa l'amministratore, così la squadra non va persa.
        </p>
      )}
    </AppShell>
  )
}
