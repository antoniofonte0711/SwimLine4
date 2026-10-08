import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarioFoglio } from './SelettoreData'
import { useAuth } from '../context/AuthContext'
import { dataLocale } from '../lib/lavori'
import { nomeRuolo } from '../lib/permessi'

const VOCI = [
  ['home', '/dashboard', 'casa', 'Home'],
  ['riepilogo', '/riepilogo', 'grafico', 'Riepilogo'],
  ['funzioni', '/funzioni', 'griglia', 'Funzioni'],
  ['profilo', '/profilo', 'persona', 'Profilo'],
]
// Icone disegnate (le emoji cambiano aspetto da un telefono all'altro)
const ICONE = {
  casa: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /><path d="M10 20v-6h4v6" /></>,
  grafico: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  griglia: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
  persona: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
}
const LETTERE = ['D', 'L', 'M', 'M', 'G', 'V', 'S']

// Struttura comune di tutte le schermate: testata blu, area contenuti arrotondata e barra in basso.
// attiva: 'home' | 'riepilogo' | 'funzioni' | 'profilo'
// indietro: percorso di riserva del tasto "Indietro" (facoltativo)
// giorno + onGiorno: se presenti, mostrano la striscia dei giorni
export default function AppShell({ titolo, attiva, indietro, giorno, onGiorno, children }) {
  const { profile, ruolo, staVedendoCome, cambiaVista, squadraGestita } = useAuth()
  const voci = VOCI.filter(([chiave]) => !(ruolo === 'ospite' && chiave === 'riepilogo'))
  const iniziale = (profile?.nome || 'A').charAt(0).toUpperCase()
  const [calAperto, setCalAperto] = useState(false)
  const navigate = useNavigate()
  // "Indietro" torna alla pagina precedente dell'app; se si è entrati da un link diretto
  // (nessuna pagina precedente) va al percorso indicato
  const tornaIndietro = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(indietro))
  // La striscia mostra la settimana (lunedì-domenica) del giorno scelto: con le frecce si passa alla settimana
  // precedente/successiva, col calendario si va ovunque
  const oggi = dataLocale()
  const centro = new Date((giorno || oggi) + 'T12:00:00')
  const lunedi = new Date(centro)
  lunedi.setDate(lunedi.getDate() - ((centro.getDay() + 6) % 7))
  const giorni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunedi)
    d.setDate(d.getDate() + i)
    return d
  })
  const sposta = (n) => {
    const d = new Date(centro)
    d.setDate(d.getDate() + n)
    onGiorno(dataLocale(d))
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {staVedendoCome && (
        <div className="sticky top-0 z-50 bg-amber-400 text-black text-sm px-4 py-2 flex items-center justify-between gap-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
          <span>
            👁 Stai vedendo l'app come: <b>{nomeRuolo(ruolo)}</b>
            {squadraGestita && <> · squadra <b>{squadraGestita.nome}</b></>}
          </span>
          <button onClick={() => cambiaVista('admin')} className="font-bold bg-black text-white rounded-full px-3 py-1">Torna admin</button>
        </div>
      )}
      <header className="bg-blue-600 text-white px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-10">
        <div className="max-w-md lg:max-w-[900px] mx-auto">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold tracking-tight">
              Swim<span className="font-light">Line4</span>
            </span>
            <Link to="/profilo" aria-label="Profilo"
              className="w-10 h-10 rounded-full bg-white text-blue-600 font-bold flex items-center justify-center">
              {iniziale}
            </Link>
          </div>
          <h1 className="text-2xl font-semibold mt-3">{titolo}</h1>

          {onGiorno && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <button onClick={() => sposta(-7)} aria-label="Settimana precedente" className="w-9 h-9 rounded-full bg-white/15 text-lg font-bold">‹</button>
              <button onClick={() => setCalAperto(true)} className="font-semibold capitalize px-3 py-1 rounded-full bg-white/15">
                📅 {centro.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </button>
              <button onClick={() => sposta(7)} aria-label="Settimana successiva" className="w-9 h-9 rounded-full bg-white/15 text-lg font-bold">›</button>
            </div>
          )}
          {onGiorno && (
            <div className="flex justify-between mt-2">
              {giorni.map((d) => {
                const valore = dataLocale(d)
                const scelto = valore === giorno
                const eOggi = valore === oggi
                return (
                  <button key={valore} onClick={() => onGiorno(valore)} aria-current={eOggi ? 'date' : undefined}
                    className={`w-[13.5%] py-2 rounded-2xl text-xs flex flex-col items-center gap-1 transition ${
                      scelto ? 'bg-white text-blue-600' : eOggi ? 'text-white ring-2 ring-inset ring-white' : 'text-white'
                    }`}>
                    {LETTERE[d.getDay()]}
                    <span className="text-base font-semibold">{d.getDate()}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </header>

      {calAperto && <CalendarioFoglio valore={giorno} onScegli={onGiorno} onChiudi={() => setCalAperto(false)} />}

      <main className="-mt-6 rounded-t-[28px] bg-slate-50 px-4 pt-5 pb-32">
        <div className="max-w-md lg:max-w-[900px] mx-auto">
          {indietro && (
            <button type="button" onClick={tornaIndietro}
              className="inline-block mb-4 text-sm font-semibold text-blue-600 bg-blue-50 rounded-full px-4 py-2">
              ← Indietro
            </button>
          )}
          {children}
        </div>
      </main>

      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md bg-white border border-gray-200 rounded-full shadow-xl flex p-1.5 mb-[env(safe-area-inset-bottom)]">
        {voci.map(([chiave, percorso, icona, nome]) => (
          <Link key={chiave} to={percorso} aria-current={attiva === chiave ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center gap-0.5 text-xs font-medium py-2 rounded-full transition ${
              attiva === chiave ? 'bg-blue-600 text-white' : 'text-gray-600'
            }`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {ICONE[icona]}
            </svg>
            {nome}
          </Link>
        ))}
      </nav>
    </div>
  )
}
