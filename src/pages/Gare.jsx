import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Gare() {
  const { user } = useAuth()
  const [gare, setGare] = useState([])
  const [form, setForm] = useState({ nome_gara: '', distanza: 100, stile: 'stile libero', tempo: '', data_gara: '' })

  useEffect(() => {
    loadGare()
  }, [])

  async function loadGare() {
    const { data } = await supabase
      .from('gare')
      .select('*')
      .eq('atleta_id', user.id)
      .order('data_gara', { ascending: false })
    setGare(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await supabase.from('gare').insert({
      atleta_id: user.id,
      nome_gara: form.nome_gara,
      distanza: Number(form.distanza),
      stile: form.stile,
      tempo: form.tempo,
      data_gara: form.data_gara,
    })
    setForm({ nome_gara: '', distanza: 100, stile: 'stile libero', tempo: '', data_gara: '' })
    loadGare()
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-black mb-6">Le tue gare</h1>

      <form onSubmit={handleSubmit} className="bg-black text-white rounded-2xl p-6 mb-8 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm mb-1">Nome gara</label>
          <input value={form.nome_gara} onChange={(e) => setForm({ ...form, nome_gara: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-black" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Distanza (m)</label>
          <input type="number" value={form.distanza} onChange={(e) => setForm({ ...form, distanza: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-black" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Stile</label>
          <select value={form.stile} onChange={(e) => setForm({ ...form, stile: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-black">
            <option>stile libero</option>
            <option>dorso</option>
            <option>rana</option>
            <option>farfalla</option>
            <option>misti</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Tempo</label>
          <input value={form.tempo} onChange={(e) => setForm({ ...form, tempo: e.target.value })}
            placeholder="01:02.35" className="w-full rounded-lg px-3 py-2 text-black" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Data</label>
          <input type="date" value={form.data_gara} onChange={(e) => setForm({ ...form, data_gara: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-black" required />
        </div>
        <button type="submit" className="col-span-2 bg-blue-500 rounded-lg py-2 font-semibold hover:bg-blue-600 transition">
          Aggiungi gara
        </button>
      </form>

      <div className="space-y-3">
        {gare.map((g) => (
          <div key={g.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-black">{g.nome_gara}</p>
              <p className="text-sm text-gray-500">{g.distanza}m {g.stile} · {g.data_gara}</p>
            </div>
            <p className="text-xl font-bold text-blue-600">{g.tempo}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
