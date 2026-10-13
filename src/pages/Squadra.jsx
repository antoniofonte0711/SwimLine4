import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { coloreLavoro, formattaGiorno, testoVasca, vascaDi } from '../lib/lavori'
import { tempoInSecondi } from '../lib/tempo'
import RisultatiAtleta from '../components/RisultatiAtleta'
import SchedaProgressi from '../components/SchedaProgressi'
import Riferimenti from '../components/Riferimenti'
import { dataLocale } from '../lib/lavori'
import { riepilogoPresenze, STATI } from '../lib/presenze'
import { useMiaSquadra } from '../lib/pianoSquadra'
import { useRegole } from '../lib/regole'
import { categoriaFin } from '../lib/categorie'
import Schede from '../components/Schede'
import StoricoAllenamenti from '../components/StoricoAllenamenti'
import Icona from '../components/Icona'
import { SenzaSquadra } from '../components/PianoCard'
import { SchedaPrevisioni } from './Previsioni'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'
const dataIt = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : '')

// Squadra: nome della squadra e tempi dei compagni.
// Atleta: vede le gare dei compagni. Coach (e admin): vede anche gli allenamenti dei suoi atleti.
function SquadraCompagni() {
  const { user, profile, isCoach } = useAuth()
  const { squadra: squadraCoach, pronto } = useMiaSquadra()
  const { puo } = useRegole()
  // Pannello › Permessi: l'atleta può non vedere le gare dei compagni (le sue sì, nelle Gare)
  const nascosti = !isCoach && !puo('a_compagni')
  const [nomeSquadra, setNomeSquadra] = useState('')
  const [atleti, setAtleti] = useState([])
  const [scelto, setScelto] = useState('')
  const [vista, setVista] = useState(isCoach ? 'Oggi' : 'Gare')
  const [gare, setGare] = useState([])
  const [allenamenti, setAllenamenti] = useState([])
  const viste = isCoach ? ['Oggi', 'Gare', 'Allenamenti', 'Presenze', 'Grafico tempi', 'Riferimenti'] : ['Gare']

  useEffect(() => {
    async function carica() {
      if (isCoach && !pronto) return
      // nome della squadra: per il coach quella che allena (per l'admin quella in cui è entrato),
      // altrimenti quella in cui sono
      // con la società davanti, se il gruppo ne ha una ("Test Team · Esordienti")
      let nome = ''
      const idGruppo = (isCoach && squadraCoach?.id) || profile?.squadra_id
      if (idGruppo) {
        const { data } = await supabase.from('squadre').select('nome, societa(nome)').eq('id', idGruppo).maybeSingle()
        if (data) nome = data.societa?.nome ? `${data.societa.nome} · ${data.nome}` : data.nome
      }
      if (!nome && isCoach) nome = squadraCoach?.nome || ''
      if (!nome) {
        const { data } = await supabase.from('squadre').select('nome').eq('coach_id', user.id)
        nome = (data || []).map((s) => s.nome).join(', ')
      }
      setNomeSquadra(nome)

      // categoria FIN per tutti; l'anno di nascita solo per il coach (ai compagni non arriva proprio)
      let q = isCoach
        ? supabase.from('profiles').select('id, nome, cognome, data_nascita, sesso').in('role', ['atleta', 'admin']).is('eliminato_il', null)
        : supabase.from('compagni_squadra').select('id, nome, cognome, categoria')
      if (isCoach && squadraCoach) q = q.eq('squadra_id', squadraCoach.id)
      let { data } = await q.order('cognome')
      if (isCoach && data?.length) {
        // la categoria scritta dal coach nei Riferimenti vale più di quella calcolata
        const { data: rif } = await supabase.from('atleta_riferimenti').select('atleta_id, categoria').in('atleta_id', data.map((a) => a.id))
        const scritta = Object.fromEntries((rif || []).filter((r) => r.categoria?.trim()).map((r) => [r.atleta_id, r.categoria.trim()]))
        data = data.map((a) => ({
          ...a, categoria: scritta[a.id] || categoriaFin(a.data_nascita, a.sesso),
          anno: a.data_nascita ? a.data_nascita.slice(0, 4) : null,
        }))
      }
      setAtleti(data || [])
      setScelto((s) => (data || []).some((a) => a.id === s) ? s : data?.[0]?.id || '')
    }
    carica()
  }, [user.id, profile?.squadra_id, isCoach, pronto, squadraCoach?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!scelto) {
      setGare([])
      setAllenamenti([])
      return
    }
    supabase.from('gare').select('*').eq('atleta_id', scelto).order('data_gara', { ascending: false }).limit(100)
      .then(({ data }) => setGare(data || []))
    if (isCoach) {
      supabase.from('allenamenti').select('*').eq('atleta_id', scelto).order('created_at', { ascending: false }).limit(60)
        .then(({ data }) => setAllenamenti(data || []))
    }
  }, [scelto, isCoach])

  // Miglior tempo per ogni distanza, stile e vasca (25 e 50 m sono prove diverse)
  const migliori = {}
  gare.forEach((g) => {
    const sec = tempoInSecondi(g.tempo)
    if (sec === null) return
    const k = `${g.distanza} m ${g.stile} · ${testoVasca(vascaDi(g))}`
    if (!migliori[k] || sec < migliori[k].sec) migliori[k] = { sec, tempo: g.tempo, dist: g.distanza, vasca: vascaDi(g) }
  })
  const elencoMigliori = Object.entries(migliori).sort((a, b) => a[1].vasca - b[1].vasca || a[1].dist - b[1].dist)

  return (
    <AppShell titolo="Squadra" attiva="funzioni" indietro="/funzioni">
      <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
        <p className="text-xs text-slate-500">Squadra</p>
        <p className="text-xl font-bold mb-3">{nomeSquadra || (isCoach ? 'Tutte le squadre' : 'Non sei ancora in una squadra')}</p>

        {nascosti ? (
          <p className="text-sm text-slate-500">In questa squadra i tempi dei compagni non sono visibili. I tuoi li trovi in Gare e Progressi.</p>
        ) : atleti.length > 0 ? (
          <>
            <label className="block text-xs text-slate-500 mb-1">{isCoach ? 'Atleta' : 'Compagno'}</label>
            <select value={scelto} onChange={(e) => setScelto(e.target.value)} className={CAMPO + ' mb-3'}>
              {atleti.map((a) => <option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
            </select>
            <label className="block text-xs text-slate-500 mb-1">Cosa vuoi vedere?</label>
            <select value={vista} onChange={(e) => setVista(e.target.value)} className={CAMPO}>
              {viste.map((v) => <option key={v}>{v}</option>)}
            </select>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            {isCoach
              ? 'Nessun atleta nella tua squadra: compaiono quando scelgono la tua squadra in registrazione.'
              : 'Quando entri in una squadra qui vedrai i tempi dei compagni.'}
          </p>
        )}
      </div>

      {atleti.length > 0 && <ElencoCompagni atleti={atleti} coach={isCoach} scelto={scelto} onScegli={setScelto} />}

      {scelto && isCoach && vista === 'Oggi' && <OggiAtleta key={scelto} atletaId={scelto} />}
      {scelto && isCoach && vista === 'Presenze' && <PresenzeBreve key={scelto} atletaId={scelto} />}
      {scelto && isCoach && vista === 'Grafico tempi' && <SchedaProgressi key={scelto} atletaId={scelto} />}
      {scelto && isCoach && vista === 'Riferimenti' && <Riferimenti key={scelto} atletaId={scelto} />}

      {scelto && !nascosti && vista === 'Gare' && (
        <>
          {elencoMigliori.length > 0 && (
            <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
              <p className="text-sm text-slate-500 mb-2">Migliori tempi in gara</p>
              {elencoMigliori.map(([nome, m]) => (
                <div key={nome} className="flex justify-between border-t border-gray-100 py-2.5 text-sm">
                  <span>{nome}</span>
                  <b className="text-blue-600">{m.tempo}</b>
                </div>
              ))}
            </div>
          )}
          {gare.length === 0 && <p className="text-center text-slate-500 py-6">Nessuna gara ancora 🏆</p>}
          {gare.map((g) => (
            <div key={g.id} className="bg-white rounded-3xl p-5 mb-3 shadow-card">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{g.nome_gara}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{dataIt(g.data_gara)}</p>
                </div>
                <p className="text-xl font-extrabold text-blue-600 tabular-nums shrink-0">{g.tempo}</p>
              </div>
              <p className="text-sm font-semibold text-slate-600 mt-1">
                <span className="whitespace-nowrap">{g.distanza} m {g.stile}</span> · <span className="whitespace-nowrap">{testoVasca(vascaDi(g))}</span>
              </p>
              {g.passaggi?.length > 0 && <p className="text-xs text-slate-500 mt-2">Passaggi: {g.passaggi.map((p) => p || '–').join(' · ')}</p>}
            </div>
          ))}
        </>
      )}

      {scelto && vista === 'Allenamenti' && (
        <>
          {allenamenti.length === 0 && <p className="text-center text-slate-500 py-6">Nessun allenamento ancora 🏊</p>}
          {allenamenti.map((r) => (
            <div key={r.id} className="bg-white rounded-3xl p-5 mb-3 shadow-card">
              <p className="text-xs text-slate-500 capitalize mb-1">{formattaGiorno(r.data_allenamento || (r.created_at || '').slice(0, 10))}</p>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
              <span className="text-sm text-slate-600 ml-2">{r.ripetizioni ? `${r.ripetizioni}×` : ''}{r.distanza} m {r.stile || ''}</span>
              {r.passaggi?.length > 0 ? (
                <p className="text-xs text-slate-500 mt-1">{r.passaggi.map((p) => p || '–').join(' · ')}</p>
              ) : (
                r.tempo_totale && <p className="text-xs text-slate-500 mt-1">{r.tempo_totale}</p>
              )}
            </div>
          ))}
        </>
      )}
    </AppShell>
  )
}

// Tutti i compagni con la categoria FIN (il coach vede anche l'anno di nascita). Toccando un nome lo si sceglie sopra.
function ElencoCompagni({ atleti, coach, scelto, onScegli }) {
  const [aperto, setAperto] = useState(atleti.length <= 12)
  const visibili = aperto ? atleti : atleti.slice(0, 8)
  return (
    <section className="bg-white rounded-3xl p-5 mb-3 shadow-card" aria-label={coach ? 'Atleti della squadra' : 'Compagni di squadra'}>
      <p className="font-bold">{coach ? 'Atleti' : 'Compagni di squadra'} ({atleti.length})</p>
      <p className="text-xs text-slate-500 mb-2">
        {coach ? 'Categoria FIN e anno di nascita. Tocca un nome per vederne i dati.' : 'Con la categoria FIN. Tocca un nome per vedere le sue gare.'}
      </p>
      <ul>
        {visibili.map((a) => (
          <li key={a.id} className="border-t border-slate-100 first:border-t-0">
            <button type="button" onClick={() => onScegli(a.id)} aria-pressed={scelto === a.id}
              className={`w-full min-h-[48px] flex items-center justify-between gap-3 text-left rounded-xl px-2 -mx-2 ${scelto === a.id ? 'bg-schiuma' : ''}`}>
              <span className="text-[15px] font-semibold text-abisso truncate">{a.nome} {a.cognome}</span>
              <span className="text-xs font-bold text-slate-500 text-right shrink-0">
                {a.categoria || 'Categoria —'}{coach && a.anno ? ` · ${a.anno}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!aperto && (
        <button type="button" onClick={() => setAperto(true)} className="w-full min-h-[44px] mt-1 text-sm font-bold text-blue-600">
          Mostra tutti ({atleti.length})
        </button>
      )}
    </section>
  )
}

// L'allenamento di oggi, anche se l'atleta non ha ancora nessun tempo: il coach può scriverli da qui
function OggiAtleta({ atletaId }) {
  const { squadra } = useMiaSquadra()
  const oggi = dataLocale()
  const [piano, setPiano] = useState(undefined)

  useEffect(() => {
    if (!squadra) return
    supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id).eq('data', oggi).maybeSingle()
      .then(({ data }) => setPiano(data || null))
  }, [squadra?.id, oggi]) // eslint-disable-line react-hooks/exhaustive-deps

  if (piano === undefined) return <p className="text-center text-slate-500 py-6">Carico…</p>
  return <RisultatiAtleta piano={piano} atletaId={atletaId} giorno={oggi} />
}

// Assenze e percentuale; in basso a destra il grafico completo
function PresenzeBreve({ atletaId }) {
  const [righe, setRighe] = useState([])
  useEffect(() => {
    supabase.from('presenze').select('data, stato').eq('atleta_id', atletaId).order('data', { ascending: false }).limit(1000)
      .then(({ data }) => setRighe(data || []))
  }, [atletaId])
  const tot = riepilogoPresenze(righe)
  const assenze = righe.filter((r) => r.stato !== 'presente').slice(0, 15)
  return (
    <>
      <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
        <p className="text-sm text-slate-500">Presenze</p>
        <p className="text-3xl font-extrabold text-blue-600">{tot.percentuale === null ? '—' : `${tot.percentuale}%`}</p>
        <p className="font-bold mt-4 mb-1 text-sm">Assenze</p>
        {assenze.length === 0 && <p className="text-sm text-slate-500">Nessuna assenza.</p>}
        {assenze.map((r, i) => (
          <div key={r.data} className={`flex justify-between py-2 text-sm ${i ? 'border-t border-gray-100' : ''}`}>
            <span>{new Date(r.data + 'T12:00:00').toLocaleDateString('it-IT')}</span>
            <span className="text-slate-500">{STATI[r.stato]}</span>
          </div>
        ))}
      </div>
      <div className="text-right">
        <Link to={`/squadra/presenze/${atletaId}`} className="text-sm font-semibold text-blue-600">Grafico completo delle presenze →</Link>
      </div>
    </>
  )
}

// Coach (e admin): l'elenco degli atleti; toccando un nome si apre la sua scheda
export default function Squadra() {
  const { isCoach } = useAuth()
  return isCoach ? <SquadraCoach /> : <SquadraCompagni />
}

function SquadraCoach() {
  const { ruolo } = useAuth()
  const { squadra, pronto } = useMiaSquadra()
  const [atleti, setAtleti] = useState(null)
  const [scelto, setScelto] = useState('')

  useEffect(() => {
    if (!pronto) return
    if (!squadra) return setAtleti([])
    async function carica() {
      let { data } = await supabase.from('profiles').select('id, nome, cognome, data_nascita, sesso')
        .in('role', ['atleta', 'admin']).is('eliminato_il', null).eq('squadra_id', squadra.id).order('cognome')
      if (data?.length) {
        // la categoria scritta dal coach nei Riferimenti vale più di quella calcolata
        const { data: rif } = await supabase.from('atleta_riferimenti').select('atleta_id, categoria').in('atleta_id', data.map((a) => a.id))
        const scritta = Object.fromEntries((rif || []).filter((r) => r.categoria?.trim()).map((r) => [r.atleta_id, r.categoria.trim()]))
        data = data.map((a) => ({
          ...a, categoria: scritta[a.id] || categoriaFin(a.data_nascita, a.sesso),
          anno: a.data_nascita ? a.data_nascita.slice(0, 4) : null,
        }))
      }
      setAtleti(data || [])
    }
    carica()
  }, [pronto, squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const atleta = atleti?.find((a) => a.id === scelto)
  const scegli = (id) => { setScelto(id); window.scrollTo(0, 0) }
  const indietro = ruolo === 'coach' ? undefined : '/funzioni'

  if (atleta) {
    return (
      <AppShell titolo={`${atleta.nome} ${atleta.cognome || ''}`.trim()} attiva="atleti">
        <SchedaAtleta key={atleta.id} atleta={atleta} onIndietro={() => scegli('')} />
      </AppShell>
    )
  }
  return (
    <AppShell titolo="Atleti" attiva="atleti" indietro={indietro}>
      {!pronto || atleti === null ? <p className="text-center text-slate-500 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : atleti.length === 0 ? (
          <p className="text-sm text-slate-500 bg-white rounded-3xl p-6 text-center shadow-card">
            Nessun atleta nella tua squadra: compaiono qui quando scelgono la tua squadra in registrazione.
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-500 mb-2 px-1">{squadra.nome} · {atleti.length} {atleti.length === 1 ? 'atleta' : 'atleti'}</p>
            <ul className="bg-white rounded-3xl px-4 shadow-card">
              {atleti.map((a) => (
                <li key={a.id} className="border-t border-slate-100 first:border-t-0">
                  <button type="button" onClick={() => scegli(a.id)}
                    className="cliccabile w-full min-h-[60px] flex items-center justify-between gap-3 text-left py-2">
                    <span className="min-w-0">
                      <span className="block text-[17px] font-bold text-abisso truncate">{a.nome} {a.cognome}</span>
                      <span className="block text-[13px] text-slate-500">{a.categoria || 'Categoria —'}{a.anno ? ` · ${a.anno}` : ''}</span>
                    </span>
                    <Icona nome="freccia" className="w-5 h-5 text-slate-500 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
    </AppShell>
  )
}

const SCHEDE_ATLETA = ['Oggi', 'Tempi', 'Presenze', 'Gare']
const SCHEDE_TEMPI = ['Grafico', 'Allenamenti', 'Previsioni', 'Riferimenti']

// La scheda di un atleta: due numeri in alto e quattro schede
function SchedaAtleta({ atleta, onIndietro }) {
  const [vista, setVista] = useState(SCHEDE_ATLETA[0])
  const [tempi, setTempi] = useState(SCHEDE_TEMPI[0])
  const [presenze, setPresenze] = useState(null)
  const [ultimo, setUltimo] = useState(undefined)

  useEffect(() => {
    const da = new Date()
    da.setDate(da.getDate() - 27)
    supabase.from('presenze').select('data, stato').eq('atleta_id', atleta.id).gte('data', dataLocale(da))
      .then(({ data }) => setPresenze(riepilogoPresenze(data || []).percentuale))
    supabase.from('allenamenti').select('data_allenamento').eq('atleta_id', atleta.id).order('data_allenamento', { ascending: false }).limit(1)
      .then(({ data }) => setUltimo(data?.[0]?.data_allenamento || null))
  }, [atleta.id])

  return (
    <>
      <button type="button" onClick={onIndietro}
        className="cliccabile inline-flex items-center min-h-[44px] mb-3 text-sm font-semibold text-blue-600 bg-schiuma rounded-full px-4">
        ‹ Tutti gli atleti
      </button>
      <p className="text-sm text-slate-500 mb-3 px-1">{atleta.categoria || 'Categoria —'}{atleta.anno ? ` · nato nel ${atleta.anno}` : ''}</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white rounded-3xl p-4 shadow-card">
          <p className="text-xs font-bold text-slate-500">Presenze · 4 settimane</p>
          <p className="font-display text-3xl font-extrabold text-abisso mt-1">{presenze == null ? '—' : `${presenze}%`}</p>
        </div>
        <div className="bg-white rounded-3xl p-4 shadow-card">
          <p className="text-xs font-bold text-slate-500">Ultimi tempi scritti</p>
          <p className="font-display text-xl font-extrabold text-abisso mt-1.5 capitalize">{ultimo ? formattaGiorno(ultimo) : '—'}</p>
        </div>
      </div>

      <Schede valore={vista} opzioni={SCHEDE_ATLETA} onCambia={setVista} etichetta="Dati dell'atleta" />

      {vista === 'Oggi' && <OggiAtleta atletaId={atleta.id} />}
      {vista === 'Presenze' && <PresenzeBreve atletaId={atleta.id} />}
      {vista === 'Gare' && <GareDi atletaId={atleta.id} />}
      {vista === 'Tempi' && (
        <>
          <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Tempi">
            {SCHEDE_TEMPI.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tempi === t} onClick={() => setTempi(t)}
                className={`cliccabile min-h-[40px] rounded-full px-4 text-sm font-bold ${tempi === t ? 'bg-abisso text-white' : 'bg-white text-slate-600 shadow-card'}`}>
                {t}
              </button>
            ))}
          </div>
          {tempi === 'Grafico' && <SchedaProgressi atletaId={atleta.id} coach />}
          {tempi === 'Allenamenti' && <StoricoAllenamenti atletaId={atleta.id} />}
          {tempi === 'Previsioni' && <SchedaPrevisioni atletaId={atleta.id} />}
          {tempi === 'Riferimenti' && <Riferimenti atletaId={atleta.id} />}
        </>
      )}
    </>
  )
}

// Le gare di un atleta con i migliori tempi (25 e 50 m sono prove diverse)
function GareDi({ atletaId }) {
  const [gare, setGare] = useState(null)
  useEffect(() => {
    supabase.from('gare').select('*').eq('atleta_id', atletaId).order('data_gara', { ascending: false }).limit(100)
      .then(({ data }) => setGare(data || []))
  }, [atletaId])
  if (gare === null) return <p className="text-center text-slate-500 py-6">Carico…</p>
  const migliori = {}
  gare.forEach((g) => {
    const sec = tempoInSecondi(g.tempo)
    if (sec === null) return
    const k = `${g.distanza} m ${g.stile} · ${testoVasca(vascaDi(g))}`
    if (!migliori[k] || sec < migliori[k].sec) migliori[k] = { sec, tempo: g.tempo, dist: g.distanza, vasca: vascaDi(g) }
  })
  const elenco = Object.entries(migliori).sort((a, b) => a[1].vasca - b[1].vasca || a[1].dist - b[1].dist)
  return (
    <>
      {elenco.length > 0 && (
        <div className="bg-white rounded-3xl p-5 mb-3 shadow-card">
          <p className="text-sm text-slate-500 mb-2">Migliori tempi in gara</p>
          {elenco.map(([nome, m]) => (
            <div key={nome} className="flex justify-between border-t border-gray-100 py-2.5 text-sm">
              <span>{nome}</span>
              <b className="text-blue-600">{m.tempo}</b>
            </div>
          ))}
        </div>
      )}
      {gare.length === 0 && <p className="text-center text-slate-500 bg-white rounded-3xl p-6 shadow-card">Nessuna gara ancora.</p>}
      {gare.map((g) => (
        <div key={g.id} className="bg-white rounded-3xl p-5 mb-3 shadow-card">
          <div className="flex justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold">{g.nome_gara}</p>
              <p className="text-sm text-slate-500 mt-0.5">{dataIt(g.data_gara)}</p>
            </div>
            <p className="text-xl font-extrabold text-blue-600 tabular-nums shrink-0">{g.tempo}</p>
          </div>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            <span className="whitespace-nowrap">{g.distanza} m {g.stile}</span> · <span className="whitespace-nowrap">{testoVasca(vascaDi(g))}</span>
          </p>
          {g.passaggi?.length > 0 && <p className="text-xs text-slate-500 mt-2">Passaggi: {g.passaggi.map((p) => p || '–').join(' · ')}</p>}
        </div>
      ))}
    </>
  )
}