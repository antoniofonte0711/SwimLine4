import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
  ESEMPIO_TEMPO, ERRORE_TEMPO, normalizzaTempo, tempoValido,
  tempoInSecondi, secondiInTempo, formattaData,
} from '../lib/tempo'
import {
  leggiCoda, aggiungiInCoda, rimuoviDaCoda, sincronizza,
  salvaCache, leggiCache, erroreDiRete, useOnline,
} from '../lib/codaOffline'

const TABELLA = 'gare'
const STILI = ['stile libero', 'dorso', 'rana', 'farfalla', 'misti']
const FORM_VUOTO = { nome_gara: '', distanza: 100, stile: 'stile libero', tempo: '', data_gara: '' }

const emojiStile = {
  'stile libero': '🏊',
  dorso: '🔄',
  rana: '🐸',
  farfalla: '🦋',
  misti: '🎯',
}

export default function Gare() {
  const { user } = useAuth()
  const online = useOnline()
  const [gare, setGare] = useState([])
  const [coda, setCoda] = useState([])
  const [form, setForm] = useState(FORM_VUOTO)
  const [errore, setErrore] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [filtroDistanza, setFiltroDistanza] = useState('tutte')
  const [filtroStile, setFiltroStile] = useState('tutti')

  useEffect(() => {
    aggiorna()
  }, [online])

  async function aggiorna() {
    if (navigator.onLine) await sincronizza(supabase, TABELLA, user.id)
    setCoda(leggiCoda(TABELLA, user.id))
    await loadGare()
  }

  async function loadGare() {
    const { data, error } = await supabase
      .from(TABELLA)
      .select('*')
      .eq('atleta_id', user.id)
      .order('data_gara', { ascending: false })
      .limit(200)
    if (!error && data) {
      setGare(data)
      salvaCache(TABELLA, user.id, data)
    } else {
      setGare(leggiCache(TABELLA, user.id))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrore('')

    const tempo = normalizzaTempo(form.tempo)
    if (!tempoValido(tempo)) {
      setErrore(ERRORE_TEMPO)
      return
    }

    setSalvando(true)

    const record = {
      id: crypto.randomUUID(),
      atleta_id: user.id,
      nome_gara: form.nome_gara,
      distanza: Number(form.distanza),
      stile: form.stile,
      tempo,
      data_gara: form.data_gara,
      created_at: new Date().toISOString(),
    }

    let inCoda = !navigator.onLine
    if (!inCoda) {
      const { error } = await supabase.from(TABELLA).insert(record)
      if (error) {
        if (erroreDiRete(error)) inCoda = true
        else {
          setErrore('Non sono riuscito a salvare: ' + error.message)
          setSalvando(false)
          return
        }
      }
    }
    if (inCoda) aggiungiInCoda(TABELLA, record)

    setForm(FORM_VUOTO)
    setCoda(leggiCoda(TABELLA, user.id))
    if (!inCoda) await loadGare()
    setSalvando(false)
  }

  async function elimina(gara) {
    if (!window.confirm('Vuoi eliminare questa gara?')) return
    if (gara.inAttesa) {
      rimuoviDaCoda(TABELLA, gara.id)
      setCoda(leggiCoda(TABELLA, user.id))
      return
    }
    const { error } = await supabase.from(TABELLA).delete().eq('id', gara.id)
    if (error) {
      window.alert('Non sono riuscito a eliminarla: ' + error.message)
      return
    }
    loadGare()
  }

  const tutte = [...coda.map((g) => ({ ...g, inAttesa: true })), ...gare].sort(
    (a, b) => String(b.data_gara).localeCompare(String(a.data_gara))
  )

  const distanze = [...new Set(tutte.map((g) => g.distanza))].sort((a, b) => a - b)

  const datiGrafico = tutte
    .filter((g) => filtroDistanza === 'tutte' || g.distanza === Number(filtroDistanza))
    .filter((g) => filtroStile === 'tutti' || g.stile === filtroStile)
    .slice()
    .reverse()
    .map((g) => ({ data: formattaData(g.data_gara), tempo: tempoInSecondi(g.tempo) }))
    .filter((d) => d.tempo !== null)

  const selectFiltro = 'border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold text-black mb-6">🏆 Le tue gare</h1>

        {!online && (
          <p className="text-sm bg-yellow-100 text-yellow-800 rounded-xl px-4 py-3 mb-4">
            📴 Sei offline: le gare vengono salvate sul telefono e inviate appena torna la connessione.
          </p>
        )}

        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-black to-gray-800 text-white rounded-2xl shadow-lg p-6 mb-8 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm mb-1 text-gray-300">Nome gara</label>
            <input value={form.nome_gara} onChange={(e) => setForm({ ...form, nome_gara: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-300">Distanza (m)</label>
            <input type="number" value={form.distanza} onChange={(e) => setForm({ ...form, distanza: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-300">Stile</label>
            <select value={form.stile} onChange={(e) => setForm({ ...form, stile: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-blue-400">
              {STILI.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-300">Tempo</label>
            <input value={form.tempo} onChange={(e) => setForm({ ...form, tempo: e.target.value })}
              placeholder={ESEMPIO_TEMPO} className="w-full rounded-xl px-3 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-300">Data</label>
            <input type="date" value={form.data_gara} onChange={(e) => setForm({ ...form, data_gara: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>

          {errore && <p className="col-span-2 text-sm text-white bg-red-500 rounded-lg px-3 py-2">{errore}</p>}

          <button type="submit" disabled={salvando}
            className="col-span-2 bg-blue-500 rounded-xl py-3 font-bold hover:bg-blue-600 active:scale-[0.98] transition shadow-lg disabled:opacity-60">
            {salvando ? 'Salvataggio...' : '🏁 Aggiungi gara'}
          </button>
        </form>

        <h2 className="text-lg font-bold text-black mb-3">📈 I tuoi progressi in gara</h2>
        <div className="flex gap-2 mb-3">
          <select value={filtroDistanza} onChange={(e) => setFiltroDistanza(e.target.value)} className={selectFiltro}>
            <option value="tutte">Tutte le distanze</option>
            {distanze.map((d) => <option key={d} value={d}>{d} m</option>)}
          </select>
          <select value={filtroStile} onChange={(e) => setFiltroStile(e.target.value)} className={selectFiltro}>
            <option value="tutti">Tutti gli stili</option>
            {STILI.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="bg-white border border-blue-100 shadow-sm rounded-2xl p-4 mb-8">
          {datiGrafico.length >= 2 ? (
            <div style={{ width: '100%', height: 224 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datiGrafico}>
                  <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} width={62} reversed domain={['auto', 'auto']} tickFormatter={secondiInTempo} />
                  <Tooltip formatter={(v) => secondiInTempo(v)} />
                  <Line type="monotone" dataKey="tempo" stroke="#000000" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center text-gray-300">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-sm text-gray-400">Servono almeno due gare con questi filtri<br />per mostrare il grafico.</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {tutte.map((g) => (
            <div key={g.id} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex justify-between items-center hover:shadow-md hover:-translate-y-0.5 transition">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{emojiStile[g.stile] || '🏊'}</span>
                <div>
                  <p className="font-bold text-black">{g.nome_gara}</p>
                  <p className="text-sm text-gray-400">
                    {g.distanza}m {g.stile} · {g.data_gara}
                    {g.inAttesa && <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">⏳ da inviare</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xl font-extrabold text-blue-600">{g.tempo}</p>
                <button onClick={() => elimina(g)} title="Elimina" className="text-gray-300 hover:text-red-500 transition">🗑️</button>
              </div>
            </div>
          ))}
          {tutte.length === 0 && (
            <p className="text-center text-gray-300 py-6">Nessuna gara ancora — aggiungi la tua prima! 🏆</p>
          )}
        </div>
      </div>
    </div>
  )
}