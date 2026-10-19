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

// Le ripetizioni della riga raggruppate per stile reale, nell'ordine in cui compaiono:
// [{ stile, reps: [posizioni] }]. Ogni gruppo si salva come un lavoro a sé, così il tempo finisce
// nella categoria del suo stile (progressi, record, previsioni). Senza varianti c'è un solo gruppo.
export function gruppiPerStile(r) {
  const gruppi = []
  ripetizioniDiRiga(r).forEach((v, j) => {
    const g = gruppi.find((x) => x.stile === v.stile)
    if (g) g.reps.push(j)
    else gruppi.push({ stile: v.stile, reps: [j] })
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
