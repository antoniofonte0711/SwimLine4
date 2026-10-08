import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { coloreLavoro, formattaGiorno } from '../lib/lavori'
import { tempoInSecondi } from '../lib/tempo'
import RisultatiAtleta from '../components/RisultatiAtleta'
import SchedaProgressi from '../components/SchedaProgressi'
import Riferimenti from '../components/Riferimenti'
import { dataLocale } from '../lib/lavori'
import { riepilogoPresenze, STATI } from '../lib/presenze'
import { useMiaSquadra } from '../lib/pianoSquadra'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const dataIt = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : '')

// Squadra: nome della squadra e tempi dei compagni.
// Atleta: vede le gare dei compagni. Coach (e admin): vede anche gli allenamenti dei suoi atleti.
export default function Squadra() {
  const { user, profile, isCoach } = useAuth()
  const { squadra: squadraCoach, pronto } = useMiaSquadra()
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
      let nome = isCoach ? squadraCoach?.nome || '' : ''
      if (!nome && profile?.squadra_id) {
        const { data } = await supabase.from('squadre').select('nome').eq('id', profile.squadra_id).maybeSingle()
        nome = data?.nome || ''
      }
      if (!nome) {
        const { data } = await supabase.from('squadre').select('nome').eq('coach_id', user.id)
        nome = (data || []).map((s) => s.nome).join(', ')
      }
      setNomeSquadra(nome)

      let q = isCoach
        ? supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin'])
        : supabase.from('compagni_squadra').select('id, nome, cognome')
      if (isCoach && squadraCoach) q = q.eq('squadra_id', squadraCoach.id)
      const { data } = await q.order('cognome')
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

  // Miglior tempo per ogni distanza e stile
  const migliori = {}
  gare.forEach((g) => {
    const sec = tempoInSecondi(g.tempo)
    if (sec === null) return
    const k = `${g.distanza} m ${g.stile}`
    if (!migliori[k] || sec < migliori[k].sec) migliori[k] = { sec, tempo: g.tempo, dist: g.distanza }
  })
  const elencoMigliori = Object.entries(migliori).sort((a, b) => a[1].dist - b[1].dist)

  return (
    <AppShell titolo="Squadra" attiva="funzioni" indietro="/funzioni">
      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <p className="text-xs text-gray-500">Squadra</p>
        <p className="text-xl font-bold mb-3">{nomeSquadra || (isCoach ? 'Tutte le squadre' : 'Non sei ancora in una squadra')}</p>

        {atleti.length > 0 ? (
          <>
            <label className="block text-xs text-gray-500 mb-1">{isCoach ? 'Atleta' : 'Compagno'}</label>
            <select value={scelto} onChange={(e) => setScelto(e.target.value)} className={CAMPO + ' mb-3'}>
              {atleti.map((a) => <option key={a.id} value={a.id}>{a.nome} {a.cognome}</option>)}
            </select>
            <label className="block text-xs text-gray-500 mb-1">Cosa vuoi vedere?</label>
            <select value={vista} onChange={(e) => setVista(e.target.value)} className={CAMPO}>
              {viste.map((v) => <option key={v}>{v}</option>)}
            </select>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            {isCoach
              ? 'Nessun atleta nella tua squadra: compaiono quando scelgono la tua squadra in registrazione.'
              : 'Quando entri in una squadra qui vedrai i tempi dei compagni.'}
          </p>
        )}
      </div>

      {scelto && isCoach && vista === 'Oggi' && <OggiAtleta key={scelto} atletaId={scelto} />}
      {scelto && isCoach && vista === 'Presenze' && <PresenzeBreve key={scelto} atletaId={scelto} />}
      {scelto && isCoach && vista === 'Grafico tempi' && <SchedaProgressi key={scelto} atletaId={scelto} />}
      {scelto && isCoach && vista === 'Riferimenti' && <Riferimenti key={scelto} atletaId={scelto} />}

      {scelto && vista === 'Gare' && (
        <>
          {elencoMigliori.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
              <p className="text-sm text-gray-500 mb-2">Migliori tempi in gara</p>
              {elencoMigliori.map(([nome, m]) => (
                <div key={nome} className="flex justify-between border-t border-gray-100 py-2.5 text-sm">
                  <span>{nome}</span>
                  <b className="text-blue-600">{m.tempo}</b>
                </div>
              ))}
            </div>
          )}
          {gare.length === 0 && <p className="text-center text-gray-500 py-6">Nessuna gara ancora 🏆</p>}
          {gare.map((g) => (
            <div key={g.id} className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-bold">{g.nome_gara}</p>
                  <p className="text-sm text-gray-500">{dataIt(g.data_gara)} · {g.distanza} m {g.stile}</p>
                </div>
                <p className="text-xl font-extrabold text-blue-600">{g.tempo}</p>
              </div>
              {g.passaggi?.length > 0 && <p className="text-xs text-gray-500 mt-2">Passaggi: {g.passaggi.map((p) => p || '–').join(' · ')}</p>}
            </div>
          ))}
        </>
      )}

      {scelto && vista === 'Allenamenti' && (
        <>
          {allenamenti.length === 0 && <p className="text-center text-gray-500 py-6">Nessun allenamento ancora 🏊</p>}
          {allenamenti.map((r) => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
              <p className="text-xs text-gray-500 capitalize mb-1">{formattaGiorno(r.data_allenamento || (r.created_at || '').slice(0, 10))}</p>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
              <span className="text-sm text-gray-600 ml-2">{r.ripetizioni ? `${r.ripetizioni}×` : ''}{r.distanza} m {r.stile || ''}</span>
              {r.passaggi?.length > 0 ? (
                <p className="text-xs text-gray-500 mt-1">{r.passaggi.map((p) => p || '–').join(' · ')}</p>
              ) : (
                r.tempo_totale && <p className="text-xs text-gray-500 mt-1">{r.tempo_totale}</p>
              )}
            </div>
          ))}
        </>
      )}
    </AppShell>
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

  if (piano === undefined) return <p className="text-center text-gray-500 py-6">Carico…</p>
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
      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <p className="text-sm text-gray-500">Presenze</p>
        <p className="text-3xl font-extrabold text-blue-600">{tot.percentuale === null ? '—' : `${tot.percentuale}%`}</p>
        <p className="font-bold mt-4 mb-1 text-sm">Assenze</p>
        {assenze.length === 0 && <p className="text-sm text-gray-500">Nessuna assenza.</p>}
        {assenze.map((r, i) => (
          <div key={r.data} className={`flex justify-between py-2 text-sm ${i ? 'border-t border-gray-100' : ''}`}>
            <span>{new Date(r.data + 'T12:00:00').toLocaleDateString('it-IT')}</span>
            <span className="text-gray-500">{STATI[r.stato]}</span>
          </div>
        ))}
      </div>
      <div className="text-right">
        <Link to={`/squadra/presenze/${atletaId}`} className="text-sm font-semibold text-blue-600">Grafico completo delle presenze →</Link>
      </div>
    </>
  )
}
