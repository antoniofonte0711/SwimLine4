// Supabase restituisce al massimo 1000 righe per richiesta: oltre, i dati verrebbero tagliati senza avviso.
// caricaTutto ripete la richiesta a pagine (ordinate per id, così nessuna riga si perde o si ripete)
// finché arrivano pagine piene. `crea` costruisce ogni volta la richiesta da capo, es.
//   caricaTutto(() => supabase.from('gare').select('*').eq('atleta_id', id))
const PAGINA = 1000
const MAX_PAGINE = 200 // tetto di sicurezza: 200.000 righe

export async function caricaTutto(crea) {
  const tutte = []
  for (let p = 0; p < MAX_PAGINE; p++) {
    const da = p * PAGINA
    const { data, error } = await crea().order('id').range(da, da + PAGINA - 1)
    if (error) return { data: tutte, error }
    tutte.push(...(data || []))
    if (!data || data.length < PAGINA) break
  }
  return { data: tutte, error: null }
}
