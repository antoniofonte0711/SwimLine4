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
import Icona from '../components/Icona'
import { ProponiFuoriPiano, ProposteFuoriPiano } from '../components/FuoriPiano'

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
function EroeAllenamento({ piano, oggi, giorno, squadra, vasca, registra, onVasca }) {
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
          <div className="grid grid-cols-1 gap-2 mt-3">
            {vasca && <button onClick={onVasca} className="h-14 rounded-[18px] bg-white text-blue-600 font-display text-lg font-extrabold flex items-center justify-center gap-2.5">
              <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
              Inizia in vasca
            </button>}
            {registra && <Link to={`/allenamenti?data=${giorno}`} className="h-14 rounded-[18px] bg-white/15 font-display text-lg font-extrabold flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9.5 2.5h5" /></svg>
              Scrivi i tempi
            </Link>}
          </div>
        )}
      </div>
    </section>
  )
}

// Bottone primario: pieno, blu, largo quanto il testo (al massimo 320px)
function BottoneRegistra({ giorno }) {
  return (
    <Link to={`/allenamenti?data=${giorno}`}
      className="cliccabile inline-flex items-center justify-center gap-2 w-full max-w-[320px] min-h-[48px] px-6 font-display font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-campo">
      <Icona nome="cronometro" className="w-5 h-5" />
      Scrivi i tuoi tempi
    </Link>
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

  return (
    <AppShell titolo={titoloGiorno(giorno)} attiva="home" giorno={giorno} onGiorno={setGiorno} voti={settimana.voti}>
      {presenza && (
        <div className="flex justify-end mb-2 px-1">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${COLORE_STATO[presenza]}`}>{STATI[presenza]}</span>
        </div>
      )}

      {ruolo === 'coach_in_attesa' && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-3">
          <p className="font-bold text-amber-800 mb-1 flex items-center gap-2"><Icona nome="clessidra" className="w-5 h-5" />Account coach in attesa</p>
          <p className="text-sm text-amber-800">
            L'amministratore deve approvare il tuo profilo coach. Appena lo approva nasce la tua squadra
            e trovi qui tutte le funzioni da coach. Intanto puoi usare l'app come atleta.
          </p>
        </div>
      )}

      {(adminReale || ['atleta', 'genitore'].includes(profile?.role)) && <RichiesteSquadra />}

      {ruolo === 'genitore' && puo('g_orgoglio') && <VistaOrgoglio />}
      {['atleta', 'admin'].includes(ruolo) && <GenitoriAtleta soloInAttesa />}

      {/* Computer: allenamento a sinistra, riepilogo e azioni a destra. Telefono: una colonna, stesso ordine */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6 lg:items-start">
      <div>
      {ruolo === 'genitore' && !puo('g_allenamento') ? null : piano ? (
        <>
          <EroeAllenamento piano={piano} oggi={giorno === dataLocale()} giorno={giorno} squadra={squadraNome}
            vasca={puoModificare(ruolo) && puo('a_vasca')} registra={registra} onVasca={() => setVasca(true)} />
          <h2 className="font-display text-xl font-extrabold mt-5 mb-2 flex items-baseline justify-between">
            Il programma
            <span className="font-sans text-[13px] font-semibold text-slate-500 tracking-normal">{piano.righe.length} lavori</span>
          </h2>
          <PianoCard piano={piano} senzaTesta />
        </>
      ) : (
        <div className="bg-white rounded-3xl p-6 text-slate-500 mb-3 flex flex-col items-center text-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-schiuma text-blue-600 flex items-center justify-center">
            <Icona nome="onde" className="w-7 h-7" />
          </span>
          <div>
            <p className="font-display text-xl font-extrabold text-abisso mb-1">Nessun allenamento</p>
            <p className="text-sm">Il coach non ha pubblicato l'allenamento di questo giorno. Appena lo fa, lo trovi qui.</p>
          </div>
          {registra && <BottoneRegistra giorno={giorno} />}
        </div>
      )}
      {vasca && piano && <ModalitaVasca righe={piano.righe} onChiudi={() => setVasca(false)} />}
      </div>

      <div className="mt-3 lg:mt-0">
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

      {/* l'atleta trova punti e premi in "I miei tempi" */}
      {ruolo === 'admin' && puo('a_punti') && <CardPunti />}

      {righe.length > 0 && (
        <div className="bg-white rounded-3xl p-5 mb-3">
          <p className="font-display font-extrabold text-lg mb-1">I tuoi tempi</p>
          {righe.map((r, i) => (
            <div key={r.id} className={`py-3 ${i ? 'border-t border-gray-100' : ''}`}>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
              <span className="text-sm text-slate-600 ml-2">
                {r.ripetizioni ? `${r.ripetizioni}×` : ''}{r.distanza} m {r.stile || ''}
              </span>
              {r.passaggi?.length > 0 ? (
                <p className="text-xs text-slate-500 mt-1">{r.passaggi.map((p) => p || '–').join(' · ')}</p>
              ) : (
                r.tempo_totale && <p className="text-xs text-slate-500 mt-1">{r.commento === 'Media' ? 'Media ' : ''}{r.tempo_totale}</p>
              )}
            </div>
          ))}
        </div>
      )}


      {/* nuotato da solo, fuori dal piano: lo propone al coach */}
      {registra && profile?.squadra_id && ruolo !== 'genitore' && (
        <div className="mt-3"><ProponiFuoriPiano atletaId={user.id} giorno={giorno} /></div>
      )}
      </div>
      </div>
    </AppShell>
  )
}

// Una riga del riquadro "Da fare": icona, cosa fare e perché; tutta la riga porta dove si fa
function RigaDaFare({ to, icona, titolo, sotto, urgente }) {
  return (
    <li className="border-t border-slate-100 first:border-t-0">
      <Link to={to} className="cliccabile flex items-center gap-3 min-h-[64px] py-2">
        <span className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center ${urgente ? 'bg-red-50 text-red-600' : 'bg-schiuma text-blue-600'}`}>
          <Icona nome={icona} className="w-[22px] h-[22px]" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold text-abisso">{titolo}</span>
          <span className={`block text-[13px] truncate ${urgente ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>{sotto}</span>
        </span>
        <Icona nome="freccia" className="w-5 h-5 text-slate-400 shrink-0" />
      </Link>
    </li>
  )
}

const nomeBreve = (a) => `${a.nome}${a.cognome ? ' ' + a.cognome.charAt(0) + '.' : ''}`
const giornoBreve = (d) => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })

// La giornata del coach: com'è messo l'allenamento, presenze e atleti. L'editor si apre solo quando serve.
function OggiCoach({ squadra, giorno, settimana, onScrivi, avviso }) {
  const [piano, setPiano] = useState(undefined)
  const [atleti, setAtleti] = useState([])
  const [segnati, setSegnati] = useState(0)
  const [certificati, setCertificati] = useState([]) // [{ nome, scadenza }] scaduti o in scadenza entro 30 giorni
  const [gara, setGara] = useState(null)             // { nome, data, atleti } la prossima gara della squadra
  const oggi = giorno === dataLocale()

  useEffect(() => {
    let attivo = true
    setPiano(undefined)
    async function carica() {
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id).eq('data', giorno).maybeSingle(),
        supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id).is('eliminato_il', null),
      ])
      const ids = (a || []).map((x) => x.id)
      const fra30 = new Date()
      fra30.setDate(fra30.getDate() + 30)
      const [{ data: pr }, { data: cert }, { data: gare }] = ids.length
        ? await Promise.all([
          supabase.from('presenze').select('atleta_id').in('atleta_id', ids).eq('data', giorno),
          supabase.from('atleta_riferimenti').select('atleta_id, certificato_scadenza').in('atleta_id', ids)
            .not('certificato_scadenza', 'is', null).lte('certificato_scadenza', dataLocale(fra30)),
          supabase.from('gare').select('nome_gara, data_gara, atleta_id').in('atleta_id', ids)
            .gte('data_gara', dataLocale()).order('data_gara').limit(200),
        ])
        : [{ data: [] }, { data: [] }, { data: [] }]
      if (!attivo) return
      const perId = Object.fromEntries((a || []).map((x) => [x.id, x]))
      setPiano(p || null)
      setAtleti(ids)
      setSegnati((pr || []).length)
      setCertificati((cert || []).filter((c) => perId[c.atleta_id])
        .map((c) => ({ nome: nomeBreve(perId[c.atleta_id]), scadenza: c.certificato_scadenza }))
        .sort((x, y) => x.scadenza.localeCompare(y.scadenza)))
      const prima = (gare || [])[0]
      setGara(prima ? {
        nome: prima.nome_gara, data: prima.data_gara,
        atleti: new Set(gare.filter((g) => g.data_gara === prima.data_gara && g.nome_gara === prima.nome_gara).map((g) => g.atleta_id)).size,
      } : null)
    }
    carica()
    return () => { attivo = false }
  }, [squadra.id, giorno])

  if (piano === undefined) return <p className="text-center text-slate-500 py-8">Carico…</p>
  const stato = !piano ? null : !piano.pubblicato ? 'Bozza' : piano.visibilita === 'coach' ? 'Solo coach' : 'Pubblicato'
  const min = piano ? minutiPiano(piano.righe || []) : 0
  // Le cose in sospeso, in ordine di urgenza
  const passato = giorno <= dataLocale()
  const scaduti = certificati.filter((c) => c.scadenza < dataLocale())
  const daFare = [
    passato && atleti.length > 0 && segnati < atleti.length && {
      to: `/presenze?giorno=${giorno}`, icona: 'spunta', titolo: 'Segna le presenze',
      sotto: segnati === 0 ? `Nessuno segnato su ${atleti.length}` : `${segnati} su ${atleti.length} segnati`,
    },
    piano?.pubblicato && passato && {
      to: `/risultati?data=${giorno}`, icona: 'cronometro', titolo: 'Scrivi i tempi degli atleti', sotto: 'Dell\'allenamento di questo giorno',
    },
    certificati.length > 0 && {
      to: '/squadra', icona: 'clessidra', urgente: scaduti.length > 0,
      titolo: scaduti.length ? 'Certificato medico scaduto' : 'Certificato medico in scadenza',
      sotto: certificati.map((c) => `${c.nome} ${c.scadenza < dataLocale() ? 'scaduto' : 'il ' + giornoBreve(c.scadenza)}`).join(' · '),
    },
    gara && {
      to: '/gare', icona: 'coppa', titolo: `Prossima gara: ${giornoBreve(gara.data)}`,
      sotto: `${gara.nome} · ${gara.atleti} ${gara.atleti === 1 ? 'atleta' : 'atleti'}`,
    },
  ].filter(Boolean)

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6 lg:items-start">
      <div>
        {avviso && <p role="status" className="text-sm font-semibold text-green-700 bg-green-50 rounded-2xl px-4 py-3 mb-3">{avviso}</p>}
        {piano ? (
          <section className="relative overflow-hidden rounded-[32px] bg-blue-600 text-white p-5 mb-3">
            <Onde />
            <div className="relative">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-[0.12em] text-blue-100 uppercase">{oggi ? 'Allenamento di oggi' : 'Allenamento'}</span>
                <span className="text-xs font-bold bg-white/15 rounded-full px-2.5 py-1">{stato}</span>
              </div>
              {piano.titolo && <p className="text-[15px] font-semibold text-blue-100 mt-2 first-letter:uppercase">{piano.titolo}</p>}
              <div className="flex items-end gap-5 mt-3.5 mb-4">
                <p className="font-display text-[64px] font-extrabold leading-[0.88] tracking-[-0.05em]">
                  {km(metriPiano(piano.righe || []))}<span className="text-2xl ml-1">km</span>
                </p>
                {min > 0 && <p className="font-display text-3xl font-bold pb-1">{min}<span className="text-base"> min</span></p>}
              </div>
              <Difficolta righe={piano.righe || []} suBlu />
              <button onClick={onScrivi} className="cliccabile w-full h-14 mt-3 rounded-[18px] bg-white text-blue-600 font-display text-lg font-extrabold">
                {piano.pubblicato ? 'Modifica' : 'Continua e pubblica'}
              </button>
            </div>
          </section>
        ) : (
          <div className="bg-white rounded-3xl p-6 mb-3 flex flex-col items-center text-center gap-3 shadow-card">
            <span className="w-12 h-12 rounded-2xl bg-schiuma text-blue-600 flex items-center justify-center">
              <Icona nome="onde" className="w-7 h-7" />
            </span>
            <div>
              <p className="font-display text-xl font-extrabold text-abisso mb-1">{oggi ? 'Nessun allenamento oggi' : 'Nessun allenamento'}</p>
              <p className="text-sm text-slate-500">Scrivilo ora: la squadra lo vede appena lo pubblichi.</p>
            </div>
            <button onClick={onScrivi}
              className="cliccabile w-full max-w-[320px] min-h-[52px] px-6 font-display text-lg font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-campo">
              Scrivi l'allenamento
            </button>
          </div>
        )}

        {/* Da fare: solo le cose in sospeso, non i collegamenti che sono già nella barra in basso */}
        <section aria-label="Da fare" className="bg-white rounded-3xl px-4 pt-3 pb-1 mb-3 shadow-card">
          <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Da fare</p>
          {daFare.length === 0 ? (
            <p className="flex items-center gap-2 min-h-[56px] text-[15px] font-semibold text-green-700">
              <Icona nome="spunta" className="w-6 h-6" /> Niente in sospeso
            </p>
          ) : (
            <ul>{daFare.map((r) => <RigaDaFare key={r.titolo} {...r} />)}</ul>
          )}
        </section>

        {piano && (
          <>
            <h2 className="font-display text-xl font-extrabold mt-5 mb-2 flex items-baseline justify-between">
              Il programma
              <span className="font-sans text-[13px] font-semibold text-slate-500 tracking-normal">{(piano.righe || []).length} lavori</span>
            </h2>
            <PianoCard piano={piano} senzaTesta />
          </>
        )}
      </div>

      <div className="mt-3 lg:mt-0">
        {settimana.giorni > 0 && (
          <div className="bg-white rounded-3xl p-4 mb-3 flex items-center justify-between shadow-card">
            <div>
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Questa settimana</p>
              <p className="font-display text-3xl font-extrabold mt-1">{km(settimana.metri)}<span className="text-base"> km</span></p>
            </div>
            <p className="text-[13px] text-slate-500 text-right">
              {settimana.giorni} {settimana.giorni === 1 ? 'allenamento pubblicato' : 'allenamenti pubblicati'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Home del coach: la giornata della squadra; "Scrivi" apre l'editor al posto della giornata
function HomeCoach() {
  const [giorno, setGiorno] = useState(dataLocale())
  const [scrivi, setScrivi] = useState(false)
  const [avviso, setAvviso] = useState('')
  const { squadra, pronto } = useMiaSquadra()
  const settimana = useSettimanaSquadra(squadra?.id, giorno, undefined, avviso)
  const cambiaGiorno = (g) => { setAvviso(''); setGiorno(g) }

  if (scrivi && squadra) {
    return (
      <AppShell titolo="Allenamento" attiva="home">
        <EditorAllenamento squadra={squadra} giorno={giorno}
          onChiudi={(msg) => { setAvviso(msg || ''); setScrivi(false); window.scrollTo(0, 0) }} />
      </AppShell>
    )
  }
  return (
    <AppShell titolo={titoloGiorno(giorno)} attiva="home" giorno={giorno} onGiorno={cambiaGiorno} voti={settimana.voti}>
      {!pronto ? <p className="text-center text-slate-500 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : <>
            <DomandeIngresso squadra={squadra} />
            <ProposteFuoriPiano squadra={squadra} />
            <OggiCoach key={giorno + avviso} squadra={squadra} giorno={giorno} settimana={settimana} avviso={avviso}
              onScrivi={() => { setAvviso(''); setScrivi(true); window.scrollTo(0, 0) }} />
          </>}
    </AppShell>
  )
}

export default function Dashboard() {
  const { ruolo } = useAuth()
  return ruolo === 'coach' ? <HomeCoach /> : <HomeAtleta />
}
