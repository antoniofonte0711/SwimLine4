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

const TABELLA = 'allenamenti'
const TIPI_LAVORO = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const COLORI_LAVORO = {
  A1: 'bg-green-100 text-green-700',
  A2: 'bg-blue-100 text-blue-700',
  B1: 'bg-yellow-100 text-yellow-700',
  B2: 'bg-orange-100 text-orange-700',
  C1: 'bg-red-100 text-red-700',
  C2: 'bg-purple-100 text-purple-700',
}
const FORM_VUOTO = { tipo_lavoro: 'A2', distanza: 100, parziale_50: '', tempo_totale: '', commento: '', file: null }

export default function Allenamenti() {
  const { user } = useAuth()
  const online = useOnline()
  const [righe, setRighe] = useState([])
  const [coda, setCoda] = useState([])
  const [form, setForm] = useState(FORM_VUOTO)
  const [fileKey, setFileKey] = useState(0)
  const [errore, setErrore] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [filtroDistanza, setFiltroDistanza] = useState('tutte')
  const [filtroLavoro, setFiltroLavoro] = useState('tutti')

  useEffect(() => {
    aggiorna()
  }, [online])

  async function aggiorna() {
    if (navigator.onLine) await sincronizza(supabase, TABELLA, user.id)
    setCoda(leggiCoda(TABELLA, user.id))
    await loadRighe()
  }

  async function loadRighe() {
    const { data, error } = await supabase
      .from(TABELLA)
      .select('*')
      .eq('atleta_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (!error && data) {
      setRighe(data)
      salvaCache(TABELLA, user.id, data)
    } else {
      setRighe(leggiCache(TABELLA, user.id))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrore('')

    const tempo_totale = normalizzaTempo(form.tempo_totale)
    const parziale_50 = normalizzaTempo(form.parziale_50)

    if (!tempoValido(tempo_totale)) {
      setErrore(ERRORE_TEMPO)
      return
    }
    if (parziale_50 && !tempoValido(parziale_50)) {
      setErrore('Parziale non valido. ' + ERRORE_TEMPO)
      return
    }
    if (form.file && !navigator.onLine) {
      setErrore('Sei offline: il video non si può caricare adesso. Togli il file oppure riprova con la connessione.')
      return
    }

    setSalvando(true)

    let video_url = null
    if (form.file) {
      const filePath = `${user.id}/${Date.now()}_${form.file.name}`
      const { error: uploadError } = await supabase.storage
        .from('video-allenamenti')
        .upload(filePath, form.file)
      if (uploadError) {
        setErrore('Caricamento del video non riuscito. Nulla è stato salvato, riprova.')
        setSalvando(false)
        return
      }
      const { data } = supabase.storage.from('video-allenamenti').getPublicUrl(filePath)
      video_url = data.publicUrl
    }

    const record = {
      id: crypto.randomUUID(),
      atleta_id: user.id,
      tipo_lavoro: form.tipo_lavoro,
      distanza: Number(form.distanza),
      parziale_50: parziale_50 || null,
      tempo_totale,
      commento: form.commento || null,
      video_url,
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
    setFileKey((k) => k + 1)
    setCoda(leggiCoda(TABELLA, user.id))
    if (!inCoda) await loadRighe()
    setSalvando(false)
  }

  async function elimina(riga) {
    if (!window.confirm('Vuoi eliminare questo tempo?')) return
    if (riga.inAttesa) {
      rimuoviDaCoda(TABELLA, riga.id)
      setCoda(leggiCoda(TABELLA, user.id))
      return
    }
    const { error } = await supabase.from(TABELLA).delete().eq('id', riga.id)
    if (error) {
      window.alert('Non sono riuscito a eliminarlo: ' + error.message)
      return
    }
    loadRighe()
  }

  const tutte = [...coda.map((r) => ({ ...r, inAttesa: true })), ...righe].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )

  const distanze = [...new Set(tutte.map((r) => r.distanza))].sort((a, b) => a - b)

  const datiGrafico = tutte
    .filter((r) => filtroDistanza === 'tutte' || r.distanza === Number(filtroDistanza))
    .filter((r) => filtroLavoro === 'tutti' || r.tipo_lavoro === filtroLavoro)
    .slice()
    .reverse()
    .map((r) => ({ data: formattaData(r.created_at), tempo: tempoInSecondi(r.tempo_totale) }))
    .filter((d) => d.tempo !== null)

  const selectFiltro = 'border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold text-black mb-6">🏊 Allenamento di oggi</h1>

        {!online && (
          <p className="text-sm bg-yellow-100 text-yellow-800 rounded-xl px-4 py-3 mb-4">
            📴 Sei offline: i tempi vengono salvati sul telefono e inviati appena torna la connessione.
          </p>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-blue-100 shadow-sm rounded-2xl p-6 mb-8 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo di lavoro</label>
            <select value={form.tipo_lavoro} onChange={(e) => setForm({ ...form, tipo_lavoro: e.target.value })}
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400">
              {TIPI_LAVORO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Distanza (m)</label>
            <input type="number" value={form.distanza} onChange={(e) => setForm({ ...form, distanza: e.target.value })}
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parziale 50m</label>
            <input value={form.parziale_50} onChange={(e) => setForm({ ...form, parziale_50: e.target.value })}
              placeholder={`0'32"10`} className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tempo totale</label>
            <input value={form.tempo_totale} onChange={(e) => setForm({ ...form, tempo_totale: e.target.value })}
              placeholder={ESEMPIO_TEMPO} className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Video o foto (facoltativo)</label>
            <input key={fileKey} type="file" accept="video/*,image/*" onChange={(e) => setForm({ ...form, file: e.target.files[0] || null })}
              className="w-full text-sm" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Commento</label>
            <input value={form.commento} onChange={(e) => setForm({ ...form, commento: e.target.value })}
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          {errore && <p className="col-span-2 text-sm text-white bg-red-500 rounded-lg px-3 py-2">{errore}</p>}

          <button type="submit" disabled={salvando}
            className="col-span-2 bg-blue-500 text-white font-bold rounded-xl py-3 hover:bg-blue-600 active:scale-[0.98] transition shadow-lg shadow-blue-200 disabled:opacity-60">
            {salvando ? 'Salvataggio...' : '➕ Aggiungi'}
          </button>
        </form>

        <h2 className="text-lg font-bold text-black mb-3">📈 I tuoi progressi</h2>
        <div className="flex gap-2 mb-3">
          <select value={filtroDistanza} onChange={(e) => setFiltroDistanza(e.target.value)} className={selectFiltro}>
            <option value="tutte">Tutte le distanze</option>
            {distanze.map((d) => <option key={d} value={d}>{d} m</option>)}
          </select>
          <select value={filtroLavoro} onChange={(e) => setFiltroLavoro(e.target.value)} className={selectFiltro}>
            <option value="tutti">Tutti i lavori</option>
            {TIPI_LAVORO.map((t) => <option key={t} value={t}>{t}</option>)}
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
                  <Line type="monotone" dataKey="tempo" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center text-gray-300">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm text-gray-400">Servono almeno due tempi con questi filtri<br />per mostrare il grafico.</p>
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-black mb-3">Storico recente</h2>
        <div className="space-y-2">
          {tutte.map((r) => (
            <div key={r.id} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex items-center justify-between hover:shadow-md transition">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${COLORI_LAVORO[r.tipo_lavoro] || 'bg-gray-100 text-gray-700'}`}>
                  {r.tipo_lavoro}
                </span>
                <span className="text-sm text-gray-500">{r.distanza}m</span>
                {r.parziale_50 && <span className="text-sm text-gray-400">50m: {r.parziale_50}</span>}
                {r.inAttesa && <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">⏳ da inviare</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-extrabold text-blue-600">{r.tempo_totale}</span>
                <button onClick={() => elimina(r)} title="Elimina" className="text-gray-300 hover:text-red-500 transition">🗑️</button>
              </div>
            </div>
          ))}
          {tutte.length === 0 && (
            <p className="text-center text-gray-300 py-6">Nessun allenamento ancora — inizia ad aggiungerne uno! 🏊</p>
          )}
        </div>
      </div>
    </div>
  )
}