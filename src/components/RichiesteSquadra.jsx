import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const MIGRAZIONE = 'Manca un aggiornamento del database: esegui supabase/migrazione_fase12_richieste_admin.sql.'
const messaggio = (error) => (/function|schema cache/i.test(error.message) ? MIGRAZIONE : error.message)

// Solo per gli account admin, che sono anche atleti: entrano in una squadra solo accettando la richiesta del coach.
// completo = riquadro del Profilo (squadra attuale, richieste, uscita); altrimenti solo le richieste (Home), se ce ne sono.
export default function RichiesteSquadra({ completo = false }) {
  const { user, profile, ricaricaProfilo } = useAuth()
  const [richieste, setRichieste] = useState([])
  const [squadraAttuale, setSquadraAttuale] = useState('')
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState('')

  const carica = useCallback(async () => {
    const { data, error } = await supabase.rpc('mie_richieste')
    if (error) {
      if (completo) setErrore(messaggio(error))
      return
    }
    setRichieste(data || [])
  }, [completo])

  useEffect(() => { carica() }, [carica])

  useEffect(() => {
    if (!completo) return
    if (!profile?.squadra_id) return setSquadraAttuale('')
    supabase.from('squadre').select('nome').eq('id', profile.squadra_id).maybeSingle()
      .then(({ data }) => setSquadraAttuale(data?.nome || ''))
  }, [completo, profile?.squadra_id])

  async function rispondi(r, accetta) {
    setErrore('')
    setOk('')
    setInvio(r.id)
    const { error } = await supabase.rpc('rispondi_richiesta', { p_richiesta: r.id, p_accetta: accetta })
    setInvio('')
    if (error) return setErrore(messaggio(error))
    setOk(accetta ? `Sei entrato in ${r.squadra_nome}.` : `Hai rifiutato l'invito di ${r.squadra_nome}.`)
    await carica()
    if (accetta) await ricaricaProfilo()
  }

  async function esci() {
    if (!window.confirm(`Uscire dalla squadra ${squadraAttuale}? I tuoi tempi restano salvati.`)) return
    setErrore('')
    setOk('')
    setInvio('esci')
    const { error } = await supabase.rpc('togli_da_squadra', { p_persona: user.id })
    setInvio('')
    if (error) return setErrore(messaggio(error))
    setOk('Sei uscito dalla squadra.')
    await ricaricaProfilo()
  }

  // In Home si vede solo se c'è qualcosa: una richiesta, o l'esito di quella appena gestita
  if (!completo && richieste.length === 0 && !ok && !errore) return null

  return (
    <div className={`bg-white border rounded-3xl p-5 shadow-sm mb-3 ${richieste.length ? 'border-blue-200' : 'border-gray-100'}`}>
      {completo && (
        <>
          <p className="font-bold mb-1">🏊 La mia squadra (da atleta)</p>
          <p className="text-xs text-gray-400 mb-3">
            Sei admin ma anche atleta: i coach ti trovano e ti invitano, e tu entri nella loro squadra solo se accetti.
          </p>
          <p className="text-sm mb-3">
            {squadraAttuale ? <>Ora sei nella squadra <b>{squadraAttuale}</b>.</> : 'Non sei in nessuna squadra come atleta.'}
          </p>
        </>
      )}
      {richieste.map((r) => (
        <div key={r.id} className="bg-blue-50 rounded-2xl p-3 mb-2">
          <p className="text-sm">
            📩 {r.coach_nome ? <><b>{r.coach_nome}</b> ti invita</> : 'Sei invitato'} nella squadra <b>{r.squadra_nome}</b>
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => rispondi(r, true)} disabled={!!invio}
              className="font-bold text-white bg-blue-600 disabled:opacity-60 rounded-xl py-2">{invio === r.id ? '…' : 'Accetta'}</button>
            <button onClick={() => rispondi(r, false)} disabled={!!invio}
              className="font-bold text-gray-600 bg-white disabled:opacity-60 rounded-xl py-2">Rifiuta</button>
          </div>
        </div>
      ))}
      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mt-2">{errore}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2">{ok}</p>}
      {completo && squadraAttuale && (
        <button onClick={esci} disabled={!!invio} className="w-full text-sm text-red-500 mt-2 py-2">
          {invio === 'esci' ? '…' : 'Esci dalla squadra'}
        </button>
      )}
    </div>
  )
}
