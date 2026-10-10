import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import CardPunti from '../components/CardPunti'
import { SenzaSquadra } from '../components/PianoCard'
import { PUNTI_DEFAULT, MSG_FASE10, usePunti } from '../lib/punti'
import { useMiaSquadra } from '../lib/pianoSquadra'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'
const CARD = 'bg-white rounded-3xl p-5 mb-3 shadow-[0_1px_2px_rgba(10,26,47,0.05)]'
const ESEMPI = [
  'Salta una serie dell\'allenamento',
  'Scegli l\'allenamento di domani',
  'Scegli una parte dell\'allenamento di domani',
  'Tuffi a fine allenamento (o altro, a scelta)',
]
const RARITA = [[1, 'Raro'], [3, 'Normale'], [6, 'Comune']]
const dataIt = (s) => (s ? new Date(s).toLocaleDateString('it-IT') : '')

// Atleta: punti, movimenti e premi vinti
function PuntiAtleta() {
  const { user, profile } = useAuth()
  const { pronto, movimenti, premi, errore } = usePunti(user, profile)
  return (
    <>
      <CardPunti dettaglio={false} />
      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}

      <div className={CARD}>
        <p className="font-bold mb-1">I tuoi premi</p>
        {pronto && premi.length === 0 && <p className="text-sm text-slate-500">Ancora nessun premio: continua ad accumulare punti.</p>}
        {premi.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between py-2.5 ${i ? 'border-t border-gray-100' : ''}`}>
            <div>
              <p className="font-semibold text-sm">🎁 {p.premio_nome}</p>
              <p className="text-xs text-slate-500">{dataIt(p.ottenuto_il)}</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.usato ? 'bg-gray-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>{p.usato ? 'Usato' : 'Da usare'}</span>
          </div>
        ))}
      </div>

      <div className={CARD}>
        <p className="font-bold mb-1">Movimenti</p>
        {pronto && movimenti.length === 0 && <p className="text-sm text-slate-500">Nessun movimento ancora.</p>}
        {movimenti.map((m, i) => (
          <div key={m.id} className={`flex items-center justify-between py-2.5 ${i ? 'border-t border-gray-100' : ''}`}>
            <div>
              <p className="text-sm font-semibold">{m.motivo}</p>
              <p className="text-xs text-slate-500">{dataIt(m.data)}</p>
            </div>
            <b className={m.punti >= 0 ? 'text-green-600' : 'text-red-500'}>{m.punti > 0 ? '+' : ''}{m.punti} punti</b>
          </div>
        ))}
      </div>
    </>
  )
}

// Coach: quanti punti dare, premi in palio, premi vinti da confermare
function PuntiCoach() {
  const { squadra, pronto } = useMiaSquadra()
  const [conf, setConf] = useState(PUNTI_DEFAULT)
  const [catalogo, setCatalogo] = useState([])
  const [vinti, setVinti] = useState([])
  const [nomi, setNomi] = useState({})
  const [nuovo, setNuovo] = useState({ nome: '', peso: 3 })
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')

  const carica = useCallback(async () => {
    if (!squadra) return
    const [c, cat, v, at] = await Promise.all([
      supabase.from('punti_config').select('*').eq('squadra_id', squadra.id).maybeSingle(),
      supabase.from('premi_catalogo').select('*').eq('squadra_id', squadra.id).order('created_at'),
      supabase.from('premi_atleta').select('*').eq('squadra_id', squadra.id).eq('usato', false).order('ottenuto_il'),
      supabase.from('profiles').select('id, nome, cognome').in('role', ['atleta', 'admin']).eq('squadra_id', squadra.id),
    ])
    if (cat.error) return setErrore(MSG_FASE10)
    setConf({ ...PUNTI_DEFAULT, ...(c.data || {}) })
    setCatalogo(cat.data || [])
    setVinti(v.data || [])
    setNomi(Object.fromEntries((at.data || []).map((a) => [a.id, `${a.nome} ${a.cognome || ''}`])))
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carica() }, [carica])

  const num = (k) => (e) => setConf({ ...conf, [k]: e.target.value })

  async function salvaConfig() {
    setErrore('')
    setOk('')
    const record = { squadra_id: squadra.id }
    for (const k of Object.keys(PUNTI_DEFAULT)) {
      const v = Number(conf[k])
      if (!Number.isInteger(v) || v < 0 || (k === 'soglia_premio' && v < 1)) return setErrore('Scrivi solo numeri interi (la soglia deve essere almeno 1).')
      record[k] = v
    }
    const { error } = await supabase.from('punti_config').upsert(record, { onConflict: 'squadra_id' })
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    setOk('Punti salvati. Valgono per i prossimi accrediti.')
  }

  async function aggiungiPremi(lista) {
    setErrore('')
    const { error } = await supabase.from('premi_catalogo').insert(lista.map((x) => ({ squadra_id: squadra.id, nome: x.nome, peso: x.peso })))
    if (error) return setErrore(error.message)
    setNuovo({ nome: '', peso: 3 })
    carica()
  }
  const aggiorna = async (id, patch) => { await supabase.from('premi_catalogo').update(patch).eq('id', id); carica() }
  const elimina = async (id) => {
    if (!window.confirm('Togliere questo premio dal catalogo?')) return
    await supabase.from('premi_catalogo').delete().eq('id', id)
    carica()
  }
  const usato = async (id) => {
    await supabase.from('premi_atleta').update({ usato: true, usato_il: new Date().toISOString() }).eq('id', id)
    carica()
  }

  if (!pronto) return <p className="text-center text-slate-500 py-8">Carico…</p>
  if (!squadra) return <SenzaSquadra />

  return (
    <>
      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}

      <div className={CARD}>
        <p className="font-bold mb-1">Premi da confermare</p>
        {vinti.length === 0 && <p className="text-sm text-slate-500">Nessun premio in attesa.</p>}
        {vinti.map((p, i) => (
          <div key={p.id} className={`flex items-center justify-between gap-2 py-2.5 ${i ? 'border-t border-gray-100' : ''}`}>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{nomi[p.atleta_id] || 'Atleta'}</p>
              <p className="text-xs text-slate-500">🎁 {p.premio_nome}</p>
            </div>
            <button onClick={() => usato(p.id)} className="shrink-0 text-xs font-bold text-white bg-blue-600 rounded-full px-3 py-1.5">Segna usato</button>
          </div>
        ))}
      </div>

      <div className={CARD}>
        <p className="font-bold mb-3">Quanti punti si guadagnano</p>
        <div className="grid grid-cols-2 gap-3">
          {[['punti_presenza', 'Presenza'], ['punti_risultati', 'Risultati inseriti'], ['punti_gara', 'Gara completata'], ['punti_miglioramento', 'Tempo migliorato'], ['soglia_premio', 'Punti per ogni premio']].map(([k, n]) => (
            <div key={k} className={k === 'soglia_premio' ? 'col-span-2' : ''}>
              <label className="block text-xs text-slate-500 mb-1">{n}</label>
              <input type="number" min="0" value={conf[k]} onChange={num(k)} className={CAMPO} />
            </div>
          ))}
        </div>
        {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-3">{ok}</p>}
        <button onClick={salvaConfig} className="w-full mt-3 font-bold text-white bg-blue-600 rounded-2xl py-3">Salva punti</button>
        <p className="text-xs text-slate-500 mt-2">I punti arrivano da soli: presenza segnata, risultati scritti, tempo di gara inserito. Il miglioramento scatta se batti il tuo miglior tempo sulla stessa gara.</p>
      </div>

      <div className={CARD}>
        <p className="font-bold mb-1">Premi in palio</p>
        <p className="text-xs text-slate-500 mb-2">Quando un atleta raggiunge la soglia, il premio viene estratto a caso. "Comune" esce più spesso di "Raro".</p>
        {catalogo.length === 0 && (
          <button onClick={() => aggiungiPremi(ESEMPI.map((nome) => ({ nome, peso: 3 })))} className="w-full text-blue-600 font-bold bg-blue-50 rounded-2xl py-2.5 text-sm mb-3">Aggiungi i premi di esempio</button>
        )}
        {catalogo.map((p, i) => (
          <div key={p.id} className={`py-2.5 ${i ? 'border-t border-gray-100' : ''} ${p.attivo ? '' : 'opacity-50'}`}>
            <p className="text-sm font-semibold mb-1.5">{p.nome}</p>
            <div className="flex items-center gap-2">
              <select value={p.peso} onChange={(e) => aggiorna(p.id, { peso: Number(e.target.value) })} className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-1 text-sm">
                {RARITA.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                {!RARITA.some(([v]) => v === p.peso) && <option value={p.peso}>Peso {p.peso}</option>}
              </select>
              <button onClick={() => aggiorna(p.id, { attivo: !p.attivo })} className="text-xs font-bold text-slate-600 bg-gray-100 rounded-full px-3 py-1.5">{p.attivo ? 'Disattiva' : 'Attiva'}</button>
              <button onClick={() => elimina(p.id)} className="text-xs font-bold text-red-500 ml-auto">Elimina</button>
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-3">
          <input value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} placeholder="Nuovo premio" className={CAMPO} />
          <select value={nuovo.peso} onChange={(e) => setNuovo({ ...nuovo, peso: Number(e.target.value) })} className="border border-gray-200 bg-gray-50 rounded-xl px-2">
            {RARITA.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </div>
        <button onClick={() => nuovo.nome.trim() && aggiungiPremi([{ nome: nuovo.nome.trim(), peso: nuovo.peso }])}
          className="w-full mt-2 font-bold text-blue-600 bg-blue-50 rounded-2xl py-2.5 text-sm">+ Aggiungi premio</button>
      </div>
    </>
  )
}

export default function Punti() {
  const { ruolo } = useAuth()
  return (
    <AppShell titolo="Punti e premi" attiva="funzioni" indietro="/funzioni">
      {ruolo === 'coach' ? <PuntiCoach /> : <PuntiAtleta />}
    </AppShell>
  )
}
