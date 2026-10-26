import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useMiaSquadra } from '../lib/pianoSquadra'

// Solo admin: tutte le squadre, con la possibilità di entrare in una e vederla (e gestirla) come il suo coach.
// comeCoach: l'admin sta vedendo l'app come il coach del gruppo in cui è entrato, e vede solo quello che vedrebbe lui:
// se è il capo della società, i gruppi della società; altrimenti solo il suo gruppo (e allora la card non serve).
export default function SquadreAdmin({ comeCoach = false }) {
  const { squadraGestita, entraInSquadra, cambiaVista } = useAuth()
  const navigate = useNavigate()
  // il gruppo che sta guardando ora: quello in cui è entrato, o la sua squadra
  const { squadra: attuale } = useMiaSquadra()
  const [squadre, setSquadre] = useState(null)

  useEffect(() => {
    let attivo = true
    async function carica() {
      const [{ data: s }, { data: p }, { data: so }] = await Promise.all([
        supabase.from('squadre').select('id, nome, coach_id, societa_id').order('nome'),
        supabase.from('profiles').select('id, nome, cognome, squadra_id'),
        supabase.from('societa').select('id, capo_id'),
      ])
      if (!attivo) return
      const persone = p || []
      let lista = s || []
      if (comeCoach) {
        const mio = lista.find((x) => x.id === attuale?.id)
        const societa = (so || []).find((x) => x.id === mio?.societa_id)
        const capo = mio?.coach_id && societa?.capo_id === mio.coach_id
        lista = capo ? lista.filter((x) => x.societa_id === societa.id) : []
      }
      setSquadre(lista.map((x) => {
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
  }, [comeCoach, attuale?.id])

  function entra(s) {
    entraInSquadra(s)
    navigate('/dashboard')
  }

  if (comeCoach && !squadre?.length) return null

  return (
    <div className="bg-white rounded-3xl p-5 shadow-card mb-3">
      <p className="font-bold mb-1">🏊 {comeCoach ? 'Gruppi della tua società' : 'Squadre (admin)'}</p>
      <p className="text-xs text-slate-500 mb-3">
        {comeCoach
          ? 'Sei il capo della società: passa da un gruppo all\'altro per gestirlo.'
          : 'Entra in una squadra per vederla e gestirla come il suo coach: allenamenti, presenze, progressi, persone.'}
      </p>
      {squadraGestita && !comeCoach && (
        <div className="flex items-center justify-between gap-2 bg-amber-50 text-amber-800 rounded-xl px-3 py-2 mb-3 text-sm">
          <span>Sei dentro <b>{squadraGestita.nome}</b></span>
          <button onClick={() => cambiaVista('admin')} className="font-bold text-amber-900 underline">Esci</button>
        </div>
      )}
      {squadre === null && <p className="text-sm text-slate-500 py-2">Carico…</p>}
      {squadre?.length === 0 && <p className="text-sm text-slate-500 py-2">Non c'è ancora nessuna squadra.</p>}
      {squadre?.map((s, i) => (
        <div key={s.id} className={`flex items-center justify-between gap-3 py-3 ${i ? 'border-t border-gray-100' : ''}`}>
          <div className="min-w-0">
            <p className="font-semibold truncate">{s.nome}</p>
            <p className="text-xs text-slate-500 truncate">
              {s.coach ? `Coach: ${s.coach}` : 'Senza coach'} · {s.membri} {s.membri === 1 ? 'persona' : 'persone'}
            </p>
          </div>
          {(comeCoach ? attuale?.id : squadraGestita?.id) === s.id
            ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 shrink-0">Ci sei dentro</span>
            : <button onClick={() => entra(s)} className="text-sm font-bold text-white bg-blue-600 rounded-full px-4 py-1.5 shrink-0">Entra</button>}
        </div>
      ))}
    </div>
  )
}
