import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { dataLocale } from '../lib/lavori'
import { STATI, GIORNI_ALLENAMENTO } from '../lib/presenze'

const COLORI = {
  presente: 'bg-green-600 text-white',
  assente: 'bg-red-600 text-white',
  non_penale: 'bg-amber-500 text-white',
}

// Solo il coach (e l'admin) segna le presenze. L'assenza non penale è per festività e simili.
export default function Presenze() {
  const { user } = useAuth()
  const [giorno, setGiorno] = useState(dataLocale())
  const [atleti, setAtleti] = useState([])
  const [stati, setStati] = useState({})
  const [errore, setErrore] = useState('')

  const carica = useCallback(async () => {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('id, nome, cognome').eq('role', 'atleta').order('cognome'),
      supabase.from('presenze').select('atleta_id, stato').eq('data', giorno),
    ])
    setAtleti(a || [])
    setStati(Object.fromEntries((p || []).map((r) => [r.atleta_id, r.stato])))
  }, [giorno])

  useEffect(() => {
    carica()
  }, [carica])

  async function segna(atletaId, stato) {
    setErrore('')
    const attuale = stati[atletaId]
    const { error } =
      attuale === stato
        ? await supabase.from('presenze').delete().eq('atleta_id', atletaId).eq('data', giorno)
        : await supabase.from('presenze').upsert(
            { atleta_id: atletaId, data: giorno, stato, segnato_da: user.id },
            { onConflict: 'atleta_id,data' }
          )
    if (error) {
      setErrore('Non sono riuscito a salvare: ' + error.message)
      return
    }
    carica()
  }

  const giornoSettimana = new Date(giorno + 'T12:00:00').getDay()
  const fuoriAllenamento = !GIORNI_ALLENAMENTO.includes(giornoSettimana)

  return (
    <AppShell titolo="Presenze" attiva="funzioni" indietro="/funzioni">
      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <label className="block text-xs text-gray-500 mb-1">Giorno</label>
        <input type="date" value={giorno} onChange={(e) => setGiorno(e.target.value)}
          className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        {fuoriAllenamento && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
            Questo non è un giorno di allenamento fisso (lunedì-venerdì).
          </p>
        )}
      </div>

      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}

      {atleti.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          Non vedo atleti da mostrare. Gli atleti della tua squadra compariranno qui quando sistemiamo i permessi della visuale coach.
        </p>
      )}

      {atleti.map((a) => (
        <div key={a.id} className="bg-white border border-gray-100 rounded-3xl p-4 mb-3 shadow-sm">
          <p className="font-bold mb-3">{a.nome} {a.cognome}</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(STATI).map(([chiave, nome]) => (
              <button key={chiave} onClick={() => segna(a.id, chiave)}
                className={`text-xs font-semibold rounded-xl py-2.5 px-1 transition active:scale-95 ${
                  stati[a.id] === chiave ? COLORI[chiave] : 'bg-gray-100 text-gray-600'
                }`}>
                {nome}
              </button>
            ))}
          </div>
        </div>
      ))}
    </AppShell>
  )
}
