// Formato tempo di SwimLine4:
//   1'20"00  = 1 minuto, 20 secondi, 00 centesimi
//   59"00    = sotto il minuto si scrive senza minuti (vale anche per i 25 metri)
const REGEX_CON_MINUTI = /^(\d{1,2})'([0-5]\d)"(\d{2})$/
const REGEX_SENZA_MINUTI = /^([0-5]?\d)"(\d{2})$/
const REGEX_VECCHIO = /^(\d+):(\d+)\.(\d+)$/ // vecchi dati salvati come 01:05.40

export const ESEMPIO_TEMPO = `1'20"00`
export const ERRORE_TEMPO = `Formato del tempo non valido. Scrivilo così: 1'20"00 (minuti ' secondi " centesimi) oppure 59"00 se sei sotto il minuto.`

// Sistema gli apici "intelligenti" che le tastiere dei telefoni inseriscono da sole
export function normalizzaTempo(t) {
  return (t || '')
    .trim()
    .replace(/[’‘′`´]/g, "'")
    .replace(/[”“″]/g, '"')
    .replace(/''/g, '"')
}

export function tempoValido(t) {
  const s = (t || '').trim()
  const a = s.match(REGEX_CON_MINUTI)
  if (a) return Number(a[1]) * 60 + Number(a[2]) + Number(a[3]) / 100 > 0
  const b = s.match(REGEX_SENZA_MINUTI)
  if (b) return Number(b[1]) + Number(b[2]) / 100 > 0
  return false
}

// Accetta sia il formato nuovo sia quello vecchio, così i dati già salvati restano nel grafico
export function tempoInSecondi(t) {
  const s = (t || '').trim()
  let m = s.match(REGEX_CON_MINUTI)
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 100
  m = s.match(REGEX_SENZA_MINUTI)
  if (m) return parseInt(m[1]) + parseInt(m[2]) / 100
  m = s.match(REGEX_VECCHIO)
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 100
  return null
}

// Sotto il minuto niente minuti: 59"20. Dal minuto in su: 1'20"00
export function secondiInTempo(sec) {
  const c = Math.round(sec * 100)
  const minuti = Math.floor(c / 6000)
  const secondi = Math.floor((c % 6000) / 100)
  const centesimi = c % 100
  const cc = String(centesimi).padStart(2, '0')
  if (minuti === 0) return `${secondi}"${cc}`
  return `${minuti}'${String(secondi).padStart(2, '0')}"${cc}`
}

export function formattaData(valore) {
  if (!valore) return ''
  const d = new Date(valore)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}
