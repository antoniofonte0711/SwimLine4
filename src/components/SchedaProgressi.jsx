import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { caricaTutto } from '../lib/caricaTutto'
import InputTempo from './InputTempo'
import SelettoreData from './SelettoreData'
import { STILI, TIPI_LAVORO, dataLocale } from '../lib/lavori'
import { tempoInSecondi, secondiInTempo, formattaData, normalizzaTempo, tempoValido, tempoPlausibile, erroreTempoImpossibile, ERRORE_TEMPO_BREVE } from '../lib/tempo'
import { STILI_COACH } from '../lib/pianoSquadra'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const FONTI = ['Allenamenti e gare', 'Solo allenamenti', 'Solo gare']
const TUTTI = 'Tutti gli stili'

// Distanza e stile con più tempi (a parità, quella nuotata più di recente): da lì si vede subito il grafico
function piuFrequente(lista) {
  const gruppi = {}
  lista.forEach((p) => {
    const g = (gruppi[`${p.distanza}|${p.stile}`] ||= { distanza: p.distanza, stile: p.stile, n: 0, ultima: '' })
    g.n++
    if (String(p.data) > g.ultima) g.ultima = String(p.data)
  })
  const migliore = Object.values(gruppi).sort((x, y) => y.n - x.n || y.ultima.localeCompare(x.ultima))[0]
  return migliore ? { distanza: String(migliore.distanza), stile: migliore.stile || TUTTI } : { distanza: '', stile: TUTTI }
}

// Scheda di un atleta: tutti i suoi tempi (gare + lavori), filtrabili a scelta.
// Il coach può anche aggiungere o togliere tempi (coach = true).
export default function SchedaProgressi({ atletaId, coach = false }) {
  const [punti, setPunti] = useState([])
  const [fonte, setFonte] = useState(FONTI[0])
  const [distanza, setDistanza] = useState('')
  const [stile, setStile] = useState(TUTTI)
  const [dal, setDal] = useState('')
  const [al, setAl] = useState('')
  const [aperto, setAperto] = useState(false)
  // Scelta attuale, letta da carica() per capire se dopo un'eliminazione ha ancora tempi da mostrare
  const scelta = useRef(null)
  useEffect(() => { scelta.current = scelta.current && { distanza, stile } }, [distanza, stile])

  // nuova: { distanza, stile } del tempo appena aggiunto, da mostrare subito
  const carica = useCallback(async (nuova) => {
    const [{ data: a }, { data: g }] = await Promise.all([
      caricaTutto(() => supabase.from('allenamenti').select('*').eq('atleta_id', atletaId)),
      caricaTutto(() => supabase.from('gare').select('*').eq('atleta_id', atletaId)),
    ])
    const lista = []
    ;(a || []).forEach((r) => {
      const secondi = [...(r.passaggi || []), r.tempo_totale].map(tempoInSecondi).filter((x) => x !== null)
      if (!secondi.length) return
      lista.push({
        id: r.id, tabella: 'allenamenti', fonte: 'Allenamento', data: r.data_allenamento || (r.created_at || '').slice(0, 10),
        distanza: r.distanza, stile: r.stile, sec: Math.min(...secondi),
        nome: `${r.tipo_lavoro}${r.ripetizioni ? ` · ${r.ripetizioni}×${r.distanza} m` : ''}`,
      })
    })
    ;(g || []).forEach((r) => {
      const sec = tempoInSecondi(r.tempo)
      if (sec === null) return
      lista.push({ id: r.id, tabella: 'gare', fonte: 'Gara', data: r.data_gara, distanza: r.distanza, stile: r.stile, sec, nome: r.nome_gara })
    })
    setPunti(lista)
    let prossima
    if (nuova) {
      // Il tempo appena aggiunto deve vedersi: niente filtri che lo nascondano
      prossima = { distanza: String(nuova.distanza), stile: nuova.stile }
      setFonte(FONTI[0])
      setDal('')
      setAl('')
    } else {
      const cur = scelta.current
      const haTempi = cur && lista.some((p) => String(p.distanza) === cur.distanza && (cur.stile === TUTTI || p.stile === cur.stile))
      // Al primo caricamento (o se la scelta è rimasta vuota) si parte dalla distanza e dallo stile con più tempi
      prossima = haTempi ? cur : piuFrequente(lista)
    }
    scelta.current = prossima
    setDistanza(prossima.distanza)
    setStile(prossima.stile)
  }, [atletaId])

  useEffect(() => { carica() }, [carica])

  const distanze = useMemo(() => [...new Set(punti.map((p) => p.distanza))].sort((x, y) => x - y), [punti])
  // Stili standard + "Proprio stile" + eventuali altri stili presenti nei tempi salvati
  const stili = useMemo(() => [...new Set([...STILI_COACH, ...punti.map((p) => p.stile).filter(Boolean)])], [punti])
  const filtrati = useMemo(
    () =>
      punti
        .filter((p) => String(p.distanza) === distanza)
        .filter((p) => stile === TUTTI || p.stile === stile)
        .filter((p) => fonte === FONTI[0] || (fonte === FONTI[1] ? p.fonte === 'Allenamento' : p.fonte === 'Gara'))
        .filter((p) => (!dal || p.data >= dal) && (!al || p.data <= al))
        .sort((x, y) => String(x.data).localeCompare(String(y.data))),
    [punti, distanza, stile, fonte, dal, al]
  )
  const migliore = filtrati.length ? Math.min(...filtrati.map((p) => p.sec)) : null
  const dati = filtrati.map((p) => ({ data: formattaData(p.data), tempo: p.sec }))

  async function togli(p) {
    if (!window.confirm(`Eliminare "${p.nome}" del ${new Date(p.data + 'T12:00:00').toLocaleDateString('it-IT')}?`)) return
    const { error } = await supabase.from(p.tabella).delete().eq('id', p.id)
    if (error) return window.alert('Non sono riuscito a eliminare: ' + error.message)
    carica()
  }

  return (
    <>
      {coach && (
        <>
          <button onClick={() => setAperto(!aperto)} className="w-full font-bold text-white bg-blue-600 rounded-2xl py-3.5 mb-3">
            {aperto ? 'Chiudi' : '+ Aggiungi tempo a questo atleta'}
          </button>
          {aperto && <NuovoTempo atletaId={atletaId} onSalvato={(nuova) => { carica(nuova); setAperto(false) }} />}
        </>
      )}

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Distanza</label>
            <select value={distanza} onChange={(e) => setDistanza(e.target.value)} className={CAMPO}>
              {distanze.length === 0 && <option value="">—</option>}
              {distanze.map((d) => <option key={d} value={d}>{d} m</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Stile</label>
            <select value={stile} onChange={(e) => setStile(e.target.value)} className={CAMPO}>
              <option>{TUTTI}</option>
              {stili.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <label className="block text-xs text-gray-500 mb-1">Cosa mostrare</label>
        <select value={fonte} onChange={(e) => setFonte(e.target.value)} className={CAMPO + ' mb-3'}>
          {FONTI.map((f) => <option key={f}>{f}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dal</label>
            <input type="date" value={dal} onChange={(e) => setDal(e.target.value)} className={CAMPO} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Al</label>
            <input type="date" value={al} onChange={(e) => setAl(e.target.value)} className={CAMPO} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        {migliore !== null && (
          <>
            <p className="text-xs text-gray-400">Migliore in questo periodo</p>
            <p className="text-3xl font-extrabold text-blue-600 mb-2">{secondiInTempo(migliore)}</p>
          </>
        )}
        {dati.length >= 2 ? (
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dati}>
                <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} width={62} domain={['auto', 'auto']} tickFormatter={secondiInTempo} />
                <Tooltip formatter={(v) => secondiInTempo(v)} />
                <Line type="monotone" dataKey="tempo" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Servono almeno due tempi con questi filtri<br />per mostrare il grafico.</p>
        )}
        <p className="text-xs text-gray-400 mt-1">Più la linea scende, più è veloce.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
        <p className="text-sm text-gray-500 mb-2">Tempi dal più vecchio al più nuovo</p>
        {filtrati.length === 0 && <p className="text-sm text-gray-300 py-3">Nessun tempo con questi filtri.</p>}
        {filtrati.map((p) => (
          <div key={p.tabella + p.id} className="flex items-center justify-between border-t border-gray-100 py-3 text-sm gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{p.nome}</p>
              <p className="text-xs text-gray-400">
                {new Date(p.data + 'T12:00:00').toLocaleDateString('it-IT')} · {p.fonte} {p.stile ? `· ${p.stile}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-extrabold ${p.sec === migliore ? 'text-blue-600' : ''}`}>{secondiInTempo(p.sec)}</span>
              {coach && <button onClick={() => togli(p)} aria-label="Elimina" className="text-red-500 text-lg">🗑</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// Il coach sceglie lui cosa registrare: un tempo di gara oppure di un lavoro in allenamento
function NuovoTempo({ atletaId, onSalvato }) {
  const [tipo, setTipo] = useState('gara')
  const [data, setData] = useState(dataLocale())
  const [nome, setNome] = useState('')
  const [lavoro, setLavoro] = useState(TIPI_LAVORO[0])
  const [stile, setStile] = useState('Stile libero')
  const [distanza, setDistanza] = useState('100')
  const [tempo, setTempo] = useState('')
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)

  async function salva() {
    setErrore('')
    const t = normalizzaTempo(tempo)
    if (!tempoValido(t)) return setErrore(ERRORE_TEMPO_BREVE)
    if (!(Number(distanza) >= 25)) return setErrore('La distanza deve essere da 25 metri in su.')
    if (!tempoPlausibile(t, distanza)) return setErrore(erroreTempoImpossibile(distanza))
    if (tipo === 'gara' && !nome.trim()) return setErrore('Scrivi il nome della gara.')
    setInvio(true)
    const { error } = tipo === 'gara'
      ? await supabase.from('gare').insert({ atleta_id: atletaId, nome_gara: nome.trim(), distanza: Number(distanza), stile, tempo: t, data_gara: data })
      : await supabase.from('allenamenti').insert({ atleta_id: atletaId, tipo_lavoro: lavoro, distanza: Number(distanza), ripetizioni: 1, stile, tempo_totale: t, data_allenamento: data })
    setInvio(false)
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    onSalvato({ distanza: Number(distanza), stile })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[['gara', '🏁 Gara'], ['allenamento', '🏊 Allenamento']].map(([k, n]) => (
          <button key={k} onClick={() => setTipo(k)}
            className={`rounded-xl py-2.5 text-sm font-semibold ${tipo === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{n}</button>
        ))}
      </div>
      <div className="mb-3"><SelettoreData etichetta="Data" valore={data} onChange={setData} /></div>
      {tipo === 'gara' ? (
        <>
          <label className="block text-xs text-gray-500 mb-1">Nome gara</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Trofeo Lombardia" className={CAMPO + ' mb-3'} />
        </>
      ) : (
        <>
          <label className="block text-xs text-gray-500 mb-1">Lavoro</label>
          <select value={lavoro} onChange={(e) => setLavoro(e.target.value)} className={CAMPO + ' mb-3'}>
            {TIPI_LAVORO.map((t) => <option key={t}>{t}</option>)}
          </select>
        </>
      )}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Stile</label>
          <select value={stile} onChange={(e) => setStile(e.target.value)} className={CAMPO}>
            {STILI.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Distanza (m)</label>
          <input type="number" min="25" step="25" value={distanza} onChange={(e) => setDistanza(e.target.value)} className={CAMPO} />
        </div>
      </div>
      <div className="mb-3"><InputTempo etichetta="Tempo" value={tempo} onChange={setTempo} /></div>
      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
      <button onClick={salva} disabled={invio} className="w-full font-bold text-white bg-blue-600 disabled:bg-gray-300 rounded-2xl py-3">
        {invio ? 'Salvo…' : 'Salva tempo'}
      </button>
    </div>
  )
}
