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

// Serie a giri: righe consecutive con lo stesso serie.id si ripetono in sequenza per serie.giri volte
// (es. 3 giri di 400-300-200). Su ogni riga "ripetizioni" è il totale (per giro × giri), così metri
// e risultati restano come per le righe normali; il passaggio k del giro g sta in posizione g × perGiro + k.
export const giriSerie = (r) => (r?.serie ? Math.max(1, Number(r.serie.giri) || 1) : 1)
export const perGiro = (r) => Math.max(1, Math.round((Number(r.ripetizioni) || 1) / giriSerie(r)))

// Raggruppa le righe del piano in blocchi: { riga, indice } oppure { serie, righe: [{ riga, indice }] }
export function blocchiPiano(righe = []) {
  const blocchi = []
  righe.forEach((riga, indice) => {
    const ultimo = blocchi[blocchi.length - 1]
    if (riga.serie && ultimo?.serie?.id === riga.serie.id) ultimo.righe.push({ riga, indice })
    else if (riga.serie) blocchi.push({ serie: riga.serie, righe: [{ riga, indice }] })
    else blocchi.push({ riga, indice })
  })
  return blocchi
}

// Minuti totali di un piano (somma del tempo stimato dal coach per ogni riga o serie; quelle senza tempo non contano)
export const minutiPiano = (righe = []) =>
  blocchiPiano(righe).reduce((s, b) => s + (Number(b.serie ? b.serie.minuti : b.riga.minuti) || 0), 0)

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
