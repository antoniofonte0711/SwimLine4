import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Icona from '../components/Icona'
import GuidaPagina from '../components/GuidaPagina'
import SegnalazioniAdmin from '../components/SegnalazioniAdmin'
import { contaAllenamenti, DettaglioSquadra, ElencoSquadre, useDatiSquadre } from '../components/admin/AdminSquadre'
import { CoachDaApprovare, RegistroAccessi, TuttiUtenti } from '../components/admin/AdminUtenti'
import { FunzioniApp, NotificheApp, Sicurezza } from '../components/admin/AdminImpostazioni'
import { Numero, plurale, Scheda, Scheletro } from '../components/admin/ui'

const MENU = [
  ['squadre', 'Società e gruppi', 'onde'],
  ['dashboard', 'Dashboard', 'grafico'],
  ['Amministrazione', 'gruppo', [['utenti', 'Tutti gli utenti'], ['approvazioni', 'Coach da approvare'], ['segnalazioni', 'Segnalazioni'], ['accessi', 'Registro accessi']]],
  ['Impostazioni', 'regolazioni', [['funzioni', 'Funzioni dell\'app'], ['notifiche', 'Notifiche e avvisi'], ['sicurezza', 'Sicurezza e backup']]],
]

function Dashboard({ dati, vai }) {
  const [stat, setStat] = useState(null)
  useEffect(() => { supabase.rpc('admin_statistiche').then(({ data }) => setStat(data || {})) }, [])
  if (!dati) return <Scheletro schede={4} righe={3} />
  const genitoriSoli = dati.persone.filter((p) => p.role === 'genitore' && !dati.collegamenti.some((c) => c.genitore_id === p.id && c.stato === 'approvato'))
  const controlli = [
    [!stat?.coach_in_attesa, 'Coach da approvare', stat?.coach_in_attesa ? `${stat.coach_in_attesa} in attesa` : 'Nessuno in attesa', 'approvazioni'],
    [!stat?.segnalazioni, 'Segnalazioni', stat?.segnalazioni ? `${stat.segnalazioni} da leggere` : 'Nessuna da leggere', 'segnalazioni'],
    [genitoriSoli.length === 0, 'Genitori collegati ai figli', genitoriSoli.length ? `${plurale(genitoriSoli.length, 'genitore', 'genitori')} senza figli collegati` : 'Tutti collegati', 'squadre'],
    // il controllo lo fa l'app con lib/passwordRubata.js (gratis), non il piano Pro di Supabase
    [true, 'Protezione password rubate', 'Attiva: le password già finite online vengono rifiutate', 'sicurezza'],
  ]
  const piani = contaAllenamenti(dati)
  return (
    <>
      <h1 className="font-display text-[34px] font-extrabold leading-tight">Dashboard</h1>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
        <Numero valore={dati.persone.length} etichetta="Persone nell'app" spiega="Account attivi, di tutti i ruoli" />
        <Numero valore={dati.societa.length} etichetta="Società" spiega={plurale(dati.squadre.length, 'gruppo', 'gruppi') + ' in tutto'} />
        <Numero valore={piani.pubblicati} etichetta="Allenamenti pubblicati" spiega={`In totale, anche passati · ${piani.inProgramma} da oggi in poi`} />
        <Numero valore={stat?.accessi_7gg} etichetta="Accessi (7 gg)" spiega="Persone entrate negli ultimi 7 giorni" />
      </div>
      <Scheda titolo="Da controllare" nota={`${controlli.filter((c) => c[0]).length} di ${controlli.length} a posto`}>
        {controlli.map(([ok, titolo, dettaglio, dove]) => (
          <button key={titolo} type="button" onClick={() => vai(dove)} className="w-full flex items-center gap-3 py-3 border-t border-slate-100 first:border-t-0 text-left">
            <span aria-hidden="true" className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
              {ok ? '✓' : '!'}
            </span>
            <span className="flex-1 min-w-0"><b className="block">{titolo}</b><span className="text-[13px] text-slate-500">{dettaglio}</span></span>
            <span className="text-sm font-bold text-blue-600">Apri ›</span>
          </button>
        ))}
      </Scheda>
    </>
  )
}

// Pannello di controllo (solo admin): squadre, persone, permessi, funzioni, notifiche, sicurezza
export default function AdminPanel() {
  const { profile, user } = useAuth()
  const [parametri, setParametri] = useSearchParams()
  const sezione = parametri.get('sezione') || 'squadre'
  const squadraId = parametri.get('squadra')
  const [dati, ricarica] = useDatiSquadre()
  const [aperti, setAperti] = useState({ Amministrazione: true, Impostazioni: true })
  const [guidaAperta, setGuidaAperta] = useState(false)
  const chiudiGuida = useCallback(() => setGuidaAperta(false), [])

  // sul telefono il menu sta chiuso sotto un pulsante, così il contenuto si vede subito
  const [menuAperto, setMenuAperto] = useState(false)
  const vai = (s, sq) => {
    const p = { sezione: s }
    if (sq) p.squadra = sq
    setParametri(p)
    setMenuAperto(false)
    window.scrollTo(0, 0)
  }
  const nomeSezione = MENU.flatMap((m) => (Array.isArray(m[2]) ? m[2] : [[m[0], m[1]]])).find(([id]) => id === sezione)?.[1] || 'Menu'

  const voce = (attiva) => `w-full flex items-center gap-3 min-h-[54px] px-4 border-b border-slate-100 text-left text-[15px] font-semibold ${attiva ? 'bg-schiuma text-blue-600' : 'text-abisso hover:bg-slate-50'}`
  const sottoVoce = (attiva) => `w-full min-h-[46px] pl-12 pr-4 border-b border-slate-100 text-left text-[15px] font-semibold ${attiva ? 'bg-schiuma text-blue-600' : 'bg-slate-50/60 text-slate-600'}`

  return (
    <div className="min-h-screen bg-bordo text-abisso">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap pt-[max(env(safe-area-inset-top),0.75rem)]">
        {/* il nome riporta alla pagina iniziale del Pannello */}
        <button type="button" onClick={() => vai('squadre')} aria-label="SwimLine4 Pannello, pagina iniziale"
          className="flex items-center gap-3 font-display text-[22px] font-extrabold text-left">
          <span className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center"><Icona nome="onde" /></span>
          <span>Swim<b className="text-blue-600">Line4</b> Pannello</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[15px] font-semibold text-slate-600 mr-1">{profile?.nome} {profile?.cognome} · {user?.email}</span>
          <button type="button" onClick={() => setGuidaAperta(true)} aria-label="Come si usa il Pannello"
            className="w-11 h-11 rounded-xl bg-schiuma text-blue-600 font-display text-xl font-extrabold flex items-center justify-center">?</button>
          <Link to="/dashboard" className="min-h-[44px] rounded-xl px-4 bg-schiuma text-blue-600 font-extrabold text-sm flex items-center">Torna all'app</Link>
        </div>
      </header>
      {guidaAperta && <GuidaPagina onChiudi={chiudiGuida} />}

      <div className="flex flex-wrap gap-6 p-4 sm:p-6">
        <button type="button" onClick={() => setMenuAperto(!menuAperto)} aria-expanded={menuAperto} aria-controls="menu-pannello"
          className="lg:hidden w-full min-h-[48px] flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 font-bold text-left">
          <span aria-hidden="true" className="text-xl leading-none">☰</span> {nomeSezione}
          <span aria-hidden="true" className={`ml-auto text-slate-500 transition-transform ${menuAperto ? 'rotate-90' : ''}`}>›</span>
        </button>
        <nav id="menu-pannello" aria-label="Menu del pannello"
          className={`${menuAperto ? '' : 'hidden'} lg:block flex-1 basis-[240px] max-w-full lg:max-w-[290px] self-start bg-white border border-slate-200 rounded-2xl overflow-hidden`}>
          {MENU.map((m) => {
            if (!Array.isArray(m[2])) {
              const [id, nome, icona] = m
              return (
                <button key={id} type="button" onClick={() => vai(id)} aria-current={sezione === id ? 'page' : undefined} className={voce(sezione === id)}>
                  <Icona nome={icona} className="w-5 h-5" /> {nome}
                </button>
              )
            }
            const [nome, icona, figli] = m
            return (
              <div key={nome}>
                <button type="button" onClick={() => setAperti({ ...aperti, [nome]: !aperti[nome] })} aria-expanded={!!aperti[nome]} className={voce(false)}>
                  <Icona nome={icona} className="w-5 h-5" /> {nome}
                  <span aria-hidden="true" className={`ml-auto text-slate-500 transition-transform ${aperti[nome] ? 'rotate-90' : ''}`}>›</span>
                </button>
                {aperti[nome] && figli.map(([id, n]) => (
                  <button key={id} type="button" onClick={() => vai(id)} aria-current={sezione === id ? 'page' : undefined} className={sottoVoce(sezione === id)}>{n}</button>
                ))}
              </div>
            )
          })}
        </nav>

        <main className="flex-[999_1_600px] min-w-0 flex flex-col gap-5">
          {sezione === 'squadre' && !squadraId && <ElencoSquadre dati={dati} ricarica={ricarica} onApri={(id) => vai('squadre', id)} />}
          {sezione === 'squadre' && squadraId && dati && (
            <DettaglioSquadra key={squadraId} dati={dati} ricarica={ricarica} squadraId={squadraId} onIndietro={() => vai('squadre')} />
          )}
          {sezione === 'dashboard' && <Dashboard dati={dati} vai={vai} />}
          {!dati && sezione === 'squadre' && squadraId && <Scheletro />}
          {!dati && ['utenti', 'accessi'].includes(sezione) && <Scheletro righe={6} />}
          {sezione === 'utenti' && dati && <TuttiUtenti dati={dati} ricarica={ricarica} io={user?.id} />}
          {sezione === 'approvazioni' && <CoachDaApprovare ricarica={ricarica} />}
          {sezione === 'segnalazioni' && (
            <>
              <h1 className="font-display text-[34px] font-extrabold leading-tight">Segnalazioni</h1>
              <SegnalazioniAdmin />
            </>
          )}
          {sezione === 'accessi' && dati && <RegistroAccessi dati={dati} />}
          {sezione === 'funzioni' && <FunzioniApp />}
          {sezione === 'notifiche' && <NotificheApp dati={dati} />}
          {sezione === 'sicurezza' && <Sicurezza />}
        </main>
      </div>
    </div>
  )
}
