// Tipi di lavoro: quelli di base (uguali per tutti) più quelli che ogni squadra aggiunge.
// Qui c'è solo la logica, senza database: la lettura sta in useTipiLavoro.js.
// peso = quanto stanca un metro (A2 = 1), gruppo = dove va la fatica, colore = una delle TINTE.

// Tinte tra cui scegliere (classi scritte per intero, così Tailwind le trova)
export const TINTE = {
  blu: 'bg-[#0b4fd9] text-white',
  giallo: 'bg-[#f2b705] text-[#0a1a2f]',
  arancio: 'bg-[#e8711a] text-[#0a1a2f]',
  rosso: 'bg-[#c42b20] text-white',
  viola: 'bg-[#6d28c9] text-white',
  fucsia: 'bg-[#c2309f] text-white',
  notte: 'bg-[#0a1a2f] text-white',
  cielo: 'bg-[#d9efff] text-[#0a3a5c]',
  menta: 'bg-[#c6f0dd] text-[#0a3a2a]',
  acqua: 'bg-[#0b7a84] text-white', // scurito per la leggibilità (contrasto 5:1)
  verde: 'bg-[#0f6b3f] text-white',
  ambra: 'bg-[#ffd99a] text-[#4a2a00]',
  bordeaux: 'bg-[#7a1730] text-white',
  rosa: 'bg-[#ffc2dc] text-[#5c0b30]',
}

export const GRUPPI_LAVORO = [
  ['recupero', 'Recupero e tecnica', 'Si nuota piano: scioglie, prepara o lavora sul gesto.', 'menta'],
  ['aerobico', 'Aerobico', 'Ritmo che si tiene a lungo, il fiato regge.', 'acqua'],
  ['soglia', 'Soglia', 'Ritmo forte e lungo: il fiato è al limite.', 'ambra'],
  ['lattacido', 'Lattacido', 'Molto faticoso: acido lattico da sopportare.', 'bordeaux'],
  ['velocita', 'Velocità', 'Scatti brevissimi al massimo, con tanto recupero.', 'rosa'],
]

const b = (sigla, gruppo, peso, colore, descrizione, soloCoach = false) => ({ sigla, gruppo, peso, colore, descrizione, soloCoach, origine: 'base' })
export const BASE = [
  b('Riscaldamento', 'recupero', 0.5, 'cielo', 'Per partire: si scaldano muscoli e fiato.', true),
  b('Tecnica', 'recupero', 0.7, 'cielo', 'Esercizi sul gesto, senza fretta.', true),
  b('Gambe', 'recupero', 0.9, 'cielo', 'Solo gambe, con o senza tavoletta.', true),
  b('Ipossia', 'recupero', 1.2, 'cielo', 'Respirazione ridotta: poche vasche ma il fiato si fa sentire.', true),
  b('Sciolto', 'recupero', 0.4, 'cielo', 'Nuotata tranquilla per recuperare.', true),
  b('Defaticamento', 'recupero', 0.4, 'cielo', 'A fine allenamento, per sciogliersi.', true),
  b('A2', 'aerobico', 1, 'blu', 'Ritmo che si tiene a lungo senza cedere.'),
  b('B1', 'aerobico', 1.6, 'giallo', 'Più ritmo, ma senza arrivare stremati.'),
  b('B2', 'soglia', 2.6, 'arancio', 'Distanze lunghe a ritmo forte: fiato al limite.'),
  b('C1', 'lattacido', 3.5, 'rosso', 'Acido lattico da sopportare (es. 8-12 × 75 o 100).'),
  b('C2', 'lattacido', 4.5, 'viola', 'Massimo sforzo su 50-100, ripetuto, con tanto recupero.'),
  b('C3', 'velocita', 3, 'fucsia', 'Massimo sforzo su 25-50: stanca, ma si recupera presto.'),
  ...[50, 100, 200, 400].map((m) => b(`Passo gara ${m}`, 'lattacido', 4, 'notte', `Ritmo della gara dei ${m} metri.`)),
]
const PER_SIGLA = new Map(BASE.map((t) => [t.sigla, t]))

// ---------- Lavori della squadra in uso (riempito da useTipiLavoro) ----------
let registro = { squadraId: null, extra: [], spunte: {} }
export function impostaRegistro(r) { registro = { squadraId: null, extra: [], spunte: {}, ...r } }

export const chiave = (s = '') => s.trim().toLowerCase()

// Tutto quello che si sa di un lavoro (base o aggiunto). null se sconosciuto.
export function infoLavoro(sigla = '') {
  return PER_SIGLA.get(sigla) || registro.extra.find((t) => t.sigla === sigla) || registro.extra.find((t) => chiave(t.sigla) === chiave(sigla)) || null
}

// Acceso per la squadra? Senza spunta salvata: base e della squadra sì, quelli generali aggiunti no.
export const attivoDi = (t, spunte = registro.spunte) => spunte[t.sigla] ?? t.origine !== 'generale'

// Elenco completo per una squadra, nell'ordine in cui si mostrano
export function elencoLavori(extra = registro.extra, spunte = registro.spunte) {
  return [...BASE, ...extra].map((t) => ({ ...t, attivo: attivoDi(t, spunte) }))
}

// Da scegliere nei menu: il coach li ha tutti, l'atleta non ha riscaldamento, tecnica…
// tieni: un lavoro già scelto resta nel menu anche se nel frattempo è stato spento
export function lavoriDaScegliere({ coach = false, tieni } = {}) {
  const l = elencoLavori().filter((t) => t.attivo && (coach || !t.soloCoach)).map((t) => t.sigla)
  return tieni && !l.includes(tieni) ? [...l, tieni] : l
}

// Posizione per ordinare (base prima, poi aggiunti; sconosciuti in fondo)
export function ordineLavoro(sigla) {
  const i = elencoLavori().findIndex((t) => t.sigla === sigla)
  return i < 0 ? 999 : i
}

// ---------- Intensità di un lavoro nuovo, a confronto con quelli che il coach conosce ----------
// Riferimenti dal più leggero al più duro (i lavori con lo stesso peso stanno insieme).
// Ipossia no: è un modo di respirare, non un'intensità con cui confrontarsi.
export const RIFERIMENTI = (() => {
  const r = []
  BASE.filter((t) => t.sigla !== 'Ipossia' && (!t.sigla.startsWith('Passo gara') || t.sigla === 'Passo gara 100'))
    .map((t) => (t.sigla.startsWith('Passo gara') ? { ...t, sigla: 'Passo gara' } : t))
    .sort((x, y) => x.peso - y.peso)
    .forEach((t) => {
      const ultimo = r[r.length - 1]
      if (ultimo && ultimo.peso === t.peso) ultimo.nome += ' / ' + t.sigla
      else r.push({ nome: t.sigla, peso: t.peso, gruppo: t.gruppo })
    })
  return r
})()

// Le voci di "Quanto stanca?": più leggero di…, come…, tra… e…, più duro di…
export const POSIZIONI = (() => {
  const p = [{ id: 'sotto', nome: `Più leggero di ${RIFERIMENTI[0].nome}`, peso: Math.round(RIFERIMENTI[0].peso * 75) / 100 }]
  RIFERIMENTI.forEach((r, i) => {
    p.push({ id: `come:${i}`, nome: `Come ${r.nome}`, peso: r.peso, gruppo: r.gruppo })
    const dopo = RIFERIMENTI[i + 1]
    if (dopo) p.push({ id: `tra:${i}`, nome: `Tra ${r.nome} e ${dopo.nome}`, peso: Math.round(((r.peso + dopo.peso) / 2) * 100) / 100 })
  })
  const ultimo = RIFERIMENTI[RIFERIMENTI.length - 1]
  p.push({ id: 'sopra', nome: `Più duro di ${ultimo.nome}`, peso: Math.round(ultimo.peso * 115) / 100 })
  return p
})()

// Che tipo di fatica, dedotto dal peso (il coach lo può cambiare)
export function gruppoDaPeso(peso) {
  if (peso < 0.95) return 'recupero'
  if (peso < 2.1) return 'aerobico'
  if (peso < 2.9) return 'soglia'
  if (peso < 3.25) return 'velocita'
  return 'lattacido'
}
export const gruppoDaPosizione = (id) => {
  const p = POSIZIONI.find((x) => x.id === id)
  return p ? p.gruppo || gruppoDaPeso(p.peso) : 'aerobico'
}
export const coloreDiGruppo = (g) => GRUPPI_LAVORO.find(([id]) => id === g)?.[3] || 'cielo'

// Posizione più vicina a un peso già salvato (per riaprire un lavoro in modifica)
export const posizioneDaPeso = (peso) =>
  POSIZIONI.reduce((m, p) => (Math.abs(p.peso - peso) < Math.abs(m.peso - peso) ? p : m), POSIZIONI[0]).id

// Difficoltà di un allenamento di 4 km tutto di questo lavoro (stessa regola di difficolta.js)
export const votoEsempio = (peso) => Math.min(10, Math.max(1, Math.round(4000 * peso / 100) / 10))

// Controlli prima di salvare un lavoro nuovo. Restituisce il messaggio d'errore o ''.
export function erroreNuovoLavoro(sigla, esistenti = []) {
  const s = sigla.trim()
  if (!s) return 'Scrivi la sigla del lavoro (es. A1).'
  if (s.length > 20) return 'La sigla è troppo lunga: al massimo 20 caratteri.'
  if ([...BASE, ...esistenti].some((t) => chiave(t.sigla) === chiave(s))) return `Esiste già un lavoro chiamato "${s}".`
  return ''
}
