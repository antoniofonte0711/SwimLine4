import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import PianoCard from '../components/PianoCard'
import { coloreLavoro, dataLocale, formattaGiorno } from '../lib/lavori'
import { useMiaSquadra } from '../lib/pianoSquadra'

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const INTEST = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const PRES = { presente: 'bg-green-500', assente: 'bg-red-500', non_penale: 'bg-amber-400' }

// Calendario: allenamenti e gare del mese. Il coach vede anche quanti atleti c'erano (es. 12/15).
export default function Calendario() {
  const { user, isCoach } = useAuth()
  const { squadra } = useMiaSquadra()
  const oggi = dataLocale()
  const base = new Date()
  const [anno, setAnno] = useState(base.getFullYear())
  const [mese, setMese] = useState(base.getMonth())
  const [scelto, setScelto] = useState(oggi)
  const [piani, setPiani] = useState([])
  const [gare, setGare] = useState([])
  const [presenze, setPresenze] = useState([])
  const [nAtleti, setNAtleti] = useState(0)
  const [miei, setMiei] = useState([]) // lavori fatti dall'atleta nel giorno scelto

  const da = dataLocale(new Date(anno, mese, 1, 12))
  const a = dataLocale(new Date(anno, mese + 1, 0, 12))

  useEffect(() => {
    let attivo = true
    async function carica() {
      const [{ data: g }, pianiRes] = await Promise.all([
        supabase.from('gare').select('id, atleta_id, nome_gara, data_gara, distanza, stile').gte('data_gara', da).lte('data_gara', a),
        squadra
          ? supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id).gte('data', da).lte('data', a)
          : Promise.resolve({ data: [] }),
      ])
      let pr = []
      let n = 0
      if (isCoach && squadra) {
        const { data: at } = await supabase.from('profiles').select('id').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id)
        const ids = (at || []).map((x) => x.id)
        n = ids.length
        if (ids.length) {
          const r = await supabase.from('presenze').select('atleta_id, data, stato').in('atleta_id', ids).gte('data', da).lte('data', a)
          pr = r.data || []
        }
      } else {
        const r = await supabase.from('presenze').select('atleta_id, data, stato').eq('atleta_id', user.id).gte('data', da).lte('data', a)
        pr = r.data || []
      }
      if (!attivo) return
      setGare(g || [])
      setPiani(pianiRes.data || [])
      setPresenze(pr)
      setNAtleti(n)
    }
    carica()
    return () => { attivo = false }
  }, [da, a, squadra?.id, isCoach, user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lavori che l'atleta ha registrato nel giorno scelto
  useEffect(() => {
    if (isCoach) return setMiei([])
    let attivo = true
    supabase.from('allenamenti').select('*').eq('atleta_id', user.id).eq('data_allenamento', scelto).order('created_at')
      .then(({ data }) => { if (attivo) setMiei(data || []) })
    return () => { attivo = false }
  }, [scelto, isCoach, user.id])

  const perGiorno = useMemo(() => {
    const m = {}
    const dentro = (d) => (m[d] ||= { piano: null, gare: [], presenti: 0, stato: null })
    piani.forEach((p) => { dentro(p.data).piano = p })
    gare.forEach((g) => { dentro(g.data_gara).gare.push(g) })
    presenze.forEach((p) => {
      const x = dentro(p.data)
      if (p.stato === 'presente') x.presenti += 1
      if (!isCoach) x.stato = p.stato
    })
    return m
  }, [piani, gare, presenze, isCoach])

  const vaiMese = (n) => {
    const d = new Date(anno, mese + n, 1)
    setAnno(d.getFullYear())
    setMese(d.getMonth())
  }
  const vuote = (new Date(anno, mese, 1).getDay() + 6) % 7
  const giorniMese = new Date(anno, mese + 1, 0).getDate()
  const celle = [...Array(vuote).fill(null), ...Array.from({ length: giorniMese }, (_, i) => i + 1)]
  const iso = (g) => dataLocale(new Date(anno, mese, g, 12))

  const info = perGiorno[scelto] || { piano: null, gare: [], presenti: 0 }
  const gareGiorno = Object.values(info.gare.reduce((acc, g) => {
    const k = g.nome_gara || 'Gara'
    ;(acc[k] ||= { nome: k, atleti: new Set() }).atleti.add(g.atleta_id)
    return acc
  }, {}))

  return (
    <AppShell titolo="Calendario" attiva="funzioni" indietro="/funzioni">
      <div className="bg-white border border-gray-100 rounded-3xl p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => vaiMese(-1)} aria-label="Mese precedente" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 text-xl font-bold active:scale-90 transition">‹</button>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={`${anno}-${mese}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}
              className="font-bold">{MESI[mese]} {anno}</motion.p>
          </AnimatePresence>
          <button onClick={() => vaiMese(1)} aria-label="Mese successivo" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 text-xl font-bold active:scale-90 transition">›</button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">
          {INTEST.map((l, i) => <span key={i}>{l}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {celle.map((g, i) => {
            if (!g) return <span key={i} />
            const d = iso(g)
            const x = perGiorno[d]
            const sel = d === scelto
            return (
              <button key={d} onClick={() => setScelto(d)}
                className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center text-sm transition active:scale-90 ${
                  sel ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : d === oggi ? 'bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-300' : 'text-gray-700'
                }`}>
                <span className="font-semibold">{g}</span>
                <span className="flex items-center gap-0.5 h-3">
                  {x?.piano && <span className={`w-1.5 h-1.5 rounded-full ${sel ? 'bg-white' : 'bg-blue-500'}`} />}
                  {x?.gare.length > 0 && <span className="text-[9px] leading-none">🏆</span>}
                  {!isCoach && x?.stato && <span className={`w-1.5 h-1.5 rounded-full ${PRES[x.stato]}`} />}
                </span>
                {isCoach && nAtleti > 0 && x && (x.presenti > 0 || x.piano) && (
                  <span className={`absolute -bottom-0.5 text-[9px] font-bold ${sel ? 'text-blue-100' : 'text-gray-400'}`}>{x.presenti}/{nAtleti}</span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">● allenamento · 🏆 gara{isCoach ? ' · 12/15 = presenti su atleti' : ' · pallino verde/rosso = tua presenza'}</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={scelto} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <p className="text-sm font-semibold text-gray-500 capitalize mb-2 px-1">{scelto === oggi ? 'Oggi · ' : ''}{formattaGiorno(scelto)}</p>

          {info.piano
            ? <>
                {isCoach && !info.piano.pubblicato && <p className="text-xs font-bold text-amber-700 mb-1 px-1">Bozza, non ancora pubblicata</p>}
                <PianoCard piano={info.piano} />
              </>
            : <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-3xl p-5 text-center shadow-sm mb-3">Nessun allenamento in questo giorno.</p>}

          {isCoach && (
            <div className="flex gap-2 mb-3">
              <Link to={`/allenamenti?data=${scelto}`} className="flex-1 text-center text-sm font-bold text-blue-600 bg-blue-50 rounded-2xl py-3">{info.piano ? 'Apri allenamento' : 'Crea allenamento'}</Link>
              {info.piano && <Link to={`/risultati?data=${scelto}`} className="flex-1 text-center text-sm font-bold text-white bg-blue-600 rounded-2xl py-3">Risultati</Link>}
            </div>
          )}

          {!isCoach && miei.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-3">
              <p className="font-bold mb-1">I tuoi lavori</p>
              {miei.map((r, i) => (
                <div key={r.id} className={`py-2 ${i ? 'border-t border-gray-100' : ''}`}>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
                  <span className="text-sm text-gray-600 ml-2">{r.ripetizioni ? `${r.ripetizioni}×` : ''}{r.distanza} m {r.stile || ''}</span>
                  {r.passaggi?.length > 0 && <p className="text-xs text-gray-400 mt-1">{r.passaggi.map((p) => p || '–').join(' · ')}</p>}
                </div>
              ))}
            </div>
          )}

          {gareGiorno.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-3">
              <p className="font-bold mb-1">🏆 Gare</p>
              {gareGiorno.map((g, i) => (
                <p key={g.nome} className={`text-sm py-2 ${i ? 'border-t border-gray-100' : ''}`}>
                  {g.nome} <span className="text-gray-400">· {g.atleti.size} {g.atleti.size === 1 ? 'atleta' : 'atleti'}</span>
                </p>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
