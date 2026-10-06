import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export const PUNTI_DEFAULT = { punti_presenza: 10, punti_risultati: 5, punti_gara: 15, punti_miglioramento: 10, soglia_premio: 100 }

// Livelli in base ai punti totali
export const LIVELLI = [
  { nome: 'Bronzo', da: 0, colore: 'text-orange-700', barra: 'bg-orange-600' },
  { nome: 'Argento', da: 500, colore: 'text-gray-500', barra: 'bg-gray-400' },
  { nome: 'Oro', da: 1500, colore: 'text-yellow-600', barra: 'bg-yellow-500' },
]
export const livelloDi = (tot) => [...LIVELLI].reverse().find((l) => tot >= l.da) || LIVELLI[0]

export const MSG_FASE10 = 'Esegui prima la migrazione fase 10 su Supabase.'

// Punti, movimenti e premi dell'atleta loggato
export function usePunti(user, profile) {
  const [stato, setStato] = useState({ pronto: false, tot: 0, movimenti: [], premi: [], config: PUNTI_DEFAULT, errore: '' })

  const carica = useCallback(async () => {
    if (!user) return
    const [mov, prem, conf] = await Promise.all([
      supabase.from('punti_movimenti').select('id, punti, motivo, data, created_at').eq('atleta_id', user.id).order('created_at', { ascending: false }).limit(1000),
      supabase.from('premi_atleta').select('*').eq('atleta_id', user.id).order('ottenuto_il', { ascending: false }),
      profile?.squadra_id
        ? supabase.from('punti_config').select('*').eq('squadra_id', profile.squadra_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    if (mov.error) return setStato((s) => ({ ...s, pronto: true, errore: MSG_FASE10 }))
    const movimenti = mov.data || []
    setStato({
      pronto: true, errore: '',
      tot: movimenti.reduce((a, m) => a + m.punti, 0),
      movimenti, premi: prem.data || [],
      config: { ...PUNTI_DEFAULT, ...(conf.data || {}) },
    })
  }, [user?.id, profile?.squadra_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carica() }, [carica])
  return { ...stato, carica }
}
