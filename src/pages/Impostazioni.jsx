import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AppShell from '../components/AppShell'
import { SenzaSquadra } from '../components/PianoCard'
import { useMiaSquadra } from '../lib/pianoSquadra'

// Impostazioni della squadra: visibili solo ad admin e coach.
// Qui il coach aggiunge alla propria squadra un atleta già registrato nell'app.
export default function Impostazioni() {
  const { squadra, pronto } = useMiaSquadra()
  const [atleti, setAtleti] = useState([])
  const [cerca, setCerca] = useState('')
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState('')

  const carica = useCallback(async () => {
    const { data, error } = await supabase.rpc('atleti_disponibili')
    if (error) {
      setErrore(error.message.includes('function') ? 'Funzione mancante: esegui prima la migrazione fase 7 su Supabase.' : error.message)
      return
    }
    setAtleti(data || [])
  }, [])

  useEffect(() => { if (squadra) carica() }, [squadra?.id, carica]) // eslint-disable-line react-hooks/exhaustive-deps

  async function aggiungi(a) {
    setErrore('')
    setOk('')
    setInvio(a.id)
    const { error } = await supabase.rpc('aggiungi_atleta_squadra', { p_atleta: a.id })
    setInvio('')
    if (error) return setErrore(error.message)
    setOk(`${a.nome} ${a.cognome || ''} è ora nella squadra ${squadra.nome}.`)
    carica()
  }

  const filtro = cerca.trim().toLowerCase()
  const visibili = atleti.filter((a) => `${a.nome} ${a.cognome}`.toLowerCase().includes(filtro))

  return (
    <AppShell titolo="Impostazioni" attiva="funzioni" indietro="/funzioni">
      {!pronto ? <p className="text-center text-gray-400 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : (
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <p className="font-bold">Aggiungi un atleta a {squadra.nome}</p>
            <p className="text-xs text-gray-400 mb-3">Compaiono gli atleti registrati che non hanno ancora una squadra, più quelli già nella tua. Se sei admin trovi anche te stesso.</p>
            <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca per nome"
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
            {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}
            {visibili.length === 0 && <p className="text-sm text-gray-400 py-3">Nessun atleta trovato.</p>}
            {visibili.map((a, i) => (
              <div key={a.id} className={`flex items-center justify-between py-3 ${i ? 'border-t border-gray-100' : ''}`}>
                <p className="font-semibold">{a.nome} {a.cognome}{a.sono_io && <span className="text-xs font-bold text-blue-600"> (tu)</span>}</p>
                {a.nella_mia_squadra
                  ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">Già in squadra</span>
                  : <button onClick={() => aggiungi(a)} disabled={invio === a.id}
                      className="text-sm font-bold text-white bg-blue-600 disabled:opacity-60 rounded-full px-4 py-1.5">
                      {invio === a.id ? '…' : 'Aggiungi'}
                    </button>}
              </div>
            ))}
          </div>
        )}
    </AppShell>
  )
}
