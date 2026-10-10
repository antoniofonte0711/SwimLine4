import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { dataLocale } from '../lib/lavori'
import RiepilogoCoach from '../components/RiepilogoCoach'
import { ALLENAMENTI_SETTIMANA, lunediDi, riepilogoPresenze } from '../lib/presenze'
import { metriPiano } from '../lib/pianoSquadra'

function Pallino({ valore, colore, etichetta }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-full text-white font-bold flex items-center justify-center ${colore}`}>{valore}</div>
      <span className="text-sm text-gray-700">{etichetta}</span>
    </div>
  )
}

// Dashboard: riepilogo della settimana e presenze
function RiepilogoAtleta() {
  const { user, profile } = useAuth()
  const [righe, setRighe] = useState([])
  const [presenze, setPresenze] = useState([])
  const [piani, setPiani] = useState([])

  useEffect(() => {
    const lunedi = lunediDi()
    const quattroSettimaneFa = new Date()
    quattroSettimaneFa.setDate(quattroSettimaneFa.getDate() - 27)
    supabase
      .from('allenamenti')
      .select('distanza, ripetizioni, data_allenamento')
      .eq('atleta_id', user.id)
      .gte('data_allenamento', lunedi)
      .then(({ data }) => setRighe(data || []))
    supabase
      .from('presenze')
      .select('data, stato')
      .eq('atleta_id', user.id)
      .gte('data', dataLocale(quattroSettimaneFa))
      .then(({ data }) => setPresenze(data || []))
    if (profile?.squadra_id) {
      supabase
        .from('allenamenti_squadra')
        .select('data, righe')
        .eq('squadra_id', profile.squadra_id)
        .gte('data', lunedi)
        .then(({ data }) => setPiani(data || []))
    }
  }, [user.id, profile?.squadra_id])

  const lunedi = lunediDi()
  // Km fatti = km dell'allenamento del coach nei giorni in cui l'atleta era presente (assente = 0)
  const giorniPresente = new Set(presenze.filter((p) => p.data >= lunedi && p.stato === 'presente').map((p) => p.data))
  const metri = piani.filter((p) => giorniPresente.has(p.data)).reduce((s, p) => s + metriPiano(p.righe), 0)
  const giorni = giorniPresente.size

  const questaSettimana = riepilogoPresenze(presenze.filter((p) => p.data >= lunedi))
  const ultime4 = riepilogoPresenze(presenze)
  const previsti = ALLENAMENTI_SETTIMANA - questaSettimana.nonPenale

  return (
    <AppShell titolo="Riepilogo" attiva="riepilogo">
      <div className="bg-blue-600 text-white rounded-3xl p-5 mb-3 shadow-lg shadow-blue-200">
        <p className="text-sm text-blue-100">Presenze agli allenamenti</p>
        <p className="text-4xl font-extrabold mt-1">
          {ultime4.percentuale === null ? '—' : `${ultime4.percentuale}%`}
        </p>
        <p className="text-sm text-blue-100">ultime 4 settimane</p>
        <div className="border-t border-white/20 mt-3 pt-3 flex items-baseline justify-between">
          <span className="text-sm text-blue-100">Questa settimana</span>
          <span className="text-lg font-bold">{questaSettimana.presenti} su {previsti}</span>
        </div>
        {ultime4.percentuale === null && (
          <p className="text-xs text-blue-100 mt-2">Le presenze le segna il coach: appariranno qui.</p>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
        <p className="text-sm text-gray-500 mb-4">Questa settimana</p>
        <div className="grid grid-cols-2 gap-4">
          <Pallino valore={(metri / 1000).toFixed(1).replace('.', ',')} colore="bg-blue-600" etichetta="Chilometri fatti" />
          <Pallino valore={giorni} colore="bg-emerald-600" etichetta="Giorni di allenamento" />
          <Pallino valore={righe.length} colore="bg-amber-600" etichetta="Lavori svolti" />
        </div>
      </div>
    </AppShell>
  )
}

export default function Riepilogo() {
  const { ruolo } = useAuth()
  return ruolo === 'coach' ? <RiepilogoCoach /> : <RiepilogoAtleta />
}
