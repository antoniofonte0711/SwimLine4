// Data scritta a mano (GG/MM/AAAA), senza calendario: le barre si mettono da sole mentre si scrive.

// "11102010" → "11/10/2010" (solo cifre, al massimo 8)
export function formattaDataScritta(testo) {
  const c = String(testo || '').replace(/\D/g, '').slice(0, 8)
  if (c.length <= 2) return c
  if (c.length <= 4) return `${c.slice(0, 2)}/${c.slice(2)}`
  return `${c.slice(0, 2)}/${c.slice(2, 4)}/${c.slice(4)}`
}

// "11/10/2010" → "2010-10-11"; null se incompleta o se il giorno non esiste (es. 31/02)
export function dataDaScritta(testo) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(testo || '').trim())
  if (!m) return null
  const [, g, mm, a] = m.map(Number)
  const d = new Date(a, mm - 1, g, 12)
  if (d.getFullYear() !== a || d.getMonth() !== mm - 1 || d.getDate() !== g) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

// "2010-10-11" → "11/10/2010"
export const scrittaDaData = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

// Data di nascita: vera, non nel futuro, non prima del 1900
export function erroreNascita(testo, oggi = new Date()) {
  if (!testo) return 'Scrivi la data di nascita.'
  const iso = dataDaScritta(testo)
  if (!iso) return 'Scrivi la data di nascita così: GG/MM/AAAA (es. 05/03/2012).'
  const adesso = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`
  if (iso > adesso) return 'La data di nascita non può essere nel futuro.'
  if (iso < '1900-01-01') return 'Controlla l\'anno di nascita.'
  return ''
}
