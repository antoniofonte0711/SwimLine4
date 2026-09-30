import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { coloreLavoro, dataLocale, formattaGiorno } from '../lib/lavori'
import { leggiCoda } from '../lib/codaOffline'
import { STATI } from '../lib/presenze'
import { puoModificare } from '../lib/permessi'

const COLORE_STATO = {
  presente: 'bg-green-100 text-green-700',
  assente: 'bg-red-100 text-red-700',
  non_penale: 'bg-amber-100 text-amber-700',
}

// Home: i giorni e, sotto, gli allenamenti del giorno scelto
export default function Dashboard() {
  const { user, ruolo } = useAuth()
  const [giorno, setGiorno] = useState(dataLocale())
  const [righe, setRighe] = useState([])
  const [presenza, setPresenza] = useState(null)

  useEffect(() => {
    let attivo = true
    async function carica() {
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase.from('allenamenti').select('*').eq('atleta_id', user.id).eq('data_allenamento', giorno).order('created_at'),
        supabase.from('presenze').select('stato').eq('atleta_id', user.id).eq('data', giorno).maybeSingle(),
      ])
      if (!attivo) return
      const inCoda = leggiCoda('allenamenti', user.id).filter((r) => r.data_allenamento === giorno)
      setRighe([...(a || []), ...inCoda])
      setPresenza(p?.stato || null)
    }
    carica()
    return () => { attivo = false }
  }, [giorno, user.id])

  if (ruolo === 'ospite') {
    return (
      <AppShell titolo="Home" attiva="home">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-sm">
          <p className="text-4xl mb-2">👋</p>
          <p className="font-bold mb-1">Benvenuto in SwimLine4</p>
          <p className="text-sm text-gray-400">Da ospite puoi vedere la squadra e il calendario gare.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell titolo="Home" attiva="home" giorno={giorno} onGiorno={setGiorno}>
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-sm font-semibold text-gray-500 capitalize">{formattaGiorno(giorno)}</p>
        {presenza && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${COLORE_STATO[presenza]}`}>{STATI[presenza]}</span>
        )}
      </div>

      {righe.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center text-gray-400 shadow-sm mb-3">
          <p className="text-4xl mb-2">🏊</p>
          <p>Nessun allenamento in questo giorno.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-3">
          {righe.map((r, i) => (
            <div key={r.id} className={`py-3 ${i ? 'border-t border-gray-100' : ''}`}>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
              <span className="text-sm text-gray-600 ml-2">
                {r.ripetizioni ? `${r.ripetizioni}×` : ''}{r.distanza} m {r.stile || ''}
              </span>
              {r.passaggi?.length > 0 ? (
                <p className="text-xs text-gray-400 mt-1">{r.passaggi.join(' · ')}</p>
              ) : (
                r.tempo_totale && <p className="text-xs text-gray-400 mt-1">{r.tempo_totale}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {ruolo === 'genitore' && (
        <p className="text-xs text-gray-400 text-center mb-3 px-2">Vista genitore, in sola lettura. Il collegamento con i tempi di tuo figlio arriva con la fase Genitori.</p>
      )}

      {puoModificare(ruolo) && (
      <Link to="/allenamenti"
        className="block text-center font-bold text-blue-600 bg-blue-50 rounded-2xl py-3.5 hover:bg-blue-100 active:scale-[0.98] transition">
        ➕ Aggiungi un lavoro
      </Link>
      )}
    </AppShell>
  )
}
