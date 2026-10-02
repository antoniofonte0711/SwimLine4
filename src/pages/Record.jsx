import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { STILI } from '../lib/lavori'
import { tempoInSecondi, secondiInTempo } from '../lib/tempo'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'

// Record: classifica dei migliori tempi per stile e distanza.
// Fonte: Gare oppure Allenamenti. Ambito: i miei oppure la squadra.
export default function Record() {
  const { user, profile, isCoach } = useAuth()
  const [fonte, setFonte] = useState('Gare')
  const [ambito, setAmbito] = useState(isCoach ? 'Squadra' : 'I miei')
  const [stile, setStile] = useState(STILI[0])
  const [nomi, setNomi] = useState({})
  const [gare, setGare] = useState([])
  const [allenamenti, setAllenamenti] = useState([])
  const [carico, setCarico] = useState(true)

  useEffect(() => {
    async function carica() {
      setCarico(true)
      // nomi degli atleti visibili (coach: la sua squadra, atleta: i compagni)
      const { data: persone } = isCoach
        ? await supabase.from('profiles').select('id, nome, cognome').eq('role', 'atleta')
        : await supabase.from('compagni_squadra').select('id, nome, cognome')
      const mappa = {}
      ;(persone || []).forEach((p) => { mappa[p.id] = `${p.nome} ${p.cognome}` })
      mappa[user.id] = `${profile?.nome || ''} ${profile?.cognome || ''}`.trim() || 'Io'
      setNomi(mappa)

      const [g, a] = await Promise.all([
        supabase.from('gare').select('atleta_id, distanza, stile, tempo, nome_gara, data_gara').limit(2000),
        supabase.from('allenamenti').select('atleta_id, distanza, stile, tempo_totale, passaggi, data_allenamento').limit(2000),
      ])
      setGare(g.data || [])
      setAllenamenti(a.data || [])
      setCarico(false)
    }
    carica()
  }, [user.id, profile?.nome, profile?.cognome, isCoach])

  // Riduce tutto a una lista unica: { atleta, distanza, stile, sec, quando }
  const voci = useMemo(() => {
    const lista = []
    if (fonte === 'Gare') {
      gare.forEach((g) => {
        const sec = tempoInSecondi(g.tempo)
        if (sec !== null) lista.push({ atleta: g.atleta_id, distanza: g.distanza, stile: g.stile, sec, quando: g.data_gara, extra: g.nome_gara })
      })
    } else {
      allenamenti.forEach((r) => {
        const tempi = r.passaggi?.length ? r.passaggi : r.tempo_totale ? [r.tempo_totale] : []
        tempi.forEach((t) => {
          const sec = tempoInSecondi(t)
          if (sec !== null && r.distanza) lista.push({ atleta: r.atleta_id, distanza: r.distanza, stile: r.stile || STILI[0], sec, quando: r.data_allenamento })
        })
      })
    }
    return lista.filter((v) => v.stile === stile && (ambito === 'Squadra' || v.atleta === user.id))
  }, [fonte, gare, allenamenti, stile, ambito, user.id])

  // Per ogni distanza: il miglior tempo di ciascun atleta, in ordine dal più veloce
  const classifiche = useMemo(() => {
    const perDistanza = {}
    voci.forEach((v) => {
      const d = (perDistanza[v.distanza] ||= {})
      if (!d[v.atleta] || v.sec < d[v.atleta].sec) d[v.atleta] = v
    })
    return Object.entries(perDistanza)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([distanza, atleti]) => [distanza, Object.values(atleti).sort((x, y) => x.sec - y.sec)])
  }, [voci])

  const data = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : '')

  return (
    <AppShell titolo="Record" attiva="funzioni" indietro="/funzioni">
      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fonte</label>
            <select value={fonte} onChange={(e) => setFonte(e.target.value)} className={CAMPO}>
              <option>Gare</option>
              <option>Allenamenti</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Di chi</label>
            <select value={ambito} onChange={(e) => setAmbito(e.target.value)} className={CAMPO}>
              <option>I miei</option>
              <option>Squadra</option>
            </select>
          </div>
        </div>
        <label className="block text-xs text-gray-500 mb-1">Stile</label>
        <select value={stile} onChange={(e) => setStile(e.target.value)} className={CAMPO}>
          {STILI.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {carico && <p className="text-center text-gray-300 py-6">Carico i record…</p>}
      {!carico && classifiche.length === 0 && (
        <p className="text-center text-gray-300 py-6">Nessun tempo per questo stile 🏅</p>
      )}

      {classifiche.map(([distanza, righe]) => (
        <div key={distanza} className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
          <p className="font-bold mb-2">{distanza} m {stile}</p>
          {righe.map((r, i) => (
            <div key={r.atleta} className="flex items-center justify-between border-t border-gray-100 py-2.5 text-sm gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span className={`w-6 h-6 shrink-0 rounded-full text-xs font-bold flex items-center justify-center ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                <span className="truncate">
                  {ambito === 'Squadra' ? nomi[r.atleta] || 'Atleta' : r.extra || (fonte === 'Gare' ? 'Gara' : 'Allenamento')}
                  {r.quando && <span className="text-xs text-gray-400"> · {data(r.quando)}</span>}
                </span>
              </span>
              <b className="text-blue-600 shrink-0">{secondiInTempo(r.sec)}</b>
            </div>
          ))}
        </div>
      ))}
    </AppShell>
  )
}
