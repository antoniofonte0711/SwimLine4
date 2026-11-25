// Una gara non può esserci due volte per lo stesso atleta: stesso giorno, distanza e stile.
// Il database lo blocca (migrazione 52); qui i controlli prima di salvare e il messaggio da mostrare.

export const chiaveGara = (g) => [g.atleta_id, g.data_gara || g.data, Number(g.distanza), g.stile].join('|')

const dataIt = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT') : '')

// Il database ha rifiutato per il blocco dei doppioni?
export const eDoppione = (error) => error?.code === '23505' && /gare_senza_doppioni|gare/.test(error?.message || '')

export const messaggioDoppione = (g, chi = '') =>
  `Non si può: ${chi ? chi + ' ha' : 'c\'è'} già ${g.distanza} ${g.stile} del ${dataIt(g.data_gara || g.data)}. Una gara non può esserci due volte.`

// Fra le gare da aggiungere, la prima che esiste già (fra le `esistenti`) o che si ripete nella lista stessa
export function primoDoppione(nuove = [], esistenti = []) {
  const viste = new Set(esistenti.map(chiaveGara))
  for (const g of nuove) {
    const k = chiaveGara(g)
    if (viste.has(k)) return g
    viste.add(k)
  }
  return null
}
