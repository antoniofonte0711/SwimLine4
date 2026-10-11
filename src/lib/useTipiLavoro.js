import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'
import { elencoLavori, impostaRegistro } from './tipiLavoro'

// Lavori aggiunti (elenco generale + quelli della squadra) e spunte acceso/spento di una squadra
export async function leggiLavori(squadraId) {
  const tipi = supabase.from('tipi_lavoro').select('id, squadra_id, sigla, descrizione, gruppo, peso, colore').order('created_at')
  const [{ data: righe }, { data: spunte }] = await Promise.all([
    squadraId ? tipi.or(`squadra_id.is.null,squadra_id.eq.${squadraId}`) : tipi.is('squadra_id', null),
    squadraId ? supabase.from('tipi_lavoro_squadra').select('sigla, attivo').eq('squadra_id', squadraId) : Promise.resolve({ data: [] }),
  ])
  return {
    squadraId,
    extra: (righe || []).map((r) => ({
      ...r, peso: Number(r.peso), soloCoach: false, origine: r.squadra_id ? 'squadra' : 'generale',
    })),
    spunte: Object.fromEntries((spunte || []).map((s) => [s.sigla, s.attivo])),
  }
}

// Cache condivisa come per le regole: si legge una volta, si ricarica dopo un salvataggio
let cache = { chiave: undefined, promessa: null }
const ascoltatori = new Set()
export function ricaricaTipiLavoro() {
  cache = { chiave: undefined, promessa: null }
  ascoltatori.forEach((f) => f())
}

// Lavori della squadra in uso (la sua, o quella in cui l'admin è entrato).
// Riempie anche il registro, così colori e difficoltà li conoscono in tutta l'app.
export function useTipiLavoro() {
  const { profile, squadraGestita } = useAuth()
  const squadraId = squadraGestita?.id || profile?.squadra_id || null
  const [dati, setDati] = useState(null)
  const [giro, setGiro] = useState(0)

  useEffect(() => {
    const f = () => setGiro((g) => g + 1)
    ascoltatori.add(f)
    return () => ascoltatori.delete(f)
  }, [])

  useEffect(() => {
    if (!profile) return
    let attivo = true
    if (cache.chiave !== squadraId || !cache.promessa) {
      cache = { chiave: squadraId, promessa: leggiLavori(squadraId).catch(() => ({ squadraId, extra: [], spunte: {} })) }
    }
    cache.promessa.then((x) => {
      impostaRegistro(x)
      if (attivo) setDati(x)
    })
    return () => { attivo = false }
  }, [profile, squadraId, giro])

  return { pronto: dati !== null, squadraId, lavori: elencoLavori(dati?.extra, dati?.spunte) }
}
