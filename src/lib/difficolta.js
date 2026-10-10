// Difficoltà automatica di un allenamento, calcolata dal piano del coach.
// Ogni metro "pesa" in base alla zona di lavoro: A2 è il riferimento (1 punto al metro),
// le zone più intense costano di più. 5 km tutti in A2 = 5 su 10.

// Quanto stanca un metro in ogni zona (A2 = 1)
export const PESI = {
  Riscaldamento: 0.5, Sciolto: 0.4, Defaticamento: 0.4, Tecnica: 0.7, Gambe: 0.9,
  Ipossia: 1.2, // respirazione ridotta: poche vasche ma il fiato si fa sentire
  A2: 1,    // ritmo che si tiene a lungo senza cedere
  B1: 1.6,  // più ritmo, ma senza arrivare stremati
  B2: 2.6,  // fiato al limite su distanze lunghe
  C1: 3.5,  // acido lattico da sopportare
  C2: 4.5,  // massimo sforzo su 50-100 ripetuto
  C3: 3,    // massimo sforzo su 25-50: stanca, ma si recupera presto
}
const PESO_PASSO_GARA = 4

// Gruppi per la barra "dove è andata la fatica"
export const GRUPPI = [
  { id: 'recupero', nome: 'Recupero e tecnica', colore: 'bg-sky-300', tipi: ['Riscaldamento', 'Sciolto', 'Defaticamento', 'Tecnica', 'Gambe', 'Ipossia'] },
  { id: 'aerobico', nome: 'Aerobico', colore: 'bg-blue-500', tipi: ['A2', 'B1'] },
  { id: 'soglia', nome: 'Soglia', colore: 'bg-orange-400', tipi: ['B2'] },
  { id: 'lattacido', nome: 'Lattacido', colore: 'bg-red-500', tipi: ['C1', 'C2'] },
  { id: 'velocita', nome: 'Velocità', colore: 'bg-fuchsia-500', tipi: ['C3'] },
]
const gruppoDi = (tipo = '') =>
  tipo.startsWith('Passo gara') ? 'lattacido' : (GRUPPI.find((g) => g.tipi.includes(tipo))?.id ?? 'aerobico')

export const LIVELLI = [
  { fino: 3, nome: 'Leggero', colore: 'text-emerald-600 bg-emerald-50' },
  { fino: 5, nome: 'Moderato', colore: 'text-blue-600 bg-blue-50' },
  { fino: 7, nome: 'Impegnativo', colore: 'text-amber-700 bg-amber-50' },
  { fino: 8.5, nome: 'Duro', colore: 'text-orange-700 bg-orange-50' },
  { fino: Infinity, nome: 'Molto duro', colore: 'text-red-700 bg-red-50' },
]

export const pesoRiga = (r) => {
  const base = r.tipo_lavoro?.startsWith('Passo gara') ? PESO_PASSO_GARA : PESI[r.tipo_lavoro] ?? 1
  // "forte" nelle note di un lavoro tranquillo: ci sono tratti veloci dentro
  const forte = base <= PESI.B1 && /\bfort[ei]\b/i.test(r.note || '') ? 1.15 : 1
  return base * forte
}

// { voto: 1-10, livello, carico, metri, gruppi: [{ ...gruppo, carico, quota }] } oppure null se il piano è vuoto
export function difficoltaPiano(righe = []) {
  let metri = 0
  let carico = 0
  const perGruppo = {}
  righe.forEach((r) => {
    const m = (Number(r.distanza) || 0) * (Number(r.ripetizioni) || 1)
    const c = m * pesoRiga(r)
    metri += m
    carico += c
    const g = gruppoDi(r.tipo_lavoro)
    perGruppo[g] = (perGruppo[g] || 0) + c
  })
  if (!carico) return null
  const voto = Math.min(10, Math.max(1, Math.round(carico / 100) / 10))
  return {
    voto,
    livello: LIVELLI.find((l) => voto <= l.fino),
    carico: Math.round(carico),
    metri,
    gruppi: GRUPPI.map((g) => ({ ...g, carico: Math.round(perGruppo[g.id] || 0), quota: (perGruppo[g.id] || 0) / carico }))
      .filter((g) => g.carico > 0),
  }
}

export const formattaVoto = (v) => v.toFixed(1).replace('.', ',')
