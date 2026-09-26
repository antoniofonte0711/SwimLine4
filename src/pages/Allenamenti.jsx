import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const TIPI_LAVORO = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

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

  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-black mb-6">Allenamento di oggi</h1>

      <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Tipo di lavoro</label>
          <select value={form.tipo_lavoro} onChange={(e) => setForm({ ...form, tipo_lavoro: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2">
            {TIPI_LAVORO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Distanza (m)</label>
          <input type="number" value={form.distanza} onChange={(e) => setForm({ ...form, distanza: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Parziale 50m</label>
          <input value={form.parziale_50} onChange={(e) => setForm({ ...form, parziale_50: e.target.value })}
            placeholder="00:32.10" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Tempo totale</label>
          <input value={form.tempo_totale} onChange={(e) => setForm({ ...form, tempo_totale: e.target.value })}
            placeholder="01:05.40" className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
        </div>

        <div className="col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Video o foto (facoltativo)</label>
          <input type="file" accept="video/*,image/*" onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
            className="w-full" />
        </div>

        <div className="col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Commento</label>
          <input value={form.commento} onChange={(e) => setForm({ ...form, commento: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2" />
        </div>

        <button type="submit" className="col-span-2 bg-blue-500 text-white font-semibold rounded-lg py-2 hover:bg-blue-600 transition">
          Aggiungi
        </button>
      </form>

      <h2 className="text-lg font-semibold text-black mb-3">Storico recente</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-black text-white text-left text-sm">
            <th className="p-2">Lavoro</th>
            <th className="p-2">Distanza</th>
            <th className="p-2">50m</th>
            <th className="p-2">Totale</th>
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr key={r.id} className="border-b border-gray-200 text-sm">
              <td className="p-2">{r.tipo_lavoro}</td>
              <td className="p-2">{r.distanza}m</td>
              <td className="p-2">{r.parziale_50 || '—'}</td>
              <td className="p-2 font-semibold">{r.tempo_totale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
