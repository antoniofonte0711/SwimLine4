// Dove si trova il nuotatore nella vasca, capito dal video (senza che il coach tocchi niente).
//
// Segnale usato: le ZONE DI FINE VASCA. Negli ultimi 5 m prima di ogni parete i galleggianti hanno un colore
// (o un disegno) diverso da quello del centro vasca: è la regola delle corsie da gara. Nella vasca di
// allenamento di Stefano, per esempio, il centro è bianco con un tratto rosso ogni ~2 m e gli ultimi 5 m sono
// blu e bianchi. Il motore raccoglie i colori dei galleggianti lungo la corsia (in "dischetti", la sua unità):
//  - un cambio di zona = il disegno cambia in modo stabile (finestre lunghe ~2 m, più del tratto che si ripete
//    al centro, così i tratti rossi ogni 2 m non contano come cambi);
//  - due cambi visti = 15 m tra l'uno e l'altro (vasca da 25) → metri di un dischetto esatti;
//  - anche un solo cambio dice il punto della vasca: lì il nuotatore è a 5 m da una parete.
// Senza cambi si usano i metri di un dischetto misurati in un video precedente della stessa vasca (i
// galleggianti sono sempre quelli) oppure, in mancanza, una stima (0,15 m: misurata sulla vasca di Stefano).
import { N_CLASSI } from './immagine'

export const MPP_STIMA = 0.15 // m per dischetto, misurato il 21/11/2026 sul video WhatsApp 19.01.32 (10 m noti)
const W = 30 // mezzi dischetti per finestra (15 dischetti ≈ 2,2 m)
const MIN_FIN = 18 // mezzi dischetti validi minimi in una finestra (ai bordi dei dati la finestra si accorcia)
const SOGLIA = 0.4 // differenza minima tra i due disegni (0 = uguali, 1 = niente in comune)
const ZONA = 5 // m: lunghezza della zona di fine vasca
const SOGLIA_ZONA = 0.25 // differenza minima tra il disegno della zona e quello medio del centro vasca
// metri per dischetto credibili (galleggianti da corsia: dischi di 10–20 cm)
const MPP_MIN = 0.07, MPP_MAX = 0.25

// Colori medi tra due posizioni u (in dischetti)
export function mediaTratto(voti, uA, uB) {
  const lo = Math.min(uA, uB), hi = Math.max(uA, uB)
  const m = new Array(N_CLASSI).fill(0)
  let k = 0
  for (const [key, v] of voti) {
    const u = key / 2
    if (u < lo || u > hi) continue
    const tot = v.reduce((s, x) => s + x, 0)
    if (tot < 3) continue
    for (let c = 0; c < N_CLASSI; c++) m[c] += v[c] / tot
    k++
  }
  return k >= MIN_FIN ? m.map((x) => x / k) : null
}

// frazioni di colore per mezzo dischetto: { da, frazioni[] } (null dove i dati non bastano)
function frazioniDa(voti) {
  const chiavi = [...voti.keys()].sort((a, b) => a - b)
  const da = chiavi[0]
  const n = chiavi[chiavi.length - 1] - da + 1
  const frazioni = new Array(n).fill(null)
  for (const [k, v] of voti) {
    const tot = v.reduce((s, x) => s + x, 0)
    if (tot >= 3) frazioni[k - da] = Array.from(v, (x) => x / tot)
  }
  return { da, frazioni }
}

function mediaFinestra(frazioni, i0, i1) {
  const m = new Array(N_CLASSI).fill(0)
  let k = 0
  for (let i = Math.max(0, i0); i <= Math.min(frazioni.length - 1, i1); i++) {
    if (!frazioni[i]) continue
    for (let c = 0; c < N_CLASSI; c++) m[c] += frazioni[i][c]
    k++
  }
  return k >= MIN_FIN ? m.map((x) => x / k) : null
}

function mediaFinestraCorta(frazioni, i0, i1) {
  const m = new Array(N_CLASSI).fill(0)
  let k = 0
  for (let i = Math.max(0, i0); i <= Math.min(frazioni.length - 1, i1); i++) {
    if (!frazioni[i]) continue
    for (let c = 0; c < N_CLASSI; c++) m[c] += frazioni[i][c]
    k++
  }
  return k >= 3 ? m.map((x) => x / k) : null
}

const differenza = (p, q) => { let s = 0; for (let c = 0; c < N_CLASSI; c++) s += Math.abs(p[c] - q[c]); return s / 2 }

// Cambi di zona lungo la corsia. Ritorna [{ u, forza, prima, dopo }] (u in dischetti, prima/dopo = colori
// medi dalla parte delle u minori e maggiori), in ordine di u.
export function cambiDiZona(voti) {
  if (!voti || voti.size < MIN_FIN * 2) return []
  const { da, frazioni } = frazioniDa(voti)
  const n = frazioni.length
  const dist = new Array(n).fill(0)
  const lati = new Array(n).fill(null)
  for (let i = 1; i < n; i++) {
    const p = mediaFinestra(frazioni, i - W, i - 1), q = mediaFinestra(frazioni, i, i + W - 1)
    if (!p || !q) continue
    dist[i] = differenza(p, q)
    lati[i] = [p, q]
  }
  const cambi = []
  for (let i = 1; i < n; i++) {
    if (dist[i] < SOGLIA) continue
    // massimo nel suo intorno (un cambio vero dà un picco largo quanto la finestra)
    let massimo = true
    for (let j = Math.max(0, i - W); j <= Math.min(n - 1, i + W); j++) if (dist[j] > dist[i] || (dist[j] === dist[i] && j < i)) { massimo = false; break }
    if (!massimo) continue
    // Confine preciso: le finestre lunghe trovano il cambio ma lo spostano (un tratto rosso subito dopo la
    // zona blu "tira" il picco). Qui ogni mezzo dischetto vota per il disegno a cui somiglia di più (prima o
    // dopo) e si sceglie il punto di taglio che mette d'accordo più voti.
    const [p, q] = lati[i]
    // voti su colori mediati su ~4 dischetti: un tratto colorato isolato del centro vasca (rosso o blu, ~0,5 m)
    // vicino al confine non deve spostarlo (finiva dentro la zona e anticipava il cambio di 1–2 m)
    const voto = new Array(n).fill(null)
    for (let j = Math.max(0, i - W * 2); j < Math.min(n, i + W * 2); j++) {
      const f = mediaFinestraCorta(frazioni, j - 4, j + 4)
      if (f) voto[j] = differenza(f, q) - differenza(f, p) // > 0: somiglia a "prima"
    }
    let migliore = i, punti = -Infinity
    for (let s = Math.max(1, i - W); s <= Math.min(n - 1, i + W); s++) {
      let tot = 0
      for (let j = Math.max(0, i - W * 1.5); j < Math.min(n, i + W * 1.5); j++) {
        if (voto[j] === null) continue
        tot += j < s ? voto[j] : -voto[j]
      }
      if (tot > punti) { punti = tot; migliore = s }
    }
    cambi.push({ u: (migliore + da) / 2, forza: dist[i], prima: p, dopo: q })
  }
  return cambi
}

// Confine preciso della zona: dentro la zona il suo colore (es. blu in blu/bianco, rosso in una zona tutta
// rossa) non manca mai per più di un paio di mezzi dischetti di fila. Partendo da dentro la zona e andando
// verso il centro, il confine è dove compaiono 4 mezzi dischetti di fila senza quel colore. Un tratto colorato
// isolato del centro vasca, separato dalla zona da un pezzo bianco, resta così fuori (prima spostava il
// confine di 1–2 m).
function confineZona(voti, u, latoZona, colori) {
  let Z = 0
  for (let c = 1; c < 4; c++) if (colori[c] > colori[Z]) Z = c // colore della zona (rosso, giallo, verde, blu)
  if (colori[Z] < 0.2) return u
  const prevalente = (k) => {
    const v = voti.get(k)
    if (!v) return null
    let b = 0
    for (let c = 1; c < 5; c++) if (v[c] > v[b]) b = c
    return v[b] >= 3 ? b : null
  }
  const chiavi = [...voti.keys()]
  const kMin = Math.min(...chiavi), kMax = Math.max(...chiavi)
  const k0 = Math.round(u * 2)
  // si parte da ~1,5 m dentro la zona (o dalla fine dei dati) e si va verso il centro
  let k = latoZona < 0 ? Math.max(kMin, k0 - 2 * W) : Math.min(kMax, k0 + 2 * W)
  const passo = -latoZona, limite = k0 + passo * 2 * W
  let corsa = 0, ultimoZ = null
  for (; passo > 0 ? k <= Math.min(kMax, limite) : k >= Math.max(kMin, limite); k += passo) {
    const c = prevalente(k)
    if (c === null) continue
    if (c === Z) { corsa = 0; ultimoZ = k; continue }
    if (++corsa >= 4 && ultimoZ !== null) return (ultimoZ + passo * 0.5) / 2
  }
  return u
}

// Quanti dischetti di dati ci sono da una parte del cambio (per capire quale lato è la zona da 5 m)
function estensione(voti, u, verso) {
  let n = 0
  for (const k of voti.keys()) if ((k / 2 - u) * verso > 0) n++
  return n / 2
}

// Posizione nella vasca e metri per dischetto.
// campioni: quelli del motore; voti: per catena; vasca: 25 | 50; mppNoto: metri per dischetto di questa vasca
// misurati in un video precedente (o null).
// Ritorna { mpp, fonte: 'zone'|'vasca-nota'|'stima', qualita, catena, cambi, ancora } dove
// ancora = { u, d, verso } → distanza dalla parete di partenza: d + (u' − u) · verso · mpp (null se non si sa).
export function posizioneInVasca({ campioni, voti, vasca = 25, mppNoto = null }) {
  // catena con più campioni seguiti
  const conti = new Map()
  for (const c of campioni) if (c.u !== null && c.u !== undefined) conti.set(c.catena, (conti.get(c.catena) || 0) + 1)
  let catena = null
  for (const [k, v] of conti) if (catena === null || v > conti.get(catena)) catena = k
  const v = catena === null ? null : voti?.[catena]
  const cambi = v ? cambiDiZona(v) : []

  // verso del nuoto nella coordinata u
  const us = campioni.filter((c) => c.catena === catena && c.u !== null && c.u !== undefined).map((c) => c.u)
  const verso = us.length > 1 && Math.abs(us[us.length - 1] - us[0]) > 3 ? Math.sign(us[us.length - 1] - us[0]) : 0

  // Da che parte di ogni cambio sta la zona da 5 m? Il lato con più di 6 m di dati non può essere una zona
  // (è il centro vasca); con due cambi le zone sono fuori, verso le pareti. Poi il controllo decisivo: il
  // disegno della zona deve essere diverso da quello del CENTRO VASCA (media del tratto tra questo cambio e il
  // successivo: con la media di tutti i dati, in un video di una vasca intera le zone pesavano quasi metà e le
  // zone vere venivano scartate), non solo dal pezzo accanto. Nella vasca di Stefano al centro ogni tanto c'è un tratto blu al posto
  // di quello rosso: per le finestre è un "cambio", ma il suo lato ha i colori del centro → scartato.
  const mppPrima = mppNoto || MPP_STIMA
  const uDati = v ? [...v.keys()].map((k) => k / 2) : []
  const uMin = Math.min(...uDati), uMax = Math.max(...uDati)
  const zone = []
  for (const c of cambi) {
    const sotto = estensione(v, c.u, -1) * mppPrima, sopra = estensione(v, c.u, 1) * mppPrima
    let latoZona = 0
    if (sopra > ZONA + 1 && sotto <= ZONA + 1) latoZona = -1
    else if (sotto > ZONA + 1 && sopra <= ZONA + 1) latoZona = 1
    else if (cambi.length >= 2) latoZona = c === cambi[0] ? -1 : c === cambi[cambi.length - 1] ? 1 : 0
    if (!latoZona) continue
    const colori = latoZona < 0 ? c.prima : c.dopo
    // centro vasca = dall'altra parte del cambio, fino al cambio successivo (o alla fine dei dati)
    const altri = cambi.filter((o) => o !== c && (o.u - c.u) * -latoZona > 0).map((o) => o.u)
    const fine = altri.length ? (latoZona < 0 ? Math.min(...altri) : Math.max(...altri)) : latoZona < 0 ? uMax : uMin
    const centro = mediaTratto(v, c.u - latoZona * 2, fine + latoZona * 2)
    if (!centro || differenza(colori, centro) < SOGLIA_ZONA) continue
    zone.push({ ...c, u: confineZona(v, c.u, latoZona, colori), latoZona })
  }

  let mpp = null, fonte = null, qualita = null
  // due zone, una per parte (verso le due pareti): 15 m tra i due cambi (vasca da 25)
  const zMin = zone.find((z) => z.latoZona < 0), zMax = [...zone].reverse().find((z) => z.latoZona > 0)
  if (zMin && zMax && zMax.u > zMin.u && vasca === 25) {
    const m = (vasca - 2 * ZONA) / (zMax.u - zMin.u)
    if (m > MPP_MIN && m < MPP_MAX) { mpp = m; fonte = 'zone'; qualita = 'alta' }
  }
  if (!mpp && mppNoto) { mpp = mppNoto; fonte = 'vasca-nota'; qualita = 'media' }
  if (!mpp) { mpp = MPP_STIMA; fonte = 'stima'; qualita = 'media' }

  // punto della vasca. Zona davanti al nuotatore = sta arrivando alla parete (cambio a vasca−5 m dalla
  // parete di partenza); zona dietro = è appena partito (cambio a 5 m).
  let ancora = null
  if (verso && zone.length) {
    const z = zone[0]
    ancora = { u: z.u, d: z.latoZona === verso ? vasca - ZONA : ZONA, verso }
  }
  // controllo: tutto il tratto nuotato deve stare dentro la vasca, sennò il punto è sbagliato
  if (ancora && us.length) {
    const dist = (u) => ancora.d + (u - ancora.u) * ancora.verso * mpp
    const lo = Math.min(dist(us[0]), dist(us[us.length - 1])), hi = Math.max(dist(us[0]), dist(us[us.length - 1]))
    if (lo < -1.5 || hi > vasca + 1.5) ancora = null
  }
  return { mpp, fonte, qualita, catena, cambi: zone, ancora }
}

// Distanza dalla parete di partenza (m) per la coordinata u, o null
export function metroInVasca(pos, u) {
  if (!pos?.ancora || u === null || u === undefined) return null
  return pos.ancora.d + (u - pos.ancora.u) * pos.ancora.verso * pos.mpp
}
