// Quanto è sicura una password, da 0 a 4, per la barra che si riempie mentre si scrive.
// Conta la lunghezza e la varietà (minuscole, maiuscole, numeri, simboli); toglie punti alle
// password facili da indovinare (tutte uguali, sequenze, parole comuni).
const COMUNI = ['password', 'qwerty', 'asdf', 'abc', 'ciao', 'amore', 'juventus', 'inter', 'milan', 'napoli', 'nuoto', 'swim', 'swimline']

export const LIVELLI = [
  ['Troppo corta', 'bg-red-500'],
  ['Debole', 'bg-red-500'],
  ['Così così', 'bg-amber-400'],
  ['Buona', 'bg-emerald-500'],
  ['Ottima', 'bg-emerald-600'],
]

export function forzaPassword(pw = '') {
  if (pw.length < 8) return 0
  const tipi = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((r) => r.test(pw)).length
  let punti = 1
  if (pw.length >= 10) punti += 1
  if (pw.length >= 14) punti += 1
  if (tipi >= 2) punti += 1
  if (tipi >= 3) punti += 1
  const minuscola = pw.toLowerCase()
  const facile = /^(.)\1+$/.test(pw) || /0123|1234|2345|3456|4567|5678|6789|abcd/.test(minuscola)
    || COMUNI.some((p) => minuscola.includes(p))
  if (facile) punti -= 2
  return Math.max(1, Math.min(4, punti))
}
