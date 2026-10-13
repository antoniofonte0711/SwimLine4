import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { funzioniConsentite, IN_ARRIVO, mostraInArrivo } from '../lib/permessi'
import AppShell from '../components/AppShell'
import { percorsoAttivo, useRegole } from '../lib/regole'
import Icona from '../components/Icona'

// Funzioni raggruppate per argomento; ogni ruolo vede solo quelle consentite (gruppi vuoti nascosti).
// Le principali (con descrizione) diventano card grandi, le altre card compatte.
const GRUPPI = [
  ['Allenamento', [
    ['/allenamenti', 'cronometro', 'Allenamenti', 'Prepara il lavoro e segna i risultati'],
    ['/storico', 'libro', 'Storico'],
    ['/progressi', 'grafico', 'Progressi'],
    ['/previsioni', 'futuro', 'Previsioni'],
    ['/record', 'medaglia', 'Record'],
    ['/lavori', 'griglia', 'Tipi di lavoro'],
  ]],
  ['Gare', [
    ['/gare', 'coppa', 'Gare', 'Prossime gare e risultati'],
    ['/archivio', 'archivio', 'Archivio gare'],
    ['/video', 'video', 'Video'],
  ]],
  ['Squadra', [
    ['/presenze', 'spunta', 'Presenze'],
    ['/squadra', 'gruppo', 'Squadra'],
    ['/calendario', 'calendario', 'Calendario'],
    ['/punti', 'stella', 'Punti'],
  ]],
]
// Coach: Oggi, Presenze e Atleti sono nella barra in basso. Qui ("Altro") tutto il resto,
// ogni voce con una riga che dice a cosa serve (chi non conosce l'app capisce senza aprire la guida)
const GRUPPI_COACH = [
  ['La squadra', [
    ['/riepilogo', 'onde', 'La settimana', 'Km, presenze e allenamenti degli ultimi giorni'],
    ['/gare', 'coppa', 'Gare', 'Gare in programma, iscritti e risultati'],
    ['/calendario', 'calendario', 'Calendario', 'Il mese intero: allenamenti, gare e presenze'],
  ]],
  ['Come migliorano gli atleti', [
    ['/progressi', 'grafico', 'Progressi', 'Il grafico dei tempi di ogni atleta'],
    ['/previsioni', 'futuro', 'Previsioni', 'Che tempi può fare a fine stagione'],
    ['/record', 'medaglia', 'Record', 'I migliori tempi della squadra'],
    ['/punti', 'stella', 'Punti e premi', 'Premi per motivare gli atleti'],
  ]],
  ['Impostazioni', [
    ['/impostazioni', 'regolazioni', 'Persone della squadra', 'Aggiungi o togli atleti e genitori'],
    ['/lavori', 'griglia', 'Tipi di lavoro', 'Le sigle A1, A2, B1… e quanto stancano'],
  ]],
]
const SEMPRE_COACH = ['/riepilogo', '/impostazioni']
// Atleta: Oggi, I miei tempi e Gare sono nella barra in basso; qui il resto, con la riga che dice a cosa serve
const GRUPPI_ATLETA = [
  ['La squadra', [
    ['/riepilogo', 'onde', 'La settimana', 'Km fatti e presenze, settimana per settimana'],
    ['/calendario', 'calendario', 'Calendario', 'Il mese: allenamenti, gare e presenze'],
    ['/squadra', 'gruppo', 'Compagni', 'La tua squadra e le loro gare'],
    ['/punti', 'stella', 'Punti e premi', 'Come si guadagnano e i premi da aprire'],
  ]],
  ['Allenamento', [
    ['/allenamenti', 'cronometro', 'Scrivi i tempi', 'I tempi di oggi e i lavori fuori programma'],
  ]],
]
// Fuori dai gruppi: voce discreta in fondo alla pagina
const IMPOSTAZIONI = '/impostazioni'

function CardPrincipale({ percorso, icona, etichetta, descrizione }) {
  return (
    <Link to={percorso}
      className="cliccabile bg-white rounded-3xl p-4 flex items-center gap-4 text-abisso shadow-card">
      <span className="w-12 h-12 shrink-0 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
        <Icona nome={icona} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[17px] font-bold">{etichetta}</span>
        <span className="block text-[13px] text-slate-500">{descrizione}</span>
      </span>
      <Icona nome="freccia" className="w-5 h-5 text-slate-500 shrink-0" />
    </Link>
  )
}

function CardCompatta({ percorso, icona, etichetta, larga }) {
  return (
    <Link to={percorso}
      className={`cliccabile bg-white rounded-3xl min-h-[56px] px-3 py-2 flex items-center gap-3 text-[14px] font-semibold text-abisso shadow-card ${larga ? 'col-span-2' : ''}`}>
      <span className="w-9 h-9 shrink-0 rounded-campo bg-schiuma text-blue-600 flex items-center justify-center">
        <Icona nome={icona} className="w-5 h-5" />
      </span>
      {etichetta}
    </Link>
  )
}

export default function Funzioni() {
  const { ruolo } = useAuth()
  const { puo } = useRegole()
  const consentite = funzioniConsentite(ruolo)
  // sezioni in arrivo: in sviluppo/anteprima sempre, per gli utenti solo se accese dal Pannello
  const visibile = ([percorso]) => consentite.includes(percorso) && percorsoAttivo(percorso, ruolo, (k) => (IN_ARRIVO.includes(percorso) && mostraInArrivo) || puo(k))
  const coach = ruolo === 'coach'
  const atleta = ruolo === 'atleta'
  const gruppi = (coach ? GRUPPI_COACH : atleta ? GRUPPI_ATLETA : GRUPPI)
    .map(([nome, voci]) => [nome, voci.filter((v) => (coach && SEMPRE_COACH.includes(v[0])) || (atleta && v[0] === '/riepilogo') || visibile(v))])
    .filter(([, voci]) => voci.length > 0)
  // il coach ha già "Persone della squadra" nelle Impostazioni qui sopra
  const impostazioni = !coach && visibile([IMPOSTAZIONI])

  return (
    <AppShell titolo={coach || atleta ? 'Altro' : 'Funzioni'} attiva="funzioni">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-6 lg:items-start">
        {gruppi.map(([nome, voci]) => {
          const principali = voci.filter((v) => v[3])
          const altre = voci.filter((v) => !v[3])
          return (
            <section key={nome} className="mb-6">
              <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2">{nome}</h2>
              <div className="flex flex-col gap-2">
                {principali.map(([percorso, icona, etichetta, descrizione]) => (
                  <CardPrincipale key={percorso} percorso={percorso} icona={icona} etichetta={etichetta} descrizione={descrizione} />
                ))}
                {altre.length > 0 && (
                  // due colonne sempre piene: se sono dispari, l'ultima prende tutta la riga
                  <div className="grid grid-cols-2 gap-2">
                    {altre.map(([percorso, icona, etichetta], i) => (
                      <CardCompatta key={percorso} percorso={percorso} icona={icona} etichetta={etichetta}
                        larga={altre.length % 2 === 1 && i === altre.length - 1} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>

      <Link to="/guida" className="cliccabile flex items-center justify-center gap-2 min-h-[48px] mb-3 text-sm font-bold text-blue-600 bg-schiuma rounded-2xl">
        <Icona nome="libro" className="w-5 h-5" />
        Come si usa l'app? Apri la guida
      </Link>

      {impostazioni && (
        <Link to={IMPOSTAZIONI}
          className="cliccabile flex items-center gap-3 min-h-[48px] px-1 border-t border-linea text-[14px] font-semibold text-slate-500 hover:text-abisso">
          <Icona nome="regolazioni" className="w-5 h-5" />
          <span className="flex-1">Impostazioni della squadra</span>
          <Icona nome="freccia" className="w-5 h-5" />
        </Link>
      )}
    </AppShell>
  )
}
