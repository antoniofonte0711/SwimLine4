import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import StoricoAllenamenti from '../components/StoricoAllenamenti'
import PianoCard, { SenzaSquadra } from '../components/PianoCard'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { dataLocale, formattaGiorno } from '../lib/lavori'
import { useMiaSquadra } from '../lib/pianoSquadra'

// Coach: l'allenamento di oggi e tutti quelli già svolti, dal più recente
function StoricoCoach() {
  const { squadra, pronto } = useMiaSquadra()
  const [piani, setPiani] = useState(null)

  useEffect(() => {
    if (!squadra) return
    supabase.from('allenamenti_squadra').select('*').eq('squadra_id', squadra.id)
      .lte('data', dataLocale()).order('data', { ascending: false }).limit(300)
      .then(({ data }) => setPiani(data || []))
  }, [squadra?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!pronto || (squadra && piani === null)) return <p className="text-center text-gray-500 py-8">Carico…</p>
  if (!squadra) return <SenzaSquadra />
  if (piani.length === 0) return <p className="text-center text-gray-500 py-8">Nessun allenamento ancora 🏊</p>

  return piani.map((p) => (
    <div key={p.id} className="mb-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <p className="text-sm font-semibold text-gray-500 capitalize">
          {p.data === dataLocale() ? 'Oggi · ' : ''}{formattaGiorno(p.data)}
        </p>
        <Link to={`/risultati?data=${p.data}`} className="text-xs font-semibold text-blue-600">Risultati ›</Link>
      </div>
      <PianoCard piano={p} />
    </div>
  ))
}

export default function Storico() {
  const { ruolo } = useAuth()
  return (
    <AppShell titolo="Storico" attiva="funzioni" indietro="/funzioni">
      {ruolo === 'coach' ? <StoricoCoach /> : <StoricoAllenamenti />}
    </AppShell>
  )
}
