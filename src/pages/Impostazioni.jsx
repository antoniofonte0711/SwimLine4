import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppShell from '../components/AppShell'
import { SenzaSquadra } from '../components/PianoCard'
import { useMiaSquadra } from '../lib/pianoSquadra'
import DomandeIngresso from '../components/DomandeIngresso'

const CAMPO = 'w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400'
// L'admin è prima di tutto un atleta: in squadra compare come tale
const RUOLI = { atleta: 'Atleta', genitore: 'Genitore', coach: 'Coach', admin: 'Atleta (admin)' }
const MIGRAZIONE = 'Manca un aggiornamento del database: esegui supabase/11_migrazione_fase11_gestione_squadra.sql e 12_migrazione_fase12_richieste_admin.sql nell\'SQL Editor di Supabase.'
const messaggio = (error) => (/function|schema cache/i.test(error.message) ? MIGRAZIONE : error.message)

// Impostazioni della squadra: visibili solo ad admin e coach.
// Il coach vede chi c'è in squadra, aggiunge persone (per nome o email) e le toglie.
export default function Impostazioni() {
  const { user } = useAuth()
  const { squadra, pronto } = useMiaSquadra()
  const [membri, setMembri] = useState([])
  const [cerca, setCerca] = useState('')
  const [risultati, setRisultati] = useState(null)
  const [errore, setErrore] = useState('')
  const [ok, setOk] = useState('')
  const [invio, setInvio] = useState('')

  const caricaMembri = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, nome, cognome, role')
      .eq('squadra_id', squadra.id).order('cognome')
    setMembri(data || [])
  }, [squadra?.id])

  useEffect(() => { if (squadra) caricaMembri() }, [squadra?.id, caricaMembri]) // eslint-disable-line react-hooks/exhaustive-deps

  async function trova(e) {
    e.preventDefault()
    setErrore('')
    setOk('')
    if (cerca.trim().length < 2) return setErrore('Scrivi almeno 2 lettere del nome, oppure l\'email completa.')
    setInvio('cerca')
    const { data, error } = await supabase.rpc('cerca_persone', { p_testo: cerca.trim(), p_squadra: squadra.id })
    setInvio('')
    if (error) return setErrore(messaggio(error))
    setRisultati(data || [])
  }

  async function aggiungi(p) {
    setErrore('')
    setOk('')
    setInvio(p.id)
    const { error } = await supabase.rpc('aggiungi_a_squadra', { p_persona: p.id, p_squadra: squadra.id })
    setInvio('')
    if (error) return setErrore(messaggio(error))
    setOk(`${p.nome} ${p.cognome || ''} è ora nella squadra ${squadra.nome}.`)
    setRisultati((r) => r?.map((x) => (x.id === p.id ? { ...x, squadra_id: squadra.id, squadra_nome: squadra.nome } : x)))
    caricaMembri()
  }

  // Un account admin non si aggiunge direttamente: riceve una richiesta e decide lui se entrare
  async function invitaAdmin(p) {
    setErrore('')
    setOk('')
    setInvio(p.id)
    const { error } = await supabase.rpc('chiedi_ingresso', { p_persona: p.id, p_squadra: squadra.id })
    setInvio('')
    if (error) return setErrore(messaggio(error))
    setOk(`Richiesta inviata a ${p.nome} ${p.cognome || ''}: entrerà in ${squadra.nome} quando la accetta.`)
    setRisultati((r) => r?.map((x) => (x.id === p.id ? { ...x, richiesta_in_attesa: true } : x)))
  }

  async function togli(p) {
    if (!window.confirm(`Togliere ${p.nome} ${p.cognome || ''} dalla squadra ${squadra.nome}? I suoi tempi restano salvati.`)) return
    setErrore('')
    setOk('')
    setInvio(p.id)
    const { error } = await supabase.rpc('togli_da_squadra', { p_persona: p.id })
    setInvio('')
    if (error) return setErrore(messaggio(error))
    setOk(`${p.nome} ${p.cognome || ''} non è più nella squadra.`)
    setRisultati((r) => r?.map((x) => (x.id === p.id ? { ...x, squadra_id: null, squadra_nome: null } : x)))
    caricaMembri()
  }

  return (
    <AppShell titolo="Impostazioni" attiva="funzioni" indietro="/funzioni">
      {!pronto ? <p className="text-center text-gray-400 py-8">Carico…</p>
        : !squadra ? <SenzaSquadra />
        : (
          <>
            {errore && <p className="text-sm text-white bg-red-500 rounded-lg px-3 py-2 mb-3">{errore}</p>}
            {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{ok}</p>}

            <DomandeIngresso squadra={squadra} onCambio={caricaMembri} />

            <form onSubmit={trova} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-3">
              <p className="font-bold">Aggiungi una persona a {squadra.nome}</p>
              <p className="text-xs text-gray-400 mb-3">
                Cerca per nome o cognome, oppure scrivi l'email completa con cui si è registrata. Puoi aggiungere atleti e genitori;
                agli account admin (che sono anche atleti) arriva una richiesta da accettare.
              </p>
              <div className="flex gap-2">
                <input value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Nome, cognome o email"
                  autoComplete="off" className={CAMPO} />
                <button type="submit" disabled={invio === 'cerca'}
                  className="font-bold text-white bg-blue-600 disabled:opacity-60 rounded-xl px-4 shrink-0">
                  {invio === 'cerca' ? '…' : 'Cerca'}
                </button>
              </div>
              {risultati?.length === 0 && (
                <p className="text-sm text-gray-400 pt-3">Nessuno trovato. Se è già in un'altra squadra, cercalo con l'email completa.</p>
              )}
              {risultati?.map((p) => {
                const qui = p.squadra_id === squadra.id
                const serveRichiesta = p.ruolo === 'admin' && p.id !== user.id
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-3 border-t border-gray-100 mt-3 first-of-type:mt-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.nome} {p.cognome}{p.id === user.id && <span className="text-xs font-bold text-blue-600"> (tu)</span>}</p>
                      <p className="text-xs text-gray-400">
                        {RUOLI[p.ruolo] || p.ruolo}{p.squadra_id && !qui ? ` · ora in ${p.squadra_nome || 'un\'altra squadra'}` : ''}
                        {serveRichiesta && !qui ? ' · entra solo se accetta' : ''}
                      </p>
                    </div>
                    {qui
                      ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 shrink-0">Già in squadra</span>
                      : serveRichiesta && p.richiesta_in_attesa
                      ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 shrink-0">Richiesta inviata</span>
                      : serveRichiesta
                      ? <button type="button" onClick={() => invitaAdmin(p)} disabled={invio === p.id}
                          className="text-sm font-bold text-blue-600 bg-blue-50 disabled:opacity-60 rounded-full px-4 py-1.5 shrink-0">
                          {invio === p.id ? '…' : 'Invia richiesta'}
                        </button>
                      : <button type="button" onClick={() => aggiungi(p)} disabled={invio === p.id}
                          className="text-sm font-bold text-white bg-blue-600 disabled:opacity-60 rounded-full px-4 py-1.5 shrink-0">
                          {invio === p.id ? '…' : p.squadra_id ? 'Sposta qui' : 'Aggiungi'}
                        </button>}
                  </div>
                )
              })}
            </form>

            <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
              <p className="font-bold mb-1">Persone in {squadra.nome}</p>
              <p className="text-xs text-gray-400 mb-2">{membri.length} {membri.length === 1 ? 'persona' : 'persone'}. Togliendo qualcuno dalla squadra i suoi tempi restano salvati.</p>
              {membri.length === 0 && <p className="text-sm text-gray-400 py-3">Nessuno in squadra per ora.</p>}
              {membri.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between gap-3 py-3 ${i ? 'border-t border-gray-100' : ''}`}>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.nome} {p.cognome}{p.id === user.id && <span className="text-xs font-bold text-blue-600"> (tu)</span>}</p>
                    <p className="text-xs text-gray-400">{RUOLI[p.role] || p.role}</p>
                  </div>
                  {p.role !== 'coach' && (
                    <button onClick={() => togli(p)} disabled={invio === p.id}
                      className="text-sm font-semibold text-red-500 disabled:opacity-60 px-2 shrink-0">
                      {invio === p.id ? '…' : 'Togli'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
    </AppShell>
  )
}
