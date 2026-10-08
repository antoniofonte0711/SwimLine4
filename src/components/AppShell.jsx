import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarioFoglio } from './SelettoreData'
import { useAuth } from '../context/AuthContext'
import { dataLocale } from '../lib/lavori'
import { nomeRuolo } from '../lib/permessi'

const VOCI = [
  ['home', '/dashboard', 'onde', 'Oggi'],
  ['riepilogo', '/riepilogo', 'grafico', 'Riepilogo'],
  ['funzioni', '/funzioni', 'griglia', 'Funzioni'],
  ['profilo', '/profilo', 'persona', 'Profilo'],
]
// Icone disegnate (le emoji cambiano aspetto da un telefono all'altro)
const ICONE = {
  onde: <><path d="M2 15c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><path d="M2 19.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><circle cx="15" cy="6" r="2.2" /><path d="M5 11.5 9 8l3 2.5" /></>,
  grafico: <><path d="M3 17l5-5 4 3 8-8" /><path d="M15 7h5v5" /></>,
  griglia: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
  persona: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>,
}
const SIGLE = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB']

// Struttura comune di tutte le schermate (layout Limpida): testata chiara, striscia dei giorni e menu in basso.
// attiva: 'home' | 'riepilogo' | 'funzioni' | 'profilo'
// indietro: percorso di riserva del tasto "Indietro" (facoltativo)
// giorno + onGiorno: se presenti, mostrano la striscia dei giorni
// voti: { '2026-10-08': 5.8 } difficoltà dei giorni, disegnata come barretta sotto ogni giorno (facoltativo)
export default function AppShell({ titolo, attiva, indietro, giorno, onGiorno, voti = {}, children }) {
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
  const dataTesto = centro.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-bordo">
      {staVedendoCome && (
        <div className="sticky top-0 z-50 bg-amber-400 text-black text-sm px-4 py-2 flex items-center justify-between gap-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
          <span>
            👁 Stai vedendo l'app come: <b>{nomeRuolo(ruolo)}</b>
            {squadraGestita && <> · squadra <b>{squadraGestita.nome}</b></>}
          </span>
          <button onClick={() => cambiaVista('admin')} className="font-bold bg-black text-white rounded-full px-3 py-1">Torna admin</button>
        </div>
      )}
      <header className="px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2">
        <div className="max-w-md lg:max-w-[900px] mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-500 first-letter:uppercase">
              {onGiorno ? dataTesto : <>Swim<b className="text-blue-600">Line4</b></>}
            </p>
            <h1 className="font-display text-[30px] font-extrabold leading-tight text-abisso truncate">{titolo}</h1>
          </div>
          <Link to="/profilo" aria-label="Profilo"
            className="w-11 h-11 shrink-0 rounded-full bg-abisso text-white font-display font-bold flex items-center justify-center">
            {iniziale}
          </Link>
        </div>
      </header>

      {calAperto && <CalendarioFoglio valore={giorno} onScegli={onGiorno} onChiudi={() => setCalAperto(false)} />}

      <main className="px-4 pt-2 pb-32">
        <div className="max-w-md lg:max-w-[900px] mx-auto">
          {indietro && (
            <button type="button" onClick={tornaIndietro}
              className="inline-block mb-4 text-sm font-semibold text-blue-600 bg-schiuma rounded-full px-4 py-2">
              ← Indietro
            </button>
          )}

          {onGiorno && (
            <nav aria-label="Settimana" className="bg-white rounded-3xl px-2 pt-2 pb-3 mb-3 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
              <div className="flex items-center justify-between px-1 mb-1">
                <button onClick={() => sposta(-7)} aria-label="Settimana precedente" className="w-9 h-9 rounded-full text-slate-500 text-lg font-bold hover:bg-bordo">‹</button>
                <button onClick={() => setCalAperto(true)} className="text-xs font-bold text-slate-500 capitalize px-3 py-1.5 rounded-full hover:bg-bordo">
                  {centro.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })} ▾
                </button>
                <button onClick={() => sposta(7)} aria-label="Settimana successiva" className="w-9 h-9 rounded-full text-slate-500 text-lg font-bold hover:bg-bordo">›</button>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {giorni.map((d) => {
                  const valore = dataLocale(d)
                  const scelto = valore === giorno
                  const eOggi = valore === oggi
                  const voto = voti[valore]
                  return (
                    <button key={valore} onClick={() => onGiorno(valore)} aria-current={eOggi ? 'date' : undefined} aria-pressed={scelto}
                      aria-label={`${d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' })}${voto ? `, difficoltà ${String(voto).replace('.', ',')}` : ''}`}
                      className={`py-1.5 rounded-2xl text-[11px] font-semibold flex flex-col items-center gap-1 transition ${
                        scelto ? 'bg-blue-600 text-blue-100' : voto ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                      {SIGLE[d.getDay()]}
                      <span className={`text-base font-bold ${scelto ? 'text-white' : 'text-abisso'} ${eOggi && !scelto ? 'underline decoration-2 decoration-blue-600 underline-offset-4' : ''}`}>{d.getDate()}</span>
                      <span className="h-8 flex items-end" aria-hidden="true">
                        <span className={`w-1.5 rounded-full ${scelto ? 'bg-white' : voto ? 'bg-[#9cc0ff]' : 'bg-slate-200'}`}
                          style={{ height: voto ? Math.round(voto * 3.2) : 4 }} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </nav>
          )}
          {children}
        </div>
      </main>

      <nav className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md h-[68px] bg-white/95 backdrop-blur rounded-[26px] shadow-[0_10px_30px_rgba(10,26,47,0.14)] grid grid-flow-col auto-cols-fr items-center px-1.5 z-40"
        style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        {voci.map(([chiave, percorso, icona, nome]) => (
          <Link key={chiave} to={percorso} aria-current={attiva === chiave ? 'page' : undefined}
            className={`h-[60px] flex flex-col items-center justify-center gap-0.5 text-[11px] rounded-2xl transition ${
              attiva === chiave ? 'text-blue-600 font-extrabold' : 'text-slate-500 font-semibold'
            }`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor"
              strokeWidth={attiva === chiave ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">
              {ICONE[icona]}
            </svg>
            {nome}
          </Link>
        ))}
      </nav>
    </div>
  )
}
