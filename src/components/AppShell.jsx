import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarioFoglio } from './SelettoreData'
import { useAuth } from '../context/AuthContext'
import { dataLocale } from '../lib/lavori'
import { nomeRuolo } from '../lib/permessi'

const VOCI = [
  ['home', '/dashboard', '🏠', 'Home'],
  ['riepilogo', '/riepilogo', '📊', 'Riepilogo'],
  ['funzioni', '/funzioni', '🔲', 'Funzioni'],
  ['profilo', '/profilo', '👤', 'Profilo'],
]
const LETTERE = ['D', 'L', 'M', 'M', 'G', 'V', 'S']

// Struttura comune di tutte le schermate: testata blu, area contenuti arrotondata e barra in basso.
// attiva: 'home' | 'riepilogo' | 'funzioni' | 'profilo'
// indietro: percorso a cui torna il tasto "Indietro" (facoltativo)
// giorno + onGiorno: se presenti, mostrano la striscia dei giorni
export default function AppShell({ titolo, attiva, indietro, giorno, onGiorno, children }) {
  const { profile, ruolo, staVedendoCome, cambiaVista } = useAuth()
  const voci = VOCI.filter(([chiave]) => !(ruolo === 'ospite' && chiave === 'riepilogo'))
  const iniziale = (profile?.nome || 'A').charAt(0).toUpperCase()
  const [calAperto, setCalAperto] = useState(false)
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
          <span>👁 Stai vedendo l'app come: <b>{nomeRuolo(ruolo)}</b></span>
          <button onClick={() => cambiaVista('admin')} className="font-bold bg-black text-white rounded-full px-3 py-1">Torna admin</button>
        </div>
      )}
      <header className="bg-blue-600 text-white px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-10">
        <div className="max-w-md mx-auto">
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
        <div className="max-w-md mx-auto">
          {indietro && (
            <Link to={indietro}
              className="inline-block mb-4 text-sm font-semibold text-blue-600 bg-blue-50 rounded-full px-4 py-2">
              ← Indietro
            </Link>
          )}
          {children}
        </div>
      </main>

      <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md bg-white border border-gray-200 rounded-full shadow-xl flex p-1.5 mb-[env(safe-area-inset-bottom)]">
        {voci.map(([chiave, percorso, icona, nome]) => (
          <Link key={chiave} to={percorso}
            className={`flex-1 text-center text-[11px] py-2 rounded-full transition ${
              attiva === chiave ? 'bg-blue-600 text-white' : 'text-gray-500'
            }`}>
            <span className="block text-xl leading-none">{icona}</span>
            {nome}
          </Link>
        ))}
      </nav>
    </div>
  )
}
