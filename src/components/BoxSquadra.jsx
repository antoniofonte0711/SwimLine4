import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'

// Nel Profilo: il coach rinomina la squadra, atleta e genitore scrivono il nome per chiedere di entrare
export default function BoxSquadra() {
  const { user, profile, ricaricaProfilo } = useAuth()
  const coach = profile?.role === 'coach' || profile?.role === 'admin'
  const [attuale, setAttuale] = useState('')
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState(false)

  useEffect(() => {
    let attivo = true
    async function carica() {
      let q = supabase.from('squadre').select('nome')
      q = profile?.squadra_id ? q.eq('id', profile.squadra_id) : coach ? q.eq('coach_id', user.id) : null
      const { data } = q ? await q.limit(1) : { data: [] }
      if (!attivo) return
      setAttuale(data?.[0]?.nome || '')
      setTesto(data?.[0]?.nome || '')
    }
    carica()
    return () => { attivo = false }
  }, [profile?.squadra_id, user.id, coach])

  async function salva() {
    setErrore('')
    setOk('')
    setInvio(true)
    // il coach rinomina la sua squadra; atleta e genitore chiedono di entrare (decide il coach)
    const { data, error } = await supabase.rpc(coach ? 'imposta_nome_squadra' : 'chiedi_di_entrare', { p_nome: testo })
    setInvio(false)
    if (error) {
      setErrore(!coach && error.message.includes('Nessuna squadra')
        ? 'Non trovo nessuna squadra con questo nome. Chiedi al coach il nome esatto.'
        : /function|schema cache/i.test(error.message) ? 'Funzione mancante: esegui prima 14_migrazione_approvazioni.sql su Supabase.'
        : error.message)
      return
    }
    if (coach) {
      setAttuale(data || '')
      setOk(`Nome della squadra: ${data}`)
      await ricaricaProfilo()
    } else {
      setOk(`Richiesta inviata a ${data}: entri quando il coach la approva.`)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-3">
      <p className="font-bold mb-1">👥 {coach ? 'La tua squadra' : 'Squadra'}</p>
      <p className="text-xs text-gray-500 mb-3">
        {coach
          ? 'Il nome della tua squadra: gli atleti e i genitori lo useranno per chiedere di entrare.'
          : 'Scrivi il nome della squadra (te lo dà il coach) per chiedere di entrare: il coach deve approvare.'}
      </p>
      <label className="block text-xs text-gray-500 mb-1">Nome squadra</label>
      <input value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Es. Delfini Nuoto Club" className={CAMPO + ' mb-3'} />
      {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}
      <button onClick={salva} disabled={invio || !testo.trim() || testo.trim() === attuale}
        className="w-full font-bold text-white bg-blue-600 disabled:bg-gray-300 rounded-2xl py-3">
        {invio ? 'Salvo…' : coach ? 'Cambia nome' : 'Chiedi di entrare'}
      </button>
      {attuale && <p className="text-xs text-gray-500 mt-3">Squadra attuale: <b>{attuale}</b></p>}
    </div>
  )
}
