// Formato tempo di SwimLine4:
//   1'20"00  = 1 minuto, 20 secondi, 00 centesimi
//   59"00    = sotto il minuto si scrive senza minuti (vale anche per i 25 metri)
const REGEX_CON_MINUTI = /^(\d{1,2})'([0-5]\d)"(\d{2})$/
const REGEX_SENZA_MINUTI = /^([0-5]?\d)"(\d{2})$/
const REGEX_VECCHIO = /^(\d+):(\d+)\.(\d+)$/ // vecchi dati salvati come 01:05.40

export const ESEMPIO_TEMPO = `1'20"00`
export const ERRORE_TEMPO = `Formato del tempo non valido. Scrivilo così: 1'20"00 (minuti ' secondi " centesimi) oppure 59"00 se sei sotto il minuto.`

export const ERRORE_TEMPO_BREVE = `Tempo non valido: scrivilo come 59"50 oppure 1'22"34 (anche 5950 o 12234).`

const cc2 = (x) => (x.length === 1 ? x + '0' : x)
const costruisci = (m, s, c) =>
  m > 0 ? `${m}'${String(s).padStart(2, '0')}"${cc2(String(c))}` : `${Number(s)}"${cc2(String(c))}`

// Input intelligente: capisce 59, 5950, 12234, 59.5, 59,50, 1:22.34, 1'22"34 e lo porta al formato standard.
// Se non riesce a capirlo (o i secondi sono 60 o più) restituisce il testo pulito, che poi la validazione rifiuta.
export function normalizzaTempo(t) {
  const s = (t || '')
    .trim()
    .replace(/[’‘′`´]/g, "'")
    .replace(/[”“″]/g, '"')
    .replace(/''/g, '"')
    .replace(/\s+/g, '')
  if (!s) return ''
  if (REGEX_CON_MINUTI.test(s) || REGEX_SENZA_MINUTI.test(s)) return s

  let m, sec, cent
  if (/^\d+$/.test(s)) {
    if (s.length <= 2) { m = 0; sec = Number(s); cent = '00' }
    else {
      cent = s.slice(-2)
      const resto = s.slice(0, -2)
      sec = Number(resto.slice(-2))
      m = resto.length > 2 ? Number(resto.slice(0, -2)) : 0
    }
  } else if ((m = s.match(/^(\d{1,2})[.,"](\d{1,2})$/))) {
    sec = Number(m[1]); cent = cc2(m[2]); m = 0
  } else if ((m = s.match(/^(\d{1,2})[:'.,](\d{1,2})[.,"](\d{1,2})$/))) {
    sec = Number(m[2]); cent = cc2(m[3]); m = Number(m[1])
  } else return s

  if (sec > 59 || m > 99) return s
  return costruisci(m, sec, cent)
}

// Tempo di ripartenza di una serie (minuti e secondi, senza centesimi): 1'30" oppure 45" sotto il minuto.
// Capisce 130, 1:30, 1.30, 1'30, 90 (secondi) e lo porta al formato standard; vuoto resta vuoto.
// Se non riesce a capirlo restituisce il testo pulito, che ripartenzaValida poi rifiuta.
export function normalizzaRipartenza(t) {
  const s = (t || '').trim().replace(/[’‘′`´]/g, "'").replace(/[”“″]/g, '"').replace(/\s+/g, '')
  if (!s) return ''
  let m, sec, x
  if (/^\d{1,2}$/.test(s) || /^\d{1,2}"$/.test(s)) { m = 0; sec = parseInt(s) }
  else if (/^\d{3,4}$/.test(s)) { m = Number(s.slice(0, -2)); sec = Number(s.slice(-2)) }
  else if ((x = s.match(/^(\d{1,2})[:'.,](\d{1,2})"?$/))) { m = Number(x[1]); sec = Number(x[2]) }
  else return s
  if (m === 0 && sec >= 60) { m = Math.floor(sec / 60); sec %= 60 }
  if (sec > 59 || m + sec === 0) return s
  return m > 0 ? `${m}'${String(sec).padStart(2, '0')}"` : `${sec}"`
}

export const ripartenzaValida = (t) => !t || /^(\d{1,2}'[0-5]\d|[1-5]?\d)"$/.test(t)

// Passaggi cumulativi di una gara: devono crescere e restare sotto il tempo finale
export function passaggiCoerenti(passaggi, finale) {
  let prec = 0
  for (let i = 0; i < passaggi.length; i++) {
    const sec = tempoInSecondi(passaggi[i])
    if (sec === null) continue
    if (sec <= prec) return `Il passaggio ${i + 1} deve essere più lento del precedente.`
    prec = sec
  }
  const fin = tempoInSecondi(finale)
  if (fin !== null && prec >= fin) return 'L\'ultimo passaggio deve essere più veloce del tempo finale.'
  return null
}

export function tempoValido(t) {
  const s = (t || '').trim()
  const a = s.match(REGEX_CON_MINUTI)
  if (a) return Number(a[1]) * 60 + Number(a[2]) + Number(a[3]) / 100 > 0
  const b = s.match(REGEX_SENZA_MINUTI)
  if (b) return Number(b[1]) + Number(b[2]) / 100 > 0
  return false
}

// Un tempo è plausibile se non è più veloce di 9" ogni 25 m (i record del mondo stanno sopra i 10" a vasca).
// Blocca gli errori di battitura tipo 3"67 su un 100 invece di 1'03"67. Senza distanza non si controlla.
const SECONDI_MINIMI_OGNI_25 = 9
export function tempoPlausibile(t, distanza) {
  const sec = tempoInSecondi(t)
  const d = Number(distanza)
  if (sec === null || !(d > 0)) return true
  return sec >= (d / 25) * SECONDI_MINIMI_OGNI_25
}
export const erroreTempoImpossibile = (distanza) =>
  `Tempo troppo veloce per ${distanza} m: controlla di averlo scritto bene (es. 1'03"67, non 3"67).`

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
