// Stile e nota di ogni ripetizione (es. 4×75: "Stile libero · forte", "Proprio stile · piano", ...).
// Il coach li imposta solo se cambiano da una ripetizione all'altra; vuoto = vale quello generale della riga.
export const haVarianti = (r) =>
  (Array.isArray(r?.stili) && r.stili.some(Boolean)) || (Array.isArray(r?.note_rip) && r.note_rip.some(Boolean))

// Ripetizioni di un giro: nelle serie a giri "ripetizioni" è il totale, e lo schema di stili vale per ogni giro
const perGiroRiga = (r) => {
  const n = Math.max(1, Number(r.ripetizioni) || 1)
  return r.serie ? Math.max(1, Math.round(n / Math.max(1, Number(r.serie.giri) || 1))) : n
}

export function ripetizioniDiRiga(r) {
  const n = Math.max(1, Number(r.ripetizioni) || 1)
  const pg = perGiroRiga(r)
  return Array.from({ length: n }, (_, j) => ({ stile: r.stili?.[j % pg] || r.stile, nota: r.note_rip?.[j % pg] || '' }))
}

// "Stile libero forte · Proprio stile piano" per la scheda del lavoro; '' se la riga non ha varianti
export const riassuntoVarianti = (r) =>
  haVarianti(r) ? ripetizioniDiRiga(r).slice(0, perGiroRiga(r)).map((v) => v.stile + (v.nota ? ` ${v.nota}` : '')).join(' · ') : ''

// ---------- Vasche da cronometrare ----------
// Il coach, scrivendo l'allenamento, sceglie per ogni ripetizione quali pezzi contano per i tempi
// (es. 4×200 misto con un 50 forte diverso ogni volta). r.tratti = { vasca: 25 | 50, scelte: [[pezzi della 1ª], [della 2ª], …] }.
// Nel misto i pezzi sono i 4 stili in ordine di gara (100 → 25 per stile, 200 → 50, 400 → 100);
// negli altri stili sono le vasche, e vasche scelte una dopo l'altra fanno un tratto solo (es. 7ª e 8ª = ultimi 50).
export const ORDINE_MISTI = ['Farfalla', 'Dorso', 'Rana', 'Stile libero']
const MAX_PEZZI = 40

// Pezzi tra cui scegliere nella ripetizione j: [{ stile, distanza, nome }]. [] se non si può dividere.
export function pezziDiRiga(r, j = 0) {
  const d = Number(r.distanza) || 0
  const stile = ripetizioniDiRiga(r)[j]?.stile || r.stile
  if (stile === 'Misti') {
    // il 50 misto (12,5 m per stile) non si cronometra a pezzi
    if (d % 4 || d / 4 < 25) return []
    return ORDINE_MISTI.map((s) => ({ stile: s, distanza: d / 4, nome: s === 'Farfalla' ? 'Delfino' : s === 'Stile libero' ? 'Stile' : s }))
  }
  const vasca = Number(r.tratti?.vasca) || 25
  const n = d / vasca
  if (!Number.isInteger(n) || n < 2 || n > MAX_PEZZI) return []
  return Array.from({ length: n }, (_, k) => ({ stile, distanza: vasca, nome: `${k + 1}ª` }))
}

export const haTratti = (r) => !r?.serie && Array.isArray(r?.tratti?.scelte) && r.tratti.scelte.some((s) => s?.length)

// Le caselle dei tempi di una riga, nell'ordine in cui si nuotano: [{ stile, distanza, nota, etichetta }].
// Senza vasche scelte una per ripetizione; con le vasche scelte una per tratto (ripetizioni senza scelta: nessuna casella).
export function caselleDiRiga(r) {
  const rip = ripetizioniDiRiga(r)
  if (!haTratti(r)) return rip.map((v) => ({ ...v, distanza: Number(r.distanza) }))
  const caselle = []
  rip.forEach((v, j) => {
    const pezzi = pezziDiRiga(r, j)
    const scelti = [...new Set(r.tratti.scelte[j] || [])].filter((k) => k >= 0 && k < pezzi.length).sort((a, b) => a - b)
    const tratti = []
    scelti.forEach((k) => {
      const ultimo = tratti[tratti.length - 1]
      // nel misto ogni stile resta a sé; negli altri le vasche di fila si uniscono
      if (ultimo && v.stile !== 'Misti' && ultimo.fine === k - 1) ultimo.fine = k
      else tratti.push({ inizio: k, fine: k })
    })
    tratti.forEach(({ inizio, fine }) => {
      const p = pezzi[inizio]
      const distanza = p.distanza * (fine - inizio + 1)
      const dove = v.stile === 'Misti' ? p.nome : inizio === fine ? `vasca ${inizio + 1}` : `vasche ${inizio + 1}-${fine + 1}`
      caselle.push({ stile: p.stile, nota: v.nota, distanza, breve: `${distanza} m ${dove}`, etichetta: `${j + 1}ª · ${distanza} m ${dove}` })
    })
  })
  return caselle
}

// Scelte pulite per il salvataggio: solo pezzi che esistono ancora, una lista per ripetizione; null se non resta nulla
export function trattiPuliti(r) {
  if (r.serie || !Array.isArray(r.tratti?.scelte)) return null
  const n = Math.max(1, Number(r.ripetizioni) || 1)
  const scelte = Array.from({ length: n }, (_, j) => {
    const quanti = pezziDiRiga(r, j).length
    return [...new Set(r.tratti.scelte[j] || [])].filter((k) => Number.isInteger(k) && k >= 0 && k < quanti).sort((a, b) => a - b)
  })
  return scelte.some((s) => s.length) ? { vasca: Number(r.tratti.vasca) || 25, scelte } : null
}

// Le caselle della riga raggruppate per stile reale (e distanza), nell'ordine in cui compaiono:
// [{ stile, distanza, reps: [posizioni] }]. Ogni gruppo si salva come un lavoro a sé, così il tempo finisce
// nella categoria del suo stile (progressi, record, previsioni). Senza varianti c'è un solo gruppo.
export function gruppiPerStile(r) {
  const gruppi = []
  caselleDiRiga(r).forEach((v, j) => {
    const g = gruppi.find((x) => x.stile === v.stile && x.distanza === v.distanza)
    if (g) g.reps.push(j)
    else gruppi.push({ stile: v.stile, distanza: v.distanza, reps: [j] })
  })
  return gruppi
}

// Dai tempi salvati di ogni gruppo (uno per gruppo) ai tempi in ordine di ripetizione
export function distribuisci(gruppi, perGruppo) {
  const fuori = []
  gruppi.forEach((g, k) => g.reps.forEach((j, p) => { if (perGruppo[k]?.[p]) fuori[j] = perGruppo[k][p] }))
  return Array.from(fuori, (x) => x || '')
}

// Dai tempi in ordine di ripetizione ai tempi di un solo gruppo (i vuoti in mezzo restano, quelli in fondo no)
export function raccogli(gruppo, tempi = []) {
  const l = gruppo.reps.map((j) => tempi[j] || '')
  while (l.length && !l[l.length - 1]) l.pop()
  return l
}
