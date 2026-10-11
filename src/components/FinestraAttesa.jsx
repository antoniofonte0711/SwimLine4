import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Icona from './Icona'

// Chi ha chiesto di entrare in una squadra vede questa finestra una volta per richiesta (ricordato su questo telefono)
const CHIAVE = 'swimline4:attesaVista:'
export function attesaGiaVista(id) {
  try { return localStorage.getItem(CHIAVE + id) === '1' } catch { return false }
}
function segnaVista(id) {
  try { localStorage.setItem(CHIAVE + id, '1') } catch { /* non disponibile */ }
}

// Finestra al centro, sfondo scurito: la richiesta è arrivata al coach. Si può usare l'app anche senza squadra.
// richiesta: { id, squadra_nome, coach_nome } (da mie_richieste)
export default function FinestraAttesa({ richiesta, onChiudi, onAnnullata }) {
  const [errore, setErrore] = useState('')
  const [invio, setInvio] = useState(false)
  const capito = useRef(null)

  useEffect(() => {
    capito.current?.focus()
    const esc = (e) => { if (e.key === 'Escape') chiudi() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- solo all'apertura

  function chiudi() {
    segnaVista(richiesta.id)
    onChiudi()
  }

  async function annulla() {
    if (!window.confirm(`Annullare la richiesta per ${richiesta.squadra_nome}?`)) return
    setErrore('')
    setInvio(true)
    const { error } = await supabase.rpc('annulla_mia_domanda', { p_richiesta: richiesta.id })
    setInvio(false)
    if (error) return setErrore(error.message)
    segnaVista(richiesta.id)
    onAnnullata?.()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-abisso/60 backdrop-blur-[2px]" onClick={chiudi}>
      <div role="dialog" aria-modal="true" aria-labelledby="attesa-titolo" onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-[28px] p-6 text-center shadow-[0_24px_60px_rgba(4,26,77,0.35)]">
        <span className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-schiuma text-blue-600 flex items-center justify-center">
          <Icona nome="clessidra" className="w-7 h-7" />
        </span>
        <h2 id="attesa-titolo" className="font-display text-[22px] font-extrabold text-abisso leading-tight">
          Il coach ha ricevuto la tua richiesta: aspettiamo che la accetti.
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Hai chiesto di entrare in <b className="text-abisso">{richiesta.squadra_nome}</b>
          {richiesta.coach_nome ? <> (coach <b className="text-abisso">{richiesta.coach_nome}</b>)</> : ''}. Ti arriva una notifica quando risponde.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Intanto puoi usare l'app con le tue impostazioni personali; quando entri valgono quelle della squadra.
        </p>
        {errore && <p role="alert" className="text-sm text-white bg-red-600 rounded-xl px-3 py-2 mt-3">{errore}</p>}
        <button ref={capito} type="button" onClick={chiudi}
          className="w-full min-h-[52px] mt-5 bg-blue-600 text-white font-display font-extrabold text-lg rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition">
          Ho capito
        </button>
        <button type="button" onClick={annulla} disabled={invio}
          className="w-full min-h-[48px] mt-2 font-bold text-slate-600 bg-bordo rounded-2xl disabled:opacity-60">
          {invio ? 'Annullo…' : 'Annulla richiesta'}
        </button>
      </div>
    </div>
  )
}
