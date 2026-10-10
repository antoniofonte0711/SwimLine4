import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Pannello admin: problemi segnalati dagli utenti (Profilo → Aiuto → Segnala un problema)
export default function SegnalazioniAdmin() {
  const [lista, setLista] = useState([])
  const [nomi, setNomi] = useState({})

  async function carica() {
    const { data } = await supabase.from('segnalazioni').select('id, autore_id, testo, dispositivo, created_at')
      .order('created_at', { ascending: false }).limit(50)
    setLista(data || [])
    const ids = [...new Set((data || []).map((s) => s.autore_id).filter(Boolean))]
    if (!ids.length) return
    const { data: p } = await supabase.from('profiles').select('id, nome, cognome, role').in('id', ids)
    setNomi(Object.fromEntries((p || []).map((x) => [x.id, `${x.nome || ''} ${x.cognome || ''} (${x.role})`.trim()])))
  }

  useEffect(() => { carica() }, [])

  async function risolta(id) {
    await supabase.from('segnalazioni').delete().eq('id', id)
    carica()
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-4 mb-6">
      <h2 className="font-bold mb-1">Segnalazioni{lista.length > 0 && ` (${lista.length})`}</h2>
      <p className="text-sm text-gray-600 mb-3">Problemi scritti dagli utenti dal loro Profilo. Quando l'hai sistemato, segnalo come risolto.</p>
      {lista.length === 0 && <p className="text-sm text-gray-500">Nessuna segnalazione.</p>}
      {lista.map((s) => (
        <div key={s.id} className="bg-gray-50 rounded-xl p-3 mb-2">
          <p className="text-xs text-gray-500 mb-1">
            {nomi[s.autore_id] || 'Account eliminato'} · {new Date(s.created_at).toLocaleString('it-IT')}
          </p>
          <p className="whitespace-pre-wrap mb-2">{s.testo}</p>
          {s.dispositivo && <p className="text-[11px] text-gray-400 mb-2 break-all">{s.dispositivo}</p>}
          <button onClick={() => risolta(s.id)} className="text-sm font-bold text-blue-600">Risolto, togli dalla lista</button>
        </div>
      ))}
    </div>
  )
}
