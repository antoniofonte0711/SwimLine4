import { supabase } from './supabaseClient'

// Supabase restituisce al massimo 1000 righe per richiesta: si legge a pagine finché non finiscono
const PAGINA = 1000

export async function leggiTutto(tabella, filtro = (q) => q) {
  const righe = []
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await filtro(supabase.from(tabella).select('*')).range(da, da + PAGINA - 1)
    if (error) return { errore: error.message }
    righe.push(...(data || []))
    if (!data || data.length < PAGINA) return righe
  }
}

// Fa scaricare al telefono/computer un file JSON
export function scaricaJson(dati, nome) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(dati, null, 1)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// I dati di una persona (diritto di accesso e portabilità, art. 15 e 20 GDPR): solo i suoi, non quelli della squadra
const MIEI = [
  ['allenamenti', 'atleta_id'], ['gare', 'atleta_id'], ['presenze', 'atleta_id'], ['punti_movimenti', 'atleta_id'],
  ['premi_atleta', 'atleta_id'], ['atleta_riferimenti', 'atleta_id'], ['notifiche', 'destinatario_id'],
]
export async function iMieiDati(id) {
  const copia = { esportato_il: new Date().toISOString() }
  copia.profilo = await leggiTutto('profiles', (q) => q.eq('id', id))
  for (const [t, col] of MIEI) copia[t] = await leggiTutto(t, (q) => q.eq(col, id))
  copia.genitori_figli = await leggiTutto('genitori_figli', (q) => q.or(`genitore_id.eq.${id},atleta_id.eq.${id}`))
  copia.incoraggiamenti = await leggiTutto('incoraggiamenti', (q) => q.or(`genitore_id.eq.${id},atleta_id.eq.${id}`))
  return copia
}
