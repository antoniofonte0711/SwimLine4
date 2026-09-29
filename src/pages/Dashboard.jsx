import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import FormLavoro from '../components/FormLavoro'
import CarrelloCard from '../components/CarrelloCard'
import { dataLocale } from '../lib/lavori'
import { tempoInSecondi, secondiInTempo } from '../lib/tempo'

// Home: ultimo lavoro, scelta del lavoro e carrello della giornata
export default function Dashboard() {
  const { user } = useAuth()
  const [giorno, setGiorno] = useState(dataLocale())
  const [ultimo, setUltimo] = useState(null)

  const caricaUltimo = useCallback(async () => {
    const { data } = await supabase
      .from('allenamenti')
      .select('tipo_lavoro, distanza, ripetizioni, stile, passaggi, tempo_totale')
      .eq('atleta_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
    setUltimo(data?.[0] || null)
  }, [user.id])

  useEffect(() => {
    caricaUltimo()
  }, [caricaUltimo])

  const tempi = ultimo
    ? [...(ultimo.passaggi || []), ultimo.tempo_totale].map(tempoInSecondi).filter((t) => t !== null)
    : []
  const migliore = tempi.length ? secondiInTempo(Math.min(...tempi)) : null

  return (
    <AppShell titolo="Home" attiva="home" giorno={giorno} onGiorno={setGiorno}>
      <div className="bg-blue-600 text-white rounded-3xl p-5 mb-3 shadow-lg shadow-blue-200">
        <p className="text-sm text-blue-100">Ultimo lavoro</p>
        {ultimo ? (
          <>
            <p className="text-3xl font-extrabold mt-1">{migliore || '—'}</p>
            <p className="text-sm text-blue-100">
              {ultimo.tipo_lavoro} · {ultimo.ripetizioni || 1}×{ultimo.distanza} m {ultimo.stile || ''}
              {migliore && ' · miglior passaggio'}
            </p>
          </>
        ) : (
          <p className="text-lg font-bold mt-1">Nessun lavoro ancora: aggiungine uno qui sotto</p>
        )}
      </div>

      <FormLavoro />
      <CarrelloCard giorno={giorno} onSalvato={caricaUltimo} />
    </AppShell>
  )
}
