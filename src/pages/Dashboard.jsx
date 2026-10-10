import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { coloreLavoro, dataLocale } from '../lib/lavori'
import { leggiCoda } from '../lib/codaOffline'
import { STATI } from '../lib/presenze'
import { puoModificare } from '../lib/permessi'
import PianoCard, { SenzaSquadra } from '../components/PianoCard'
import EditorAllenamento from '../components/EditorAllenamento'
import CardPunti from '../components/CardPunti'
import Difficolta from '../components/Difficolta'
import ModalitaVasca from '../components/ModalitaVasca'
import { metriPiano, minutiPiano, useMiaSquadra, useSettimanaSquadra } from '../lib/pianoSquadra'
import RichiesteSquadra from '../components/RichiesteSquadra'
import DomandeIngresso from '../components/DomandeIngresso'
import VistaOrgoglio from '../components/VistaOrgoglio'
import { useRegole } from '../lib/regole'
import { RecapOggi, RecapOggiFiglio } from '../components/RecapAtleta'
import GenitoriAtleta from '../components/GenitoriAtleta'

const COLORE_STATO = {
  presente: 'bg-green-100 text-green-700',
  assente: 'bg-red-100 text-red-700',
  non_penale: 'bg-amber-100 text-amber-700',
}

// "Oggi" per il giorno corrente, altrimenti "Lun 5"
const km = (metri) => (metri / 1000).toFixed(1).replace('.', ',')

const titoloGiorno = (g) => {
  if (g === dataLocale()) return 'Oggi'
  const d = new Date(g + 'T12:00:00')
  const gg = d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '')
  return gg.charAt(0).toUpperCase() + gg.slice(1) + ' ' + d.getDate()
}

// Onde d'acqua disegnate sul riquadro blu
function Onde() {
  return (
    <svg aria-hidden="true" viewBox="0 0 358 420" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full pointer-events-none">
      <g fill="none" stroke="#fff" strokeLinecap="round" opacity="0.16" strokeWidth="1.6">
        <path d="M-10 40 C 30 20, 60 70, 100 48 S 170 10, 210 44 S 290 80, 370 30" />
        <path d="M-10 92 C 40 70, 70 120, 120 96 S 190 60, 236 98 S 310 130, 370 86" />
        <path d="M-10 150 C 24 128, 80 172, 126 150 S 200 116, 250 152 S 320 184, 370 140" />
        <path d="M40 0 C 30 40, 70 70, 52 110 S 30 170, 64 210" />
        <path d="M150 0 C 140 36, 186 66, 166 104 S 140 160, 178 200" />
        <path d="M262 0 C 250 40, 296 64, 276 108 S 250 160, 290 196" />
      </g>
      <g fill="#fff" opacity="0.07"><circle cx="300" cy="40" r="90" /><circle cx="40" cy="380" r="120" /></g>
    </svg>
  )
}

// Il riquadro blu dell'allenamento del giorno: km, minuti, difficoltà e i due bottoni per l'acqua
function EroeAllenamento({ piano, oggi, squadra, vasca, registra, onVasca }) {
  const min = minutiPiano(piano.righe)
  return (
    <section className="relative overflow-hidden rounded-[32px] bg-blue-600 text-white p-5 mb-1">
      <Onde />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-[0.12em] text-blue-100 uppercase">{oggi ? 'Allenamento di oggi' : 'Allenamento del coach'}</span>
          {squadra && <span className="text-xs font-bold bg-white/15 rounded-full px-2.5 py-1">{squadra}</span>}
        </div>
        {piano.titolo && <p className="text-[15px] font-semibold text-blue-100 mt-2 first-letter:uppercase">{piano.titolo}</p>}
        <div className="flex items-end gap-5 mt-3.5 mb-4">
          <p className="font-display text-[64px] font-extrabold leading-[0.88] tracking-[-0.05em]">
            {(metriPiano(piano.righe) / 1000).toFixed(1).replace('.', ',')}<span className="text-2xl ml-1">km</span>
          </p>
          {min > 0 && <p className="font-display text-3xl font-bold pb-1">{min}<span className="text-base"> min</span></p>}
        </div>
        <Difficolta righe={piano.righe} suBlu />
        {(vasca || registra) && (
          <div className={`grid gap-2 mt-3 ${vasca && registra ? 'grid-cols-[minmax(0,1fr)_56px]' : 'grid-cols-1'}`}>
            {vasca && <button onClick={onVasca} className="h-14 rounded-[18px] bg-white text-blue-600 font-display text-lg font-extrabold flex items-center justify-center gap-2.5">
              <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
              Inizia in vasca
            </button>}
            {registra && <Link to="/allenamenti" aria-label="Registra i tempi" className="h-14 rounded-[18px] bg-white/15 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2.5h5" /></svg>
            </Link>}
          </div>
        )}
      </div>
    </section>
  )
}

// Home: i giorni e, sotto, gli allenamenti del giorno scelto
function HomeAtleta() {
  const { user, ruolo, profile, adminReale } = useAuth()
  // ?giorno=2026-10-12 arriva toccando una notifica "Nuovo allenamento"
  const [giorno, setGiorno] = useState(() => {
    const g = new URLSearchParams(window.location.search).get('giorno')
    return /^\d{4}-\d{2}-\d{2}$/.test(g || '') ? g : dataLocale()
  })
  const [righe, setRighe] = useState([])
  const [presenza, setPresenza] = useState(null)
  const [piano, setPiano] = useState(null)
  const [vasca, setVasca] = useState(false)
  const { squadra } = useMiaSquadra()
  const squadraNome = squadra?.nome
  const settimana = useSettimanaSquadra(profile?.squadra_id, giorno, user.id)
  const { puo } = useRegole()
  const registra = puoModificare(ruolo) && puo('a_tempi')
  // sabato e domenica al posto della riga "Questa settimana" c'è il riepilogo completo
  const fineSettimana = [0, 6].includes(new Date(giorno + 'T12:00:00').getDay()) && giorno <= dataLocale()

  // Allenamento pubblicato dal coach per questo giorno, della mia squadra
  // (il filtro serve all'admin, che per i permessi vedrebbe i piani di tutte le squadre)
  useEffect(() => {
    let attivo = true
    if (!profile?.squadra_id) {
      setPiano(null)
      return
    }
    supabase.from('allenamenti_squadra').select('*').eq('data', giorno).eq('squadra_id', profile.squadra_id).limit(1)
      .then(({ data }) => { if (attivo) setPiano(data?.[0] || null) })
    return () => { attivo = false }
  }, [giorno, profile?.squadra_id])

  useEffect(() => {
    let attivo = true
    async function carica() {
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase.from('allenamenti').select('*').eq('atleta_id', user.id).eq('data_allenamento', giorno).order('created_at'),
        supabase.from('presenze').select('stato').eq('atleta_id', user.id).eq('data', giorno).maybeSingle(),
      ])
      if (!attivo) return
      const inCoda = leggiCoda('allenamenti', user.id).filter((r) => r.data_allenamento === giorno)
      setRighe([...(a || []), ...inCoda])
      setPresenza(p?.stato || null)
    }
    carica()
    return () => { attivo = false }
  }, [giorno, user.id])

  if (ruolo === 'ospite') {
    return (
      <AppShell titolo="Home" attiva="home">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-sm">
          <p className="text-4xl mb-2">👋</p>
          <p className="font-bold mb-1">Benvenuto in SwimLine4</p>
          <p className="text-sm text-gray-500">Da ospite puoi vedere la squadra e il calendario gare.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell titolo={titoloGiorno(giorno)} attiva="home" giorno={giorno} onGiorno={setGiorno} voti={settimana.voti}>
      {presenza && (
        <div className="flex justify-end mb-2 px-1">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${COLORE_STATO[presenza]}`}>{STATI[presenza]}</span>
        </div>
      )}

      {ruolo === 'coach_in_attesa' && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-3">
          <p className="font-bold text-amber-800 mb-1">⏳ Account coach in attesa</p>
          <p className="text-sm text-amber-800">
            L'amministratore deve approvare il tuo profilo coach. Appena lo approva nasce la tua squadra
            e trovi qui tutte le funzioni da coach. Intanto puoi usare l'app come atleta.
          </p>
        </div>
      )}

      {(adminReale || ['atleta', 'genitore'].includes(profile?.role)) && <RichiesteSquadra />}

      {ruolo === 'genitore' && puo('g_orgoglio') && <VistaOrgoglio />}
      {['atleta', 'admin'].includes(ruolo) && <GenitoriAtleta soloInAttesa />}

      {ruolo === 'genitore' && !puo('g_allenamento') ? null : piano ? (
        <>
          <EroeAllenamento piano={piano} oggi={giorno === dataLocale()} squadra={squadraNome}
            vasca={puoModificare(ruolo) && puo('a_vasca')} registra={registra} onVasca={() => setVasca(true)} />
          <h2 className="font-display text-xl font-extrabold mt-5 mb-2 mx-1 flex items-baseline justify-between">
            Il programma
            <span className="font-sans text-[13px] font-semibold text-slate-500 tracking-normal">{piano.righe.length} lavori</span>
          </h2>
          <PianoCard piano={piano} senzaTesta />
        </>
      ) : (
        <div className="bg-white rounded-3xl p-7 text-center text-slate-500 mb-3">
          <p className="font-display text-xl font-extrabold text-abisso mb-1">Nessun allenamento</p>
          <p className="text-sm">Il coach non ha pubblicato l'allenamento di questo giorno. Appena lo fa, lo trovi qui.</p>
        </div>
      )}
      {vasca && piano && <ModalitaVasca righe={piano.righe} onChiudi={() => setVasca(false)} />}

      {ruolo === 'genitore'
        ? <RecapOggiFiglio squadraId={profile?.squadra_id} giorno={giorno} />
        : <RecapOggi atletaId={user.id} squadraId={profile?.squadra_id} giorno={giorno} />}

      {ruolo !== 'genitore' && settimana.giorni > 0 && !fineSettimana && (
        <div className="bg-white rounded-3xl p-4 mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Questa settimana</p>
            <p className="font-display text-3xl font-extrabold mt-1">{km(settimana.fatti)}<span className="text-base"> km fatti</span></p>
          </div>
          <p className="text-[13px] text-slate-500 text-right">
            su {km(settimana.metri)} km in programma<br />
            presente {settimana.presenti} su {settimana.giorni}
          </p>
        </div>
      )}

      {ruolo !== 'genitore' && puo('a_punti') && <CardPunti />}

      {righe.length > 0 && (
        <div className="bg-white rounded-3xl p-5 mb-3">
          <p className="font-display font-extrabold text-lg mb-1">I tuoi tempi</p>
          {righe.map((r, i) => (
            <div key={r.id} className={`py-3 ${i ? 'border-t border-gray-100' : ''}`}>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
              <span className="text-sm text-gray-600 ml-2">
                {r.ripetizioni ? `${r.ripetizioni}×` : ''}{r.distanza} m {r.stile || ''}
              </span>
              {r.passaggi?.length > 0 ? (
                <p className="text-xs text-gray-500 mt-1">{r.passaggi.map((p) => p || '–').join(' · ')}</p>
              ) : (
                r.tempo_totale && <p className="text-xs text-gray-500 mt-1">{r.tempo_totale}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {registra && (
      <Link to="/allenamenti"
        className="block text-center font-display font-extrabold text-blue-600 bg-schiuma rounded-[18px] py-4 active:scale-[0.98] transition">
        Registra i tuoi tempi
      </Link>
      )}
    </AppShell>
  )
}

// Home del coach: l'allenamento della giornata per la squadra
function HomeCoach() {
  const [giorno, setGiorno] = useState(dataLocale())
  const { squadra, pronto } = useMiaSquadra()
  const settimana = useSettimanaSquadra(squadra?.id, giorno)
  return (
    <AppShell titolo={titoloGiorno(giorno)} attiva="home" giorno={giorno} onGiorno={setGiorno} voti={settimana.voti}>
      {!pronto ? <p className="text-center text-gray-500 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : <><DomandeIngresso squadra={squadra} /><EditorAllenamento squadra={squadra} giorno={giorno} /></>}
    </AppShell>
  )
}

export default function Dashboard() {
  const { ruolo } = useAuth()
  return ruolo === 'coach' ? <HomeCoach /> : <HomeAtleta />
}
