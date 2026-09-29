import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { STILI } from '../lib/lavori'
import { tempoInSecondi, secondiInTempo, formattaData } from '../lib/tempo'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
const FONTI = ['Allenamenti e gare', 'Solo allenamenti', 'Solo gare']

// Progressi: lo storico dei tempi si costruisce da solo da allenamenti e gare, non si inserisce nulla qui
export default function Progressi() {
  const { user } = useAuth()
  const [punti, setPunti] = useState([])
  const [fonte, setFonte] = useState(FONTI[0])
  const [distanza, setDistanza] = useState('')
  const [stile, setStile] = useState('Tutti gli stili')
  const [dal, setDal] = useState('')
  const [al, setAl] = useState('')

  useEffect(() => {
    async function carica() {
      const [{ data: a }, { data: g }] = await Promise.all([
        supabase.from('allenamenti').select('*').eq('atleta_id', user.id).limit(1000),
        supabase.from('gare').select('*').eq('atleta_id', user.id).limit(1000),
      ])
      const lista = []
      ;(a || []).forEach((r) => {
        const secondi = [...(r.passaggi || []), r.tempo_totale].map(tempoInSecondi).filter((x) => x !== null)
        if (!secondi.length) return
        lista.push({
          id: r.id, fonte: 'Allenamento', data: r.data_allenamento || (r.created_at || '').slice(0, 10),
          distanza: r.distanza, stile: r.stile, sec: Math.min(...secondi),
          nome: `${r.tipo_lavoro}${r.ripetizioni ? ` · ${r.ripetizioni}×${r.distanza} m` : ''}`,
        })
      })
      ;(g || []).forEach((r) => {
        const sec = tempoInSecondi(r.tempo)
        if (sec === null) return
        lista.push({ id: r.id, fonte: 'Gara', data: r.data_gara, distanza: r.distanza, stile: r.stile, sec, nome: r.nome_gara })
      })
      setPunti(lista)
      const distanze = [...new Set(lista.map((p) => p.distanza))].sort((x, y) => x - y)
      setDistanza((d) => d || String(distanze[0] || ''))
    }
    carica()
  }, [user.id])

  const distanze = useMemo(() => [...new Set(punti.map((p) => p.distanza))].sort((x, y) => x - y), [punti])

  const filtrati = useMemo(
    () =>
      punti
        .filter((p) => String(p.distanza) === distanza)
        .filter((p) => stile === 'Tutti gli stili' || p.stile === stile)
        .filter((p) => fonte === FONTI[0] || (fonte === FONTI[1] ? p.fonte === 'Allenamento' : p.fonte === 'Gara'))
        .filter((p) => (!dal || p.data >= dal) && (!al || p.data <= al))
        .sort((x, y) => String(x.data).localeCompare(String(y.data))),
    [punti, distanza, stile, fonte, dal, al]
  )

  const migliore = filtrati.length ? Math.min(...filtrati.map((p) => p.sec)) : null
  const dati = filtrati.map((p) => ({ data: formattaData(p.data), tempo: p.sec }))

  return (
    <AppShell titolo="Progressi" attiva="funzioni" indietro="/funzioni">
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
              <option>Tutti gli stili</option>
              {STILI.map((s) => <option key={s}>{s}</option>)}
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
            <p className="text-xs text-gray-400">Il tuo migliore in questo periodo</p>
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
        <p className="text-xs text-gray-400 mt-1">Più la linea scende, più sei veloce.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
        <p className="text-sm text-gray-500 mb-2">Tempi dal più vecchio al più nuovo</p>
        {filtrati.length === 0 && <p className="text-sm text-gray-300 py-3">Nessun tempo con questi filtri.</p>}
        {filtrati.map((p) => (
          <div key={p.id} className="flex items-center justify-between border-t border-gray-100 py-3 text-sm">
            <div>
              <p className="font-semibold">{p.nome}</p>
              <p className="text-xs text-gray-400">
                {new Date(p.data + 'T12:00:00').toLocaleDateString('it-IT')} · {p.fonte} {p.stile ? `· ${p.stile}` : ''}
              </p>
            </div>
            <span className={`font-extrabold ${p.sec === migliore ? 'text-blue-600' : ''}`}>{secondiInTempo(p.sec)}</span>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
