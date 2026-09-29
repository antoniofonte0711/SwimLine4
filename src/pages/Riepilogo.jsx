import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { dataLocale } from '../lib/lavori'

function Pallino({ valore, colore, etichetta }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-full text-white font-bold flex items-center justify-center ${colore}`}>{valore}</div>
      <span className="text-sm text-gray-700">{etichetta}</span>
    </div>
  )
}

// Dashboard: riepilogo della settimana
export default function Riepilogo() {
  const { user } = useAuth()
  const [righe, setRighe] = useState([])

  useEffect(() => {
    const lunedi = new Date()
    lunedi.setDate(lunedi.getDate() - ((lunedi.getDay() + 6) % 7))
    supabase
      .from('allenamenti')
      .select('distanza, ripetizioni, data_allenamento, created_at')
      .eq('atleta_id', user.id)
      .gte('data_allenamento', dataLocale(lunedi))
      .then(({ data }) => setRighe(data || []))
  }, [user.id])

  const metri = righe.reduce((s, r) => s + (r.distanza || 0) * (r.ripetizioni || 1), 0)
  const giorni = new Set(righe.map((r) => r.data_allenamento)).size

  return (
    <AppShell titolo="Dashboard" attiva="riepilogo">
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
        <p className="text-sm text-gray-500 mb-4">Questa settimana</p>
        <div className="grid grid-cols-2 gap-4">
          <Pallino valore={(metri / 1000).toFixed(1).replace('.', ',')} colore="bg-blue-600" etichetta="Chilometri fatti" />
          <Pallino valore={giorni} colore="bg-emerald-600" etichetta="Giorni di allenamento" />
          <Pallino valore={righe.length} colore="bg-amber-600" etichetta="Lavori svolti" />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3 px-2">
        Record e prossima gara arrivano con le sezioni Gare e Calendario.
      </p>
    </AppShell>
  )
}
