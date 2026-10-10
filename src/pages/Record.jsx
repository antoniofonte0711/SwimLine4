import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { caricaTutto } from '../lib/caricaTutto'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { STILI } from '../lib/lavori'
import { tempoInSecondi, secondiInTempo, normalizzaTempo, tempoValido, tempoPlausibile, erroreTempoImpossibile, ERRORE_TEMPO_BREVE } from '../lib/tempo'
import InputTempo from '../components/InputTempo'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'

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
  const [versione, setVersione] = useState(0)
  const [dettaglio, setDettaglio] = useState(null)

  useEffect(() => {
    async function carica() {
      setCarico(true)
      // nomi degli atleti visibili (coach: la sua squadra, atleta: i compagni)
      const { data: persone } = isCoach
        ? await supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin'])
        : await supabase.from('compagni_squadra').select('id, nome, cognome')
      const mappa = {}
      ;(persone || []).forEach((p) => { mappa[p.id] = `${p.nome} ${p.cognome}` })
      mappa[user.id] = `${profile?.nome || ''} ${profile?.cognome || ''}`.trim() || 'Io'
      setNomi(mappa)

      const [g, a] = await Promise.all([
        caricaTutto(() => supabase.from('gare').select('id, atleta_id, distanza, stile, tempo, nome_gara, data_gara, created_at')),
        caricaTutto(() => supabase.from('allenamenti').select('id, atleta_id, tipo_lavoro, distanza, stile, tempo_totale, passaggi, data_allenamento, created_at')),
      ])
      setGare(g.data || [])
      setAllenamenti(a.data || [])
      setCarico(false)
    }
    carica()
  }, [user.id, profile?.nome, profile?.cognome, isCoach, versione])

  // Riduce tutto a una lista unica: { atleta, distanza, stile, sec, quando }
  const voci = useMemo(() => {
    const lista = []
    if (fonte === 'Gare') {
      gare.forEach((g) => {
        const sec = tempoInSecondi(g.tempo)
        if (sec !== null) lista.push({ id: g.id, tabella: 'gare', idx: -1, tempo: g.tempo, creato: g.created_at, atleta: g.atleta_id, distanza: g.distanza, stile: g.stile, sec, quando: g.data_gara, extra: g.nome_gara })
      })
    } else {
      allenamenti.forEach((r) => {
        const tempi = r.passaggi?.length ? r.passaggi : r.tempo_totale ? [r.tempo_totale] : []
        const daPassaggi = !!r.passaggi?.length
        tempi.forEach((t, idx) => {
          const sec = tempoInSecondi(t)
          if (sec !== null && r.distanza) lista.push({ id: r.id, tabella: 'allenamenti', idx: daPassaggi ? idx : -1, tempo: t, creato: r.created_at, atleta: r.atleta_id, distanza: r.distanza, stile: r.stile || STILI[0], sec, quando: r.data_allenamento, extra: r.tipo_lavoro })
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
      <div className="bg-white rounded-3xl p-5 mb-3 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fonte</label>
            <select value={fonte} onChange={(e) => setFonte(e.target.value)} className={CAMPO}>
              <option>Gare</option>
              <option>Allenamenti</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Di chi</label>
            <select value={ambito} onChange={(e) => setAmbito(e.target.value)} className={CAMPO}>
              <option>I miei</option>
              <option>Squadra</option>
            </select>
          </div>
        </div>
        <label className="block text-xs text-slate-500 mb-1">Stile</label>
        <select value={stile} onChange={(e) => setStile(e.target.value)} className={CAMPO}>
          {STILI.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {carico && <p className="text-center text-slate-500 py-6">Carico i record…</p>}
      {!carico && classifiche.length === 0 && (
        <p className="text-center text-slate-500 py-6">Nessun tempo per questo stile 🏅</p>
      )}

      {classifiche.map(([distanza, righe]) => (
        <div key={distanza} className="bg-white rounded-3xl p-5 mb-3 shadow-[0_1px_2px_rgba(10,26,47,0.05)]">
          <p className="font-bold mb-2">{distanza} m {stile}</p>
          {righe.map((r, i) => (
            <div key={r.atleta} onClick={() => isCoach && setDettaglio(r)}
              className={`flex items-center justify-between border-t border-gray-100 py-2.5 text-sm gap-2 ${isCoach ? 'cursor-pointer active:bg-gray-50' : ''}`}>
              <span className="flex items-center gap-2 min-w-0">
                <span className={`w-6 h-6 shrink-0 rounded-full text-xs font-bold flex items-center justify-center ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-slate-500'}`}>{i + 1}</span>
                <span className="truncate">
                  {ambito === 'Squadra' ? nomi[r.atleta] || 'Atleta' : r.extra || (fonte === 'Gare' ? 'Gara' : 'Allenamento')}
                  {r.quando && <span className="text-xs text-slate-500"> · {data(r.quando)}</span>}
                </span>
              </span>
              <b className="text-blue-600 shrink-0">{secondiInTempo(r.sec)}</b>
            </div>
          ))}
        </div>
      ))}

      {dettaglio && (
        <DettaglioRecord voce={dettaglio} nome={nomi[dettaglio.atleta]} stile={stile}
          allenamenti={allenamenti}
          onChiudi={() => setDettaglio(null)}
          onFatto={() => { setDettaglio(null); setVersione((v) => v + 1) }} />
      )}
    </AppShell>
  )
}

// Il coach apre un record: vede quando è stato fatto e può cambiare il tempo o eliminarlo
function DettaglioRecord({ voce, nome, stile, allenamenti, onChiudi, onFatto }) {
  const [nuovo, setNuovo] = useState(voce.tempo || secondiInTempo(voce.sec))
  const [errore, setErrore] = useState('')
  const [lavoro, setLavoro] = useState(false)
  const riga = voce.tabella === 'allenamenti' ? allenamenti.find((a) => a.id === voce.id) : null
  const dataIt = voce.quando ? new Date(voce.quando + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const inserito = voce.creato ? new Date(voce.creato).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

  async function salva() {
    setErrore('')
    const t = normalizzaTempo(nuovo)
    if (!tempoValido(t)) return setErrore(ERRORE_TEMPO_BREVE)
    if (!tempoPlausibile(t, voce.distanza)) return setErrore(erroreTempoImpossibile(voce.distanza))
    setLavoro(true)
    let q
    if (voce.tabella === 'gare') q = supabase.from('gare').update({ tempo: t }).eq('id', voce.id)
    else if (voce.idx >= 0) q = supabase.from('allenamenti').update({ passaggi: (riga?.passaggi || []).map((p, i) => (i === voce.idx ? t : p)) }).eq('id', voce.id)
    else q = supabase.from('allenamenti').update({ tempo_totale: t }).eq('id', voce.id)
    const { error } = await q
    setLavoro(false)
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    onFatto()
  }

  async function elimina() {
    if (!window.confirm('Eliminare questo record? Il tempo sparisce anche dallo storico dell\'atleta.')) return
    setErrore('')
    setLavoro(true)
    let q
    if (voce.tabella === 'gare') q = supabase.from('gare').delete().eq('id', voce.id)
    else if (voce.idx >= 0) q = supabase.from('allenamenti').update({ passaggi: (riga?.passaggi || []).filter((_, i) => i !== voce.idx) }).eq('id', voce.id)
    else q = supabase.from('allenamenti').update({ tempo_totale: null }).eq('id', voce.id)
    const { error } = await q
    setLavoro(false)
    if (error) return setErrore('Non sono riuscito a eliminare: ' + error.message)
    onFatto()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onChiudi}>
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs text-slate-500">{voce.tabella === 'gare' ? 'Record di gara' : 'Record di allenamento'}</p>
        <p className="text-xl font-bold">{nome || 'Atleta'}</p>
        <p className="text-sm text-slate-500 mb-4">{voce.distanza} m {stile}{voce.extra ? ` · ${voce.extra}` : ''}</p>
        <p className="text-sm"><b>Realizzato il</b> {dataIt}</p>
        {inserito && <p className="text-xs text-slate-500 mb-4">Registrato il {inserito}</p>}
        <InputTempo etichetta="Tempo" value={nuovo} onChange={setNuovo} />
        {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mt-3">{errore}</p>}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={salva} disabled={lavoro} className="font-bold text-white bg-blue-600 disabled:opacity-60 rounded-2xl py-3">Cambia tempo</button>
          <button onClick={elimina} disabled={lavoro} className="font-bold text-red-600 bg-red-50 disabled:opacity-60 rounded-2xl py-3">Elimina</button>
        </div>
        <button onClick={onChiudi} className="w-full text-sm text-slate-500 mt-3 py-2">Chiudi</button>
      </div>
    </div>
  )
}
