import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { funzioniConsentite, IN_ARRIVO, mostraInArrivo } from '../lib/permessi'
import AppShell from '../components/AppShell'
import { percorsoAttivo, useRegole } from '../lib/regole'
import Icona from '../components/Icona'

// Funzioni raggruppate per argomento; ogni ruolo vede solo quelle consentite (gruppi vuoti nascosti)
const GRUPPI = [
  ['Allenamento', [
    ['/allenamenti', 'cronometro', 'Allenamenti'],
    ['/storico', 'libro', 'Storico'],
    ['/progressi', 'grafico', 'Progressi'],
    ['/record', 'medaglia', 'Record'],
  ]],
  ['Gare', [
    ['/gare', 'coppa', 'Gare'],
    ['/archivio', 'archivio', 'Archivio gare'],
    ['/video', 'video', 'Video'],
  ]],
  ['Squadra', [
    ['/presenze', 'spunta', 'Presenze'],
    ['/squadra', 'gruppo', 'Squadra'],
    ['/calendario', 'calendario', 'Calendario'],
    ['/punti', 'stella', 'Punti'],
    ['/impostazioni', 'regolazioni', 'Impostazioni'],
  ]],
]

export default function Funzioni() {
  const { ruolo } = useAuth()
  const { puo } = useRegole()
  const consentite = funzioniConsentite(ruolo)
  // sezioni in arrivo: in sviluppo/anteprima sempre, per gli utenti solo se accese dal Pannello
  const visibile = ([percorso]) => consentite.includes(percorso) && percorsoAttivo(percorso, ruolo, (k) => (IN_ARRIVO.includes(percorso) && mostraInArrivo) || puo(k))
  const gruppi = GRUPPI.map(([nome, voci]) => [nome, voci.filter(visibile)]).filter(([, voci]) => voci.length > 0)

  return (
    <AppShell titolo="Funzioni" attiva="funzioni">
      {gruppi.map(([nome, voci]) => (
        <section key={nome} className="mb-5">
          <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase px-1 mb-2">{nome}</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {voci.map(([percorso, icona, etichetta]) => (
              <Link key={percorso} to={percorso}
                className="bg-white rounded-3xl min-h-[100px] px-1 py-4 flex flex-col items-center justify-center gap-2 text-center text-[13px] font-semibold text-abisso shadow-[0_1px_2px_rgba(10,26,47,0.05)] active:scale-95 transition">
                <span className="w-11 h-11 rounded-2xl bg-schiuma text-blue-600 flex items-center justify-center">
                  <Icona nome={icona} />
                </span>
                {etichetta}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </AppShell>
  )
}
