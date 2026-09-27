import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const TIPI_LAVORO = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const COLORI_LAVORO = {
  A1: 'bg-green-100 text-green-700',
  A2: 'bg-blue-100 text-blue-700',
  B1: 'bg-yellow-100 text-yellow-700',
  B2: 'bg-orange-100 text-orange-700',
  C1: 'bg-red-100 text-red-700',
  C2: 'bg-purple-100 text-purple-700',
}

function tempoInSecondi(tempo) {
  const m = tempo?.match(/(\d+):(\d+)\.(\d+)/)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 100
}

export default function Allenamenti() {
  const { user } = useAuth()
  const [righe, setRighe] = useState([])
  const [form, setForm] = useState({
    tipo_lavoro: 'A2',
    distanza: 100,
    parziale_50: '',
    tempo_totale: '',
    commento: '',
    file: null,
  })

  useEffect(() => {
    loadRighe()
  }, [])

  async function loadRighe() {
    const { data } = await supabase
      .from('allenamenti')
      .select('*')
      .eq('atleta_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setRighe(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()

    let video_url = null
    if (form.file) {
      const filePath = `${user.id}/${Date.now()}_${form.file.name}`
      const { error: uploadError } = await supabase.storage
        .from('video-allenamenti')
        .upload(filePath, form.file)
      if (!uploadError) {
        const { data } = supabase.storage.from('video-allenamenti').getPublicUrl(filePath)
        video_url = data.publicUrl
      }
    }

    await supabase.from('allenamenti').insert({
      atleta_id: user.id,
      tipo_lavoro: form.tipo_lavoro,
      distanza: Number(form.distanza),
      parziale_50: form.parziale_50 || null,
      tempo_totale: form.tempo_totale,
      commento: form.commento || null,
      video_url,
    })

    setForm({ tipo_lavoro: 'A2', distanza: 100, parziale_50: '', tempo_totale: '', commento: '', file: null })
    loadRighe()
  }

  const datiGrafico = righe
    .slice()
    .reverse()
    .map((r, i) => ({ sessione: i + 1, tempo: tempoInSecondi(r.tempo_totale) }))
    .filter((d) => d.tempo !== null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold text-black mb-6">🏊 Allenamento di oggi</h1>

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
              placeholder="00:32.10" className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tempo totale</label>
            <input value={form.tempo_totale} onChange={(e) => setForm({ ...form, tempo_totale: e.target.value })}
              placeholder="01:05.40" className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Video o foto (facoltativo)</label>
            <input type="file" accept="video/*,image/*" onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
              className="w-full text-sm" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Commento</label>
            <input value={form.commento} onChange={(e) => setForm({ ...form, commento: e.target.value })}
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <button type="submit" className="col-span-2 bg-blue-500 text-white font-bold rounded-xl py-3 hover:bg-blue-600 active:scale-[0.98] transition shadow-lg shadow-blue-200">
            ➕ Aggiungi
          </button>
        </form>

        <h2 className="text-lg font-bold text-black mb-3">📈 I tuoi progressi</h2>
        <div className="bg-white border border-blue-100 shadow-sm rounded-2xl p-6 mb-8 h-56 flex items-center justify-center">
          {datiGrafico.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datiGrafico}>
                <XAxis dataKey="sessione" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} reversed />
                <Tooltip formatter={(v) => v.toFixed(2) + ' sec'} />
                <Line type="monotone" dataKey="tempo" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-300">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-sm text-gray-400">Il tuo grafico dei progressi apparirà qui<br />appena avrai inserito qualche tempo!</p>
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-black mb-3">Storico recente</h2>
        <div className="space-y-2">
          {righe.map((r) => (
            <div key={r.id} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex items-center justify-between hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${COLORI_LAVORO[r.tipo_lavoro] || 'bg-gray-100 text-gray-700'}`}>
                  {r.tipo_lavoro}
                </span>
                <span className="text-sm text-gray-500">{r.distanza}m</span>
                {r.parziale_50 && <span className="text-sm text-gray-400">50m: {r.parziale_50}</span>}
              </div>
              <span className="text-lg font-extrabold text-blue-600">{r.tempo_totale}</span>
            </div>
          ))}
          {righe.length === 0 && (
            <p className="text-center text-gray-300 py-6">Nessun allenamento ancora — inizia ad aggiungerne uno! 🏊</p>
          )}
        </div>
      </div>
    </div>
  )
}