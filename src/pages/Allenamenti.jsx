import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import FormLavoro from '../components/FormLavoro'
import CarrelloCard from '../components/CarrelloCard'
import { coloreLavoro, dataLocale, formattaGiorno } from '../lib/lavori'
import { leggiCoda, rimuoviDaCoda, sincronizza, salvaCache, leggiCache, useOnline } from '../lib/codaOffline'

const TABELLA = 'allenamenti'
const VISTE = ['Aggiungi lavoro', 'Storico']

export default function Allenamenti() {
  const { user } = useAuth()
  const online = useOnline()
  const [vista, setVista] = useState(VISTE[0])
  const [giorno] = useState(dataLocale())
  const [righe, setRighe] = useState([])
  const [coda, setCoda] = useState([])

  const carica = useCallback(async () => {
    if (navigator.onLine) await sincronizza(supabase, TABELLA, user.id)
    setCoda(leggiCoda(TABELLA, user.id))
    const { data, error } = await supabase
      .from(TABELLA)
      .select('*')
      .eq('atleta_id', user.id)
      .order('created_at', { ascending: false })
      .limit(300)
    if (!error && data) {
      setRighe(data)
      salvaCache(TABELLA, user.id, data)
    } else {
      setRighe(leggiCache(TABELLA, user.id))
    }
  }, [user.id])

  useEffect(() => {
    carica()
  }, [carica, online])

  async function elimina(riga) {
    if (!window.confirm('Vuoi eliminare questo lavoro?')) return
    if (riga.inAttesa) {
      rimuoviDaCoda(TABELLA, riga.id)
      setCoda(leggiCoda(TABELLA, user.id))
      return
    }
    const { error } = await supabase.from(TABELLA).delete().eq('id', riga.id)
    if (error) {
      window.alert('Non sono riuscito a eliminarlo: ' + error.message)
      return
    }
    carica()
  }

  const tutte = [...coda.map((r) => ({ ...r, inAttesa: true })), ...righe]
  const perGiorno = {}
  tutte.forEach((r) => {
    const g = r.data_allenamento || (r.created_at || '').slice(0, 10)
    ;(perGiorno[g] = perGiorno[g] || []).push(r)
  })
  const giorni = Object.keys(perGiorno).sort().reverse()

  return (
    <AppShell titolo="Allenamenti" attiva="funzioni" indietro="/funzioni">
      {!online && (
        <p className="text-sm bg-yellow-100 text-yellow-800 rounded-xl px-4 py-3 mb-3">
          📴 Sei offline: i lavori vengono salvati sul telefono e inviati appena torna la connessione.
        </p>
      )}

      <div className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
        <label className="block text-xs text-gray-500 mb-1">Cosa vuoi fare?</label>
        <select value={vista} onChange={(e) => setVista(e.target.value)}
          className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400">
          {VISTE.map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>

      {vista === 'Aggiungi lavoro' && (
        <>
          <FormLavoro />
          <CarrelloCard giorno={giorno} onSalvato={carica} />
        </>
      )}

      {vista === 'Storico' && (
        <>
          {giorni.length === 0 && (
            <p className="text-center text-gray-300 py-8">Nessun allenamento ancora 🏊</p>
          )}
          {giorni.map((g) => (
            <div key={g} className="bg-white border border-gray-100 rounded-3xl p-5 mb-3 shadow-sm">
              <p className="text-sm font-semibold text-gray-500 capitalize mb-2">{formattaGiorno(g)}</p>
              {perGiorno[g].map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 border-t border-gray-100 py-3">
                  <div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${coloreLavoro(r.tipo_lavoro)}`}>{r.tipo_lavoro}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      {r.ripetizioni ? `${r.ripetizioni}×` : ''}{r.distanza} m {r.stile || ''}
                    </span>
                    {r.inAttesa && <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full ml-2">⏳ da inviare</span>}
                    {r.passaggi?.length > 0 ? (
                      <p className="text-xs text-gray-400 mt-1">{r.passaggi.join(' · ')}</p>
                    ) : (
                      r.tempo_totale && <p className="text-xs text-gray-400 mt-1">{r.tempo_totale}</p>
                    )}
                    {r.video_url && <a href={r.video_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600">🎥 Guarda il video</a>}
                  </div>
                  <button onClick={() => elimina(r)} title="Elimina" className="text-gray-300 hover:text-red-500 transition">🗑️</button>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </AppShell>
  )
}
