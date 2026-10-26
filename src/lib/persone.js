// Ordine alfabetico delle persone, come si leggono a schermo: "Nome Cognome", senza badare a maiuscole e accenti
const chiave = (p) => `${p?.nome || ''} ${p?.cognome || ''}`.trim()
export const ordinaPersone = (lista) => [...(lista || [])]
  .sort((a, b) => chiave(a).localeCompare(chiave(b), 'it', { sensitivity: 'base' }))
