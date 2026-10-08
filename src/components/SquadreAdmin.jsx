import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// Solo admin: tutte le squadre, con la possibilità di entrare in una e vederla (e gestirla) come il suo coach
export default function SquadreAdmin() {
  const { squadraGestita, entraInSquadra, cambiaVista } = useAuth()
  const navigate = useNavigate()
  const [squadre, setSquadre] = useState(null)

  useEffect(() => {
    let attivo = true
    async function carica() {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from('squadre').select('id, nome, coach_id').order('nome'),
        supabase.from('profiles').select('id, nome, cognome, squadra_id'),
      ])
      if (!attivo) return
      const persone = p || []
      setSquadre((s || []).map((x) => {
        const coach = persone.find((q) => q.id === x.coach_id)
        return {
          ...x,
          coach: coach ? `${coach.nome || ''} ${coach.cognome || ''}`.trim() : '',
          membri: persone.filter((q) => q.squadra_id === x.id && q.id !== x.coach_id).length,
        }
      }))
    }
    carica()
    return () => { attivo = false }
  }, [])

  function entra(s) {
    entraInSquadra(s)
    navigate('/dashboard')
  }

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-3">
      <p className="font-bold mb-1">🏊 Squadre (admin)</p>
      <p className="text-xs text-gray-500 mb-3">
        Entra in una squadra per vederla e gestirla come il suo coach: allenamenti, presenze, progressi, persone.
      </p>
      {squadraGestita && (
        <div className="flex items-center justify-between gap-2 bg-amber-50 text-amber-800 rounded-xl px-3 py-2 mb-3 text-sm">
          <span>Sei dentro <b>{squadraGestita.nome}</b></span>
          <button onClick={() => cambiaVista('admin')} className="font-bold text-amber-900 underline">Esci</button>
        </div>
      )}
      {squadre === null && <p className="text-sm text-gray-500 py-2">Carico…</p>}
      {squadre?.length === 0 && <p className="text-sm text-gray-500 py-2">Non c'è ancora nessuna squadra.</p>}
      {squadre?.map((s, i) => (
        <div key={s.id} className={`flex items-center justify-between gap-3 py-3 ${i ? 'border-t border-gray-100' : ''}`}>
          <div className="min-w-0">
            <p className="font-semibold truncate">{s.nome}</p>
            <p className="text-xs text-gray-500 truncate">
              {s.coach ? `Coach: ${s.coach}` : 'Senza coach'} · {s.membri} {s.membri === 1 ? 'persona' : 'persone'}
            </p>
          </div>
          {squadraGestita?.id === s.id
            ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 shrink-0">Ci sei dentro</span>
            : <button onClick={() => entra(s)} className="text-sm font-bold text-white bg-blue-600 rounded-full px-4 py-1.5 shrink-0">Entra</button>}
        </div>
      ))}
    </div>
  )
}
