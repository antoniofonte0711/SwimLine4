import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

function tempoInSecondi(tempo) {
  const m = tempo?.match(/(\d+):(\d+)\.(\d+)/)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 100
}

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

  const datiGrafico = gare
    .slice()
    .reverse()
    .map((g, i) => ({ gara: i + 1, tempo: tempoInSecondi(g.tempo) }))
    .filter((d) => d.tempo !== null)

  const emojiStile = {
    'stile libero': '🏊',
    dorso: '🔄',
    rana: '🐸',
    farfalla: '🦋',
    misti: '🎯',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold text-black mb-6">🏆 Le tue gare</h1>

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
              <option>stile libero</option>
              <option>dorso</option>
              <option>rana</option>
              <option>farfalla</option>
              <option>misti</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-300">Tempo</label>
            <input value={form.tempo} onChange={(e) => setForm({ ...form, tempo: e.target.value })}
              placeholder="01:02.35" className="w-full rounded-xl px-3 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-300">Data</label>
            <input type="date" value={form.data_gara} onChange={(e) => setForm({ ...form, data_gara: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-blue-400" required />
          </div>
          <button type="submit" className="col-span-2 bg-blue-500 rounded-xl py-3 font-bold hover:bg-blue-600 active:scale-[0.98] transition shadow-lg">
            🏁 Aggiungi gara
          </button>
        </form>

        <h2 className="text-lg font-bold text-black mb-3">📈 I tuoi progressi in gara</h2>
        <div className="bg-white border border-blue-100 shadow-sm rounded-2xl p-6 mb-8 h-56 flex items-center justify-center">
          {datiGrafico.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datiGrafico}>
                <XAxis dataKey="gara" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} reversed />
                <Tooltip formatter={(v) => v.toFixed(2) + ' sec'} />
                <Line type="monotone" dataKey="tempo" stroke="#000000" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-300">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-sm text-gray-400">Il grafico delle tue gare apparirà qui<br />appena avrai inserito almeno due gare!</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {gare.map((g) => (
            <div key={g.id} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4 flex justify-between items-center hover:shadow-md hover:-translate-y-0.5 transition">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{emojiStile[g.stile] || '🏊'}</span>
                <div>
                  <p className="font-bold text-black">{g.nome_gara}</p>
                  <p className="text-sm text-gray-400">{g.distanza}m {g.stile} · {g.data_gara}</p>
                </div>
              </div>
              <p className="text-xl font-extrabold text-blue-600">{g.tempo}</p>
            </div>
          ))}
          {gare.length === 0 && (
            <p className="text-center text-gray-300 py-6">Nessuna gara ancora — aggiungi la tua prima! 🏆</p>
          )}
        </div>
      </div>
    </div>
  )
}