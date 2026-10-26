import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export const PUNTI_DEFAULT = { punti_presenza: 10, punti_risultati: 5, punti_gara: 15, punti_miglioramento: 10, soglia_premio: 1000 }

// Le voci che danno punti da sole (stessi nomi in punti_assegna). A 0 sono spente.
export const VOCI_AUTOMATICHE = [
  ['punti_presenza', 'Presenza', 'Quando il coach segna l\'atleta presente', 'spunta'],
  ['punti_risultati', 'Risultati inseriti', 'Quando l\'atleta scrive i tempi di un allenamento', 'cronometro'],
  ['punti_gara', 'Gara completata', 'Per ogni tempo di gara inserito', 'coppa'],
  ['punti_miglioramento', 'Tempo migliorato', 'Quando batte il suo miglior tempo sulla stessa gara', 'grafico'],
]

// Il costo di un premio sta tra il 90% e il 100% dei punti che servono per sceglierlo
export const costoMinimo = (soglia) => Math.round(soglia * 0.9)
export const costoDi = (premio, soglia) => Math.min(soglia, Math.max(costoMinimo(soglia), premio.costo || soglia))

// Livelli in base ai punti totali
export const LIVELLI = [
  { nome: 'Bronzo', da: 0, colore: 'text-orange-700', barra: 'bg-orange-600' },
  { nome: 'Argento', da: 500, colore: 'text-gray-500', barra: 'bg-gray-400' },
  { nome: 'Oro', da: 1500, colore: 'text-yellow-600', barra: 'bg-yellow-500' },
]
export const livelloDi = (tot) => [...LIVELLI].reverse().find((l) => tot >= l.da) || LIVELLI[0]

export const MSG_FASE10 = 'Esegui prima la migrazione fase 10 su Supabase.'

// Punti, movimenti e premi dell'atleta loggato. saldo = punti ancora da spendere in premi.
export function usePunti(user, profile) {
  const [stato, setStato] = useState({ pronto: false, tot: 0, saldo: 0, movimenti: [], premi: [], proposte: null, config: PUNTI_DEFAULT, errore: '' })

  const carica = useCallback(async () => {
    if (!user) return
    const [mov, prem, conf, prop] = await Promise.all([
      supabase.from('punti_movimenti').select('id, punti, motivo, data, created_at').eq('atleta_id', user.id).order('created_at', { ascending: false }).limit(1000),
      supabase.from('premi_atleta').select('*').eq('atleta_id', user.id).order('ottenuto_il', { ascending: false }),
      profile?.squadra_id
        ? supabase.from('punti_config').select('*').eq('squadra_id', profile.squadra_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('premi_proposte').select('opzioni').eq('atleta_id', user.id).maybeSingle(),
    ])
    if (mov.error) return setStato((s) => ({ ...s, pronto: true, errore: MSG_FASE10 }))
    const movimenti = mov.data || []
    const premi = prem.data || []
    const config = { ...PUNTI_DEFAULT, ...(conf.data || {}) }
    const tot = movimenti.reduce((a, m) => a + m.punti, 0)
    const spesi = premi.reduce((a, p) => a + (p.costo ?? config.soglia_premio), 0)
    setStato({
      pronto: true, errore: '', tot, saldo: Math.max(0, tot - spesi),
      movimenti, premi, config, proposte: prop.data?.opzioni || null,
    })
  }, [user?.id, profile?.squadra_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carica() }, [carica])
  return { ...stato, carica }
}
