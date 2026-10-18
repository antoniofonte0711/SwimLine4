import { useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

// Tempo di attività: finché l'app è aperta e in primo piano, ogni minuto manda un segnale (un solo numero al giorno
// per persona, nessuna pagina o azione). Lo vede solo l'admin, come totali. Vedi migrazione 34.
const OGNI = 60_000

export function useSegnalaAttivita() {
  const { user } = useAuth()
  useEffect(() => {
    // Conta sempre l'account con cui si è entrati: col "cambio vista" è l'admin, con "Accedi come" è la persona
    if (!user) return
    let timer = null
    const manda = (apertura = false) => {
      if (document.visibilityState !== 'visible') return
      supabase.rpc('segnala_attivita', { p_apertura: apertura }).then(() => {}, () => {})
    }
    const avvia = () => { manda(true); timer = setInterval(() => manda(false), OGNI) }
    const ferma = () => { clearInterval(timer); timer = null }
    const cambia = () => { if (document.visibilityState === 'visible') { if (!timer) avvia() } else ferma() }
    document.addEventListener('visibilitychange', cambia)
    cambia()
    return () => { document.removeEventListener('visibilitychange', cambia); ferma() }
  }, [user])
}

// Per la dashboard admin: da una riga { giorni_attivi, minuti_totali } ai valori da mostrare
export function riassunto(r, giorni) {
  if (!r) return { medioAttivo: 0, medioGiorno: 0 }
  return {
    medioAttivo: r.giorni_attivi ? Math.round(r.minuti_totali / r.giorni_attivi) : 0,
    medioGiorno: giorni ? Math.round(r.minuti_totali / giorni) : 0,
  }
}
