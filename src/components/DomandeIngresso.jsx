import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const RUOLI = { atleta: 'Atleta', genitore: 'Genitore', admin: 'Atleta (admin)' }

// Coach: chi ha chiesto di entrare nella squadra. Entra solo se il coach approva.
// Si vede solo se c'è almeno una domanda (o l'esito di quella appena gestita).
export default function DomandeIngresso({ squadra, onCambio }) {
  const [domande, setDomande] = useState([])
  const [invio, setInvio] = useState('')
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')

  const carica = useCallback(async () => {
    const { data, error } = await supabase.rpc('domande_squadra', { p_squadra: squadra.id })
    if (!error) setDomande(data || [])
  }, [squadra.id])

  useEffect(() => { carica() }, [carica])

  async function rispondi(d, accetta) {
    setErrore('')
    setOk('')
    setInvio(d.id)
    const { error } = await supabase.rpc('rispondi_domanda', { p_richiesta: d.id, p_accetta: accetta })
    setInvio('')
    if (error) return setErrore('Non sono riuscito a salvare: ' + error.message)
    setOk(accetta ? `${d.nome} ${d.cognome || ''} è entrato in ${squadra.nome}.` : `Domanda di ${d.nome} ${d.cognome || ''} rifiutata.`)
    await carica()
    if (accetta) onCambio?.()
  }

  if (domande.length === 0 && !ok && !errore) return null

  return (
    <div className="bg-white border border-blue-200 rounded-3xl p-5 shadow-sm mb-3">
      <p className="font-bold mb-1">📩 Richieste di ingresso{domande.length > 0 && ` (${domande.length})`}</p>
      <p className="text-xs text-gray-500 mb-2">Queste persone hanno chiesto di entrare in {squadra.nome}: entrano solo se approvi.</p>
      {domande.map((d) => (
        <div key={d.id} className="bg-blue-50 rounded-2xl p-3 mb-2">
          <p className="text-sm font-semibold">{d.nome} {d.cognome}</p>
          <p className="text-xs text-gray-500">
            {RUOLI[d.ruolo] || d.ruolo}{d.squadra_attuale ? ` · ora in ${d.squadra_attuale}` : ''} · {new Date(d.created_at).toLocaleDateString('it-IT')}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => rispondi(d, true)} disabled={!!invio}
              className="font-bold text-white bg-blue-600 disabled:opacity-60 rounded-xl py-2">{invio === d.id ? '…' : 'Approva'}</button>
            <button onClick={() => rispondi(d, false)} disabled={!!invio}
              className="font-bold text-gray-600 bg-white disabled:opacity-60 rounded-xl py-2">Rifiuta</button>
          </div>
        </div>
      ))}
      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mt-2">{errore}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2">{ok}</p>}
    </div>
  )
}
