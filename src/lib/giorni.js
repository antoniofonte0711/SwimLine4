import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

// Giorni di allenamento della squadra, scelti dal coach nel Calendario.
// Chiave 0 = domenica ... 6 = sabato; valore 'si' (fisso) o 'avolte'. Giorno assente = niente allenamento.
export const GIORNI_BASE = { 1: 'si', 2: 'si', 3: 'si', 4: 'si', 5: 'si' } // finché il coach non sceglie: lunedì-venerdì
// In ordine da lunedì a domenica
export const SETTIMANA = [
  [1, 'Lun', 'lunedì'], [2, 'Mar', 'martedì'], [3, 'Mer', 'mercoledì'], [4, 'Gio', 'giovedì'],
  [5, 'Ven', 'venerdì'], [6, 'Sab', 'sabato'], [0, 'Dom', 'domenica'],
]

export const tipoGiorno = (giorni, data) => giorni[new Date(data + 'T12:00:00').getDay()] || 'no'

// "5 volte a settimana (lun-ven) · sabato a volte"
export function riassuntoGiorni(giorni) {
  const fissi = SETTIMANA.filter(([n]) => giorni[n] === 'si')
  const aVolte = SETTIMANA.filter(([n]) => giorni[n] === 'avolte')
  const elenco = (l) => l.map(([, corto]) => corto.toLowerCase()).join(', ')
  let t = `${fissi.length} ${fissi.length === 1 ? 'volta' : 'volte'} a settimana (${elenco(fissi)})`
  if (aVolte.length) t += ` · a volte anche ${aVolte.map(([, , lungo]) => lungo).join(' e ')}`
  return t
}

// Cache per squadra: Calendario, Presenze e tabella settimanale leggono lo stesso dato
const cache = new Map()
const ascoltatori = new Set()
function leggi(squadraId) {
  if (!cache.has(squadraId)) {
    cache.set(squadraId, supabase.from('impostazioni_squadra').select('giorni').eq('squadra_id', squadraId).maybeSingle()
      // senza la migrazione 46 la colonna non c'è: si resta su lunedì-venerdì
      .then(({ data, error }) => (!error && data?.giorni && Object.keys(data.giorni).length ? data.giorni : GIORNI_BASE))
      .catch(() => GIORNI_BASE))
  }
  return cache.get(squadraId)
}

export function useGiorniSquadra(squadraId) {
  const [giorni, setGiorni] = useState(GIORNI_BASE)
  const [giro, setGiro] = useState(0)
  useEffect(() => {
    const f = () => setGiro((g) => g + 1)
    ascoltatori.add(f)
    return () => ascoltatori.delete(f)
  }, [])
  useEffect(() => {
    if (!squadraId) return
    let attivo = true
    leggi(squadraId).then((g) => { if (attivo) setGiorni(g) })
    return () => { attivo = false }
  }, [squadraId, giro])
  return giorni
}

export async function salvaGiorni(squadraId, giorni) {
  const { error } = await supabase.rpc('imposta_giorni_squadra', { p_squadra: squadraId, p_giorni: giorni })
  if (error) return /function|schema cache|column/i.test(error.message) ? 'Manca un aggiornamento del database (migrazione 46).' : error.message
  cache.set(squadraId, Promise.resolve(giorni))
  ascoltatori.forEach((f) => f())
  return null
}
