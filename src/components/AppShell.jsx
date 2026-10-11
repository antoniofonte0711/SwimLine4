import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarioFoglio } from './SelettoreData'
import Icona from './Icona'
import { useNonLette } from '../lib/notificheApp'
import { useAuth } from '../context/AuthContext'
import { dataLocale } from '../lib/lavori'
import { nomeRuolo } from '../lib/permessi'

const VOCI = [
  ['home', '/dashboard', 'onde', 'Oggi'],
  ['riepilogo', '/riepilogo', 'grafico', 'Riepilogo'],
  ['funzioni', '/funzioni', 'griglia', 'Funzioni'],
  ['profilo', '/profilo', 'persona', 'Profilo'],
]
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
  const nonLette = useNonLette()
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
    <div className="min-h-screen bg-bordo lg:pl-[232px]">
      {staVedendoCome && (
        <div className="sticky top-0 z-50 bg-amber-400 text-black text-sm px-4 py-2 flex items-center justify-between gap-3 pt-[max(env(safe-area-inset-top),0.5rem)]">
          <span className="flex items-center gap-1.5">
            <Icona nome="occhio" className="w-4 h-4 shrink-0" />
            <span>Stai vedendo l'app come: <b>{nomeRuolo(ruolo)}</b>
              {squadraGestita && <> · squadra <b>{squadraGestita.nome}</b></>}</span>
          </span>
          <button onClick={() => cambiaVista('admin')} className="font-bold bg-black text-white rounded-full px-3 min-h-[44px]">Torna admin</button>
        </div>
      )}
      {/* Intestazione uguale su tutte le pagine: logo, titolo, (data), campanella e avatar */}
      <header className="px-4 lg:px-10 pt-[max(env(safe-area-inset-top),1rem)] lg:pt-8 pb-2">
        <div className="max-w-md md:max-w-2xl lg:max-w-[1120px] mx-auto flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-slate-500 lg:hidden">Swim<span className="text-blue-600">Line4</span></p>
            <h1 className="font-display text-[30px] lg:text-[40px] font-extrabold leading-tight text-abisso truncate">{titolo}</h1>
            {onGiorno && <p className="text-sm lg:text-[15px] text-slate-500 first-letter:uppercase">{dataTesto}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ruolo !== 'ospite' && (
              <Link to="/notifiche" aria-label={nonLette ? `Notifiche, ${nonLette} nuove` : 'Notifiche'}
                className="cliccabile relative w-11 h-11 rounded-full bg-white border border-linea text-abisso flex items-center justify-center shadow-card">
                <Icona nome="campanella" />
                {nonLette > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-corsia text-white text-[11px] font-extrabold flex items-center justify-center">
                    {nonLette > 9 ? '9+' : nonLette}
                  </span>
                )}
              </Link>
            )}
            <Link to="/profilo" aria-label="Profilo"
              className="cliccabile w-11 h-11 rounded-full bg-abisso text-white font-display font-bold flex items-center justify-center">
              {iniziale}
            </Link>
          </div>
        </div>
      </header>

      {calAperto && <CalendarioFoglio valore={giorno} onScegli={onGiorno} onChiudi={() => setCalAperto(false)} />}

      {/* in fondo spazio per la barra flottante (altezza + margine + zona sicura), che così non copre nulla */}
      <main className="px-4 lg:px-10 pt-2 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div className="max-w-md md:max-w-2xl lg:max-w-[1120px] mx-auto">
          {indietro && (
            <button type="button" onClick={tornaIndietro}
              className="cliccabile inline-flex items-center min-h-[44px] mb-4 text-sm font-semibold text-blue-600 bg-schiuma rounded-full px-4">
              ← Indietro
            </button>
          )}

          {onGiorno && (
            <nav aria-label="Settimana" className="bg-white rounded-3xl px-1 pt-2 pb-3 mb-4 shadow-card">
              <div className="flex items-center justify-between px-1 mb-1">
                <button onClick={() => sposta(-7)} aria-label="Settimana precedente" className="cliccabile w-11 h-11 rounded-full text-slate-500 text-lg font-bold hover:bg-bordo">‹</button>
                <button onClick={() => setCalAperto(true)} className="cliccabile min-h-[44px] text-xs font-bold text-slate-500 capitalize px-3 rounded-full hover:bg-bordo">
                  {centro.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })} ▾
                </button>
                <button onClick={() => sposta(7)} aria-label="Settimana successiva" className="cliccabile w-11 h-11 rounded-full text-slate-500 text-lg font-bold hover:bg-bordo">›</button>
              </div>
              <div className="grid grid-cols-7">
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

      {/* Telefono e tablet: barra flottante in basso */}
      <nav aria-label="Navigazione" className="lg:hidden fixed left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md h-[68px] bg-white/95 backdrop-blur rounded-barra shadow-flottante grid grid-flow-col auto-cols-fr items-center px-1.5 z-40"
        style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        {voci.map(([chiave, percorso, icona, nome]) => (
          <Link key={chiave} to={percorso} aria-current={attiva === chiave ? 'page' : undefined}
            className={`cliccabile h-[60px] flex flex-col items-center justify-center gap-0.5 text-[11px] rounded-2xl ${
              attiva === chiave ? 'text-blue-600 font-extrabold' : 'text-slate-500 font-semibold'
            }`}>
            <Icona nome={icona} spessore={attiva === chiave ? 2.2 : 1.9} />
            {nome}
          </Link>
        ))}
      </nav>

      {/* Computer: barra laterale fissa, non copre mai i contenuti */}
      <nav aria-label="Navigazione" className="hidden lg:flex fixed inset-y-0 left-0 w-[232px] flex-col gap-1 px-4 py-8 bg-white border-r border-linea z-40">
        <p className="font-display text-[22px] font-extrabold text-abisso px-3 mb-6">Swim<span className="text-blue-600">Line4</span></p>
        {voci.map(([chiave, percorso, icona, nome]) => (
          <Link key={chiave} to={percorso} aria-current={attiva === chiave ? 'page' : undefined}
            className={`cliccabile min-h-[48px] px-3 rounded-campo flex items-center gap-3 text-[15px] ${
              attiva === chiave ? 'bg-schiuma text-blue-600 font-bold' : 'text-slate-500 font-semibold hover:bg-bordo'
            }`}>
            <Icona nome={icona} spessore={attiva === chiave ? 2.2 : 1.9} />
            {nome}
          </Link>
        ))}
      </nav>
    </div>
  )
}
