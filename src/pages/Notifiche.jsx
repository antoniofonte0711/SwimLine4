import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'

const ICONA = {
  record: '🏅', gara_nuova: '📅', gara_modificata: '✏️', gara_cancellata: '❌',
  richiesta_genitore: '👨‍👩‍👧', risposta_genitore: '👨‍👩‍👧', incoraggiamento: '❤️',
}

function quando(s) {
  const d = new Date(s)
  const min = Math.round((Date.now() - d) / 60000)
  if (min < 1) return 'adesso'
  if (min < 60) return `${min} min fa`
  if (min < 60 * 24) return `${Math.round(min / 60)} h fa`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

// Campanella: tutte le notifiche dell'app. Aprendo la pagina diventano lette.
export default function Notifiche() {
  const { user } = useAuth()
  const [lista, setLista] = useState(null)

  useEffect(() => {
    supabase.from('notifiche').select('id, tipo, titolo, testo, link, letta, created_at')
      .eq('destinatario_id', user.id).order('created_at', { ascending: false }).limit(60)
      .then(({ data }) => {
        setLista(data || [])
        if ((data || []).some((n) => !n.letta)) {
          supabase.from('notifiche').update({ letta: true }).eq('destinatario_id', user.id).eq('letta', false).then(() => {})
        }
      })
  }, [user.id])

  async function svuota() {
    if (!window.confirm('Cancellare tutte le notifiche?')) return
    await supabase.from('notifiche').delete().eq('destinatario_id', user.id)
    setLista([])
  }

  return (
    <AppShell titolo="Notifiche" attiva="home" indietro="/dashboard">
      {lista === null && <p className="text-center text-slate-500 py-8">Carico…</p>}
      {lista?.length === 0 && (
        <div className="bg-white rounded-3xl p-8 text-center">
          <p className="text-4xl mb-2">🔔</p>
          <p className="font-display text-xl font-extrabold text-abisso mb-1">Nessuna notifica</p>
          <p className="text-sm text-slate-500">Qui arrivano i nuovi record, le gare in calendario e i messaggi della famiglia.</p>
        </div>
      )}
      {lista?.map((n) => (
        <Link key={n.id} to={n.link || '/dashboard'}
          className={`flex gap-3 bg-white rounded-3xl p-4 mb-2 ${n.letta ? '' : 'ring-2 ring-blue-200'}`}>
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-schiuma flex items-center justify-center text-xl" aria-hidden="true">{ICONA[n.tipo] || '🔔'}</span>
          <span className="min-w-0">
            <span className="flex items-baseline justify-between gap-2">
              <b className="text-abisso">{n.titolo}</b>
              <span className="text-xs text-slate-500 shrink-0">{quando(n.created_at)}</span>
            </span>
            {n.testo && <span className="block text-sm text-slate-600 mt-0.5">{n.testo}</span>}
          </span>
        </Link>
      ))}
      {lista?.length > 0 && (
        <button onClick={svuota} className="w-full text-sm font-semibold text-slate-500 py-3">Cancella tutte</button>
      )}
    </AppShell>
  )
}
