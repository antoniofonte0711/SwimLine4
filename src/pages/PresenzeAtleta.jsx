import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import AppShell from '../components/AppShell'
import { riepilogoPresenze, STATI } from '../lib/presenze'

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

// Coach: presenze complete di un atleta, con percentuale totale e per mese
export default function PresenzeAtleta() {
  const { id } = useParams()
  const [nome, setNome] = useState('')
  const [righe, setRighe] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('nome, cognome').eq('id', id).maybeSingle().then(({ data }) => setNome(data ? `${data.nome} ${data.cognome || ''}` : ''))
    supabase.from('presenze').select('data, stato').eq('atleta_id', id).order('data', { ascending: false }).limit(1000)
      .then(({ data }) => setRighe(data || []))
  }, [id])

  const tot = riepilogoPresenze(righe)
  const grafico = useMemo(() => {
    const perMese = {}
    righe.forEach((r) => { (perMese[r.data.slice(0, 7)] ||= []).push(r) })
    return Object.keys(perMese).sort().map((k) => ({
      mese: `${MESI[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}`,
      percentuale: riepilogoPresenze(perMese[k]).percentuale ?? 0,
    }))
  }, [righe])
  const assenze = righe.filter((r) => r.stato !== 'presente')

  return (
    <AppShell titolo="Presenze" attiva="funzioni" indietro="/squadra">
      <div className="bg-blue-600 text-white rounded-3xl p-5 mb-3 shadow-lg shadow-blue-200">
        <p className="text-sm text-blue-100">{nome}</p>
        <p className="text-4xl font-extrabold mt-1">{tot.percentuale === null ? '—' : `${tot.percentuale}%`}</p>
        <p className="text-sm text-blue-100">{tot.presenti} presenze · {tot.assenti} assenze · {tot.nonPenale} non penali</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <p className="font-bold mb-3">Percentuale per mese</p>
        {grafico.length === 0 ? <p className="text-sm text-gray-400">Nessuna presenza segnata.</p> : (
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={grafico}>
                <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" width={40} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="percentuale" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
        <p className="font-bold mb-2">Assenze</p>
        {assenze.length === 0 && <p className="text-sm text-gray-400">Nessuna assenza.</p>}
        {assenze.map((r, i) => (
          <div key={r.data} className={`flex justify-between py-2 text-sm ${i ? 'border-t border-gray-100' : ''}`}>
            <span>{new Date(r.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span className="text-gray-400">{STATI[r.stato]}</span>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
