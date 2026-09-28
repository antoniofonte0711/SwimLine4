// Formato tempo di SwimLine4: 1'20"00 = 1 minuto, 20 secondi, 00 centesimi
const REGEX_NUOVO = /^(\d{1,2})'([0-5]\d)"(\d{2})$/
const REGEX_VECCHIO = /^(\d+):(\d+)\.(\d+)$/ // vecchi dati salvati come 01:05.40

export const ESEMPIO_TEMPO = `1'20"00`
export const ERRORE_TEMPO = `Formato del tempo non valido. Scrivilo così: 1'20"00 (minuti ' secondi " centesimi).`

// Sistema gli apici "intelligenti" che le tastiere dei telefoni inseriscono da sole
export function normalizzaTempo(t) {
  return (t || '')
    .trim()
    .replace(/[’‘′`´]/g, "'")
    .replace(/[”“″]/g, '"')
    .replace(/''/g, '"')
}

export function tempoValido(t) {
  const m = (t || '').match(REGEX_NUOVO)
  if (!m) return false
  return Number(m[1]) * 60 + Number(m[2]) + Number(m[3]) / 100 > 0
}

// Accetta sia il formato nuovo sia quello vecchio, così i dati già salvati restano nel grafico
export function tempoInSecondi(t) {
  const s = (t || '').trim()
  const m = s.match(REGEX_NUOVO) || s.match(REGEX_VECCHIO)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3]) / 100
}

export function secondiInTempo(sec) {
  const c = Math.round(sec * 100)
  const minuti = Math.floor(c / 6000)
  const secondi = Math.floor((c % 6000) / 100)
  const centesimi = c % 100
  return `${minuti}'${String(secondi).padStart(2, '0')}"${String(centesimi).padStart(2, '0')}`
}

export function formattaData(valore) {
  if (!valore) return ''
  const d = new Date(valore)
  if (isNaN(d)) return ''
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}