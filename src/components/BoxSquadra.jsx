import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Icona from './Icona'
import FinestraAttesa from './FinestraAttesa'

const CAMPO = 'w-full min-h-[46px] border border-slate-200 bg-bordo rounded-2xl px-3.5 py-2.5 text-[15px] font-semibold text-abisso focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white'

// Nel Profilo: il coach rinomina la squadra, atleta e genitore scrivono il nome per chiedere di entrare
export default function BoxSquadra() {
  const { user, profile, ricaricaProfilo } = useAuth()
  const coach = profile?.role === 'coach' || profile?.role === 'admin'
  const [attuale, setAttuale] = useState('')
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState(false)
  const [inAttesa, setInAttesa] = useState([]) // domande fatte da me che aspettano il coach
  const [finestra, setFinestra] = useState(null)
  const navigate = useNavigate()

  async function caricaDomande() {
    if (coach) return []
    const { data } = await supabase.rpc('mie_richieste')
    const domande = (data || []).filter((r) => r.tipo === 'domanda')
    setInAttesa(domande)
    return domande
  }
  useEffect(() => { caricaDomande() }, [coach]) // eslint-disable-line react-hooks/exhaustive-deps

  async function annulla(r) {
    if (!window.confirm(`Annullare la richiesta per ${r.squadra_nome}?`)) return
    setErrore('')
    setOk('')
    const { error } = await supabase.rpc('annulla_mia_domanda', { p_richiesta: r.id })
    if (error) return setErrore(error.message)
    setOk(`Richiesta per ${r.squadra_nome} annullata.`)
    caricaDomande()
  }

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
      // la richiesta è davvero salvata: finestra d'attesa (si chiude con "Ho capito" e si torna alla Home)
      const domande = await caricaDomande()
      const fatta = domande.find((r) => r.squadra_nome === data)
      if (fatta) setFinestra(fatta)
      else setOk(`Richiesta inviata a ${data}: entri quando il coach la approva.`)
    }
  }

  return (
    <div className="bg-white rounded-3xl p-5 shadow-card mb-3">
      <p className="font-bold mb-1 flex items-center gap-2"><Icona nome="gruppo" className="w-5 h-5 text-blue-600" />{coach ? 'La tua squadra' : 'Squadra'}</p>
      <p className="text-xs text-slate-500 mb-3">
        {coach
          ? 'Il nome della tua squadra: gli atleti e i genitori lo useranno per chiedere di entrare.'
          : 'Scrivi il nome della squadra (te lo dà il coach) per chiedere di entrare: il coach deve approvare.'}
      </p>
      <label className="block text-xs text-slate-500 mb-1">Nome squadra</label>
      <input value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Es. Delfini Nuoto Club" className={CAMPO + ' mb-3'} />
      {errore && <p className="text-sm text-white bg-red-600 rounded-lg px-3 py-2 mb-3">{errore}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}
      <button onClick={salva} disabled={invio || !testo.trim() || testo.trim() === attuale}
        className="w-full font-bold text-white bg-blue-600 disabled:bg-gray-300 rounded-2xl py-3">
        {invio ? 'Salvo…' : coach ? 'Cambia nome' : 'Chiedi di entrare'}
      </button>
      {attuale && <p className="text-xs text-slate-500 mt-3">Squadra attuale: <b>{attuale}</b></p>}
      {inAttesa.map((r) => (
        <div key={r.id} className="bg-amber-50 rounded-2xl p-3 mt-3 flex items-center justify-between gap-2">
          <p className="text-sm min-w-0"><Icona nome="clessidra" className="w-4 h-4 inline -mt-0.5 mr-1" />In attesa del coach: <b>{r.squadra_nome}</b></p>
          <button type="button" onClick={() => annulla(r)} className="shrink-0 min-h-[44px] text-sm font-bold text-slate-600 underline">Annulla</button>
        </div>
      ))}
      {finestra && (
        <FinestraAttesa richiesta={finestra} onChiudi={() => { setFinestra(null); navigate('/dashboard') }}
          onAnnullata={() => { setFinestra(null); setOk(`Richiesta per ${finestra.squadra_nome} annullata.`); caricaDomande() }} />
      )}
    </div>
  )
}
