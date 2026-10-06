import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

import { STILI } from './lavori'

export const TIPI_COACH = ['Riscaldamento', 'Tecnica', 'Gambe', 'Sciolto', 'Defaticamento']
// Il coach può anche lasciare che ognuno nuoti il proprio stile (non vale per i lavori inseriti dagli atleti)
export const STILI_COACH = [...STILI, 'Proprio stile']
export const RIGA_VUOTA = { tipo_lavoro: 'A2', distanza: 100, ripetizioni: 4, stile: 'Stile libero', note: '', minuti: '', ripartenza: '' }

// Ripartenze da mostrare per una riga: se il coach le ha personalizzate, una per ripetizione
// (le caselle vuote usano la ripartenza generale), altrimenti solo quella generale. [] se non ce n'è nessuna.
export function ripartenzeDiRiga(r) {
  const n = Math.max(1, Number(r.ripetizioni) || 1)
  const lista = Array.isArray(r.ripartenze) ? r.ripartenze.slice(0, n) : []
  if (!lista.some(Boolean)) return r.ripartenza ? [r.ripartenza] : []
  return Array.from({ length: n }, (_, k) => lista[k] || r.ripartenza || '–')
}

// Minuti totali di un piano (somma del tempo stimato dal coach per ogni riga; le righe senza tempo non contano)
export const minutiPiano = (righe = []) => righe.reduce((s, r) => s + (Number(r.minuti) || 0), 0)

// Metri totali di un piano (distanza × ripetizioni di ogni riga)
export const metriPiano = (righe = []) =>
  righe.reduce((s, r) => s + (Number(r.distanza) || 0) * (Number(r.ripetizioni) || 1), 0)

export const addGiorni = (s, n) => {
  const d = new Date(s + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// Squadra del coach (o, per l'admin, quella in cui è entrato; altrimenti la sua squadra)
export function useMiaSquadra() {
  const { user, profile, squadraGestita } = useAuth()
  const [squadra, setSquadra] = useState(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    let attivo = true
    async function carica() {
      if (squadraGestita) {
        // ricarico il nome dal database: potrebbe essere cambiato dopo l'ingresso
        const { data } = await supabase.from('squadre').select('id, nome').eq('id', squadraGestita.id).limit(1)
        if (!attivo) return
        setSquadra(data?.[0] || squadraGestita)
        setPronto(true)
        return
      }
      let { data } = await supabase.from('squadre').select('id, nome').eq('coach_id', user.id).limit(1)
      if (!data?.length && profile?.squadra_id) {
        ;({ data } = await supabase.from('squadre').select('id, nome').eq('id', profile.squadra_id).limit(1))
      }
      if (!attivo) return
      setSquadra(data?.[0] || null)
      setPronto(true)
    }
    carica()
    return () => { attivo = false }
  }, [user.id, profile?.squadra_id, squadraGestita?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return { squadra, pronto }
}
