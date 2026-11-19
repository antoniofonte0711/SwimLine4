// Scala in metri: da un punto del video (pixel) alla distanza dalla parete lungo la corsia (metri).
//
// L'utente tocca punti della vasca di cui conosce la distanza dalla parete (cambi di colore dei galleggianti,
// linee, pareti...) e dice su quale lato della corsia stanno (lato 0 / lato 1 = le due file di galleggianti).
// Il telefono riprende in prospettiva: un metro lontano occupa meno pixel di uno vicino, quindi una sola
// "scala pixel→metri" sbaglia. Si usano, in ordine di precisione:
//   1. 'piano'      ≥4 punti su ENTRAMBI i lati (≥2 per lato): prospettiva completa della superficie dell'acqua.
//                   La larghezza vera della corsia non serve: non cambia le distanze lungo la corsia.
//   2. 'linea'      ≥3 punti su UN lato: prospettiva esatta lungo quella fila di galleggianti; il nuotatore
//                   viene riportato sulla fila (approssimazione, per questo affidabilità al massimo "media").
//   3. 'due-punti'  2 punti: scala lineare, sbaglia con la prospettiva. Ultima spiaggia, affidabilità "bassa".
// Più punti di quelli minimi = il sistema controlla i tocchi e scarta da solo quelli che non tornano.

export const LARGHEZZA_CORSIA = 2.5 // m: solo per disegnare, non entra nelle distanze

// Distanze dei riferimenti standard dalla parete (cambi di colore dei galleggianti da gara)
export function riferimentiVasca(lunghezza) {
  if (lunghezza === 50) return [0, 5, 15, 25, 35, 45, 50]
  if (lunghezza === 25) return [0, 5, 10, 15, 20, 25]
  return [0, lunghezza]
}

// ---------- algebra piccola ----------

// Sistema lineare quadrato con eliminazione di Gauss e pivot parziale. null se singolare.
function risolvi(A, b) {
  const n = b.length
  const M = A.map((riga, i) => [...riga, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    if (Math.abs(M[p][c]) < 1e-12) return null
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  const x = new Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n]
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]
    x[r] = s / M[r][r]
  }
  return x.every(Number.isFinite) ? x : null
}

// Minimi quadrati: righe A (m×n), termini b → equazioni normali
function minimiQuadrati(righe, b) {
  const n = righe[0].length
  const AtA = Array.from({ length: n }, () => new Array(n).fill(0))
  const Atb = new Array(n).fill(0)
  righe.forEach((r, i) => {
    for (let j = 0; j < n; j++) {
      Atb[j] += r[j] * b[i]
      for (let k = 0; k < n; k++) AtA[j][k] += r[j] * r[k]
    }
  })
  return risolvi(AtA, Atb)
}

const moltiplica = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)))

function inversa3(m) {
  const [[a, b, c], [d, e, f], [g, h, i]] = m
  const A = e * i - f * h
  const B = -(d * i - f * g)
  const C = d * h - e * g
  const det = a * A + b * B + c * C
  if (Math.abs(det) < 1e-15) return null
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ]
}

// Normalizzazione di Hartley: centro nell'origine, distanza media √2 (conti stabili)
function normalizzazione(pts) {
  const n = pts.length
  const cx = pts.reduce((s, p) => s + p[0], 0) / n
  const cy = pts.reduce((s, p) => s + p[1], 0) / n
  const md = pts.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / n || 1
  const k = Math.SQRT2 / md
  return [[k, 0, -k * cx], [0, k, -k * cy], [0, 0, 1]]
}
const applica = (H, x, y) => {
  const w = H[2][0] * x + H[2][1] * y + H[2][2]
  return [(H[0][0] * x + H[0][1] * y + H[0][2]) / w, (H[1][0] * x + H[1][1] * y + H[1][2]) / w, w]
}

// ---------- i tre modelli ----------
// Ognuno: stima(punti) → modello | null;  modello.metri(x, y) → d;  modello.pixel(d, y) → {x, y} | null

function stimaPiano(punti) {
  const img = punti.map((p) => [p.x, p.y])
  const mondo = punti.map((p) => [p.d, p.lato ? LARGHEZZA_CORSIA : 0])
  const Ti = normalizzazione(img)
  const Tm = normalizzazione(mondo)
  const righe = []
  const b = []
  punti.forEach((_, i) => {
    const [x, y] = applica(Ti, img[i][0], img[i][1])
    const [X, Y] = applica(Tm, mondo[i][0], mondo[i][1])
    righe.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X)
    righe.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y)
  })
  const h = minimiQuadrati(righe, b)
  if (!h) return null
  const Hn = [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]]
  const TmInv = inversa3(Tm)
  if (!TmInv) return null
  const H = moltiplica(moltiplica(TmInv, Hn), Ti) // immagine → vasca
  const Hinv = inversa3(H) // vasca → immagine
  if (!Hinv) return null
  // tutti i punti devono stare dalla stessa parte dell'orizzonte, sennò il modello è assurdo
  const segni = punti.map((p) => Math.sign(applica(H, p.x, p.y)[2]))
  if (segni.some((s) => s !== segni[0])) return null
  const segno = segni[0]
  return {
    metodo: 'piano',
    metri: (x, y) => {
      const [d, , w] = applica(H, x, y)
      return Math.sign(w) === segno ? d : NaN
    },
    // y = metri di traverso nella corsia (0 = lato 0, LARGHEZZA_CORSIA = lato 1)
    pixel: (d, y = 0) => {
      const [px, py, w] = applica(Hinv, d, y)
      // il punto deve finire davanti alla telecamera (stesso lato dell'orizzonte dei punti toccati)
      const [, , wBack] = applica(H, px, py)
      if (!Number.isFinite(px) || Math.sign(wBack) !== segno || Math.abs(w) < 1e-9) return null
      return { x: px, y: py }
    },
  }
}

// Retta che passa meglio tra i punti (direzione principale): origine c, direzione u
function retta(punti) {
  const n = punti.length
  const cx = punti.reduce((s, p) => s + p.x, 0) / n
  const cy = punti.reduce((s, p) => s + p.y, 0) / n
  let sxx = 0, sxy = 0, syy = 0
  punti.forEach((p) => {
    const dx = p.x - cx, dy = p.y - cy
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy
  })
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  return { cx, cy, ux: Math.cos(ang), uy: Math.sin(ang) }
}

function stimaLinea(punti, lineare = false) {
  const r = retta(punti)
  const sGrezzo = (x, y) => (x - r.cx) * r.ux + (y - r.cy) * r.uy
  const ss = punti.map((p) => sGrezzo(p.x, p.y))
  const scala = Math.sqrt(ss.reduce((a, s) => a + s * s, 0) / ss.length) || 1
  const sn = ss.map((s) => s / scala)
  let f, inv
  if (lineare) {
    // d = a·s + b
    const k = minimiQuadrati(sn.map((s) => [s, 1]), punti.map((p) => p.d))
    if (!k || Math.abs(k[0]) < 1e-12) return null
    f = (s) => k[0] * s + k[1]
    inv = (d) => (d - k[1]) / k[0]
  } else {
    // prospettiva lungo una retta: d = (a·s + b) / (c·s + 1)
    const k = minimiQuadrati(sn.map((s, i) => [s, 1, -s * punti[i].d]), punti.map((p) => p.d))
    if (!k) return null
    const [a, b, c] = k
    // il denominatore non deve passare per zero tra i punti (sarebbe l'orizzonte in mezzo alla vasca)
    const den = sn.map((s) => c * s + 1)
    if (den.some((v) => Math.sign(v) !== Math.sign(den[0]) || Math.abs(v) < 1e-6)) return null
    const segno = Math.sign(den[0])
    f = (s) => (Math.sign(c * s + 1) === segno ? (a * s + b) / (c * s + 1) : NaN)
    inv = (d) => {
      const q = d * c - a
      if (Math.abs(q) < 1e-12) return NaN
      const s = (b - d) / q
      return Math.sign(c * s + 1) === segno ? s : NaN
    }
  }
  return {
    metodo: lineare ? 'due-punti' : 'linea',
    retta: r,
    metri: (x, y) => f(sGrezzo(x, y) / scala),
    pixel: (d) => {
      const s = inv(d) * scala
      return Number.isFinite(s) ? { x: r.cx + r.ux * s, y: r.cy + r.uy * s } : null
    },
  }
}

// ---------- scelta robusta (prova i sottoinsiemi minimi, tiene il modello con più punti d'accordo) ----------

function combinazioni(n, k, max = 3000) {
  const out = []
  const idx = Array.from({ length: k }, (_, i) => i)
  while (out.length < max) {
    out.push([...idx])
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) break
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
  return out
}

function robusto(punti, minimo, stima, valido) {
  const ds = punti.map((p) => p.d)
  const soglia = Math.max(0.3, 0.025 * (Math.max(...ds) - Math.min(...ds)))
  let migliore = null
  for (const comb of combinazioni(punti.length, minimo)) {
    const sotto = comb.map((i) => punti[i])
    if (valido && !valido(sotto)) continue
    const m = stima(sotto)
    if (!m) continue
    const err = punti.map((p) => Math.abs(m.metri(p.x, p.y) - p.d))
    const dentro = err.map((e, i) => (Number.isFinite(e) && e < soglia ? i : -1)).filter((i) => i >= 0)
    const somma = dentro.reduce((s, i) => s + err[i], 0)
    if (!migliore || dentro.length > migliore.dentro.length || (dentro.length === migliore.dentro.length && somma < migliore.somma)) {
      migliore = { dentro, somma }
    }
  }
  if (!migliore || migliore.dentro.length < minimo) return null
  const buoni = migliore.dentro.map((i) => punti[i])
  if (valido && !valido(buoni)) return null
  const m = stima(buoni)
  if (!m) return null
  const errori = punti.map((p) => m.metri(p.x, p.y) - p.d)
  // dopo il ricalcolo un punto scartato potrebbe tornare d'accordo (o viceversa): si ricontrolla
  const scarti = punti.map((_, i) => i).filter((i) => !(Math.abs(errori[i]) < soglia))
  return { modello: m, errori, scarti }
}

const dueDistanze = (pp) => new Set(pp.map((p) => p.d)).size >= 2
const pianoValido = (pp) => {
  const l0 = pp.filter((p) => !p.lato)
  const l1 = pp.filter((p) => p.lato)
  return l0.length >= 2 && l1.length >= 2 && dueDistanze(l0) && dueDistanze(l1)
}

const NOMI = {
  piano: 'Prospettiva completa (due lati della corsia)',
  linea: 'Prospettiva lungo una fila di galleggianti',
  'due-punti': 'Due punti (scala semplice)',
}
export const nomeMetodo = (m) => NOMI[m] || m

// punti: [{ x, y, d, lato }] con x, y in pixel del video, d in metri dalla parete, lato 0 | 1
export function calibra(punti) {
  const validi = (punti || []).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.d))
  if (validi.length < 2) return { ok: false, errore: 'Servono almeno 2 punti (meglio 3 o più).' }
  if (!dueDistanze(validi)) return { ok: false, errore: 'I punti hanno tutti la stessa distanza: servono distanze diverse.' }

  const avvisi = []
  let ris = null
  let minimo = 0

  // 1. piano: entrambi i lati
  if (validi.length >= 4 && pianoValido(validi)) {
    ris = robusto(validi, 4, stimaPiano, pianoValido)
    minimo = 4
  }
  // 2. linea: il lato con più punti
  if (!ris) {
    const l0 = validi.filter((p) => !p.lato)
    const l1 = validi.filter((p) => p.lato)
    const lato = l0.length >= l1.length ? l0 : l1
    if (lato.length >= 3 && dueDistanze(lato)) {
      ris = robusto(lato, 3, (pp) => stimaLinea(pp), dueDistanze)
      minimo = 3
      if (ris) {
        ris = remap(ris, validi, lato)
        avvisi.push('Tocca anche i galleggianti dell\'altro lato della corsia (almeno 2): la misura diventa più precisa.')
      }
    }
    // 3. due punti (o più, ma tutti sulla stessa retta senza abbastanza per la prospettiva)
    if (!ris && lato.length >= 2 && dueDistanze(lato)) {
      ris = robusto(lato, 2, (pp) => stimaLinea(pp, true), dueDistanze)
      minimo = 2
      if (ris) {
        ris = remap(ris, validi, lato)
        avvisi.push('Con 2 punti la prospettiva non si può correggere: le velocità lontano dai punti possono sbagliare molto. Aggiungi almeno un terzo punto.')
      }
    }
  }
  if (!ris) return { ok: false, errore: 'Con questi punti non si riesce a calcolare la scala. Controlla le distanze e prova ad aggiungere punti.' }

  ris.scarti.forEach((i) => avvisi.unshift(`Il punto ${i + 1} non torna con gli altri: non lo uso. Controlla dove l'hai messo e la distanza.`))
  // punti davvero usati: con un errore calcolato (non quelli dell'altro lato ignorati) e non scartati
  const usatiIdx = ris.errori.map((e, i) => (e !== null && !ris.scarti.includes(i) ? i : -1)).filter((i) => i >= 0)
  const buoni = usatiIdx.map((i) => ris.errori[i])
  const rms = Math.sqrt(buoni.reduce((s, e) => s + e * e, 0) / (buoni.length || 1))
  const ridondanza = usatiIdx.length - minimo

  let affidabilita
  const metodo = ris.modello.metodo
  if (metodo === 'due-punti') affidabilita = 'bassa'
  else if (ridondanza < 1) {
    affidabilita = 'media'
    avvisi.push('Aggiungi almeno un punto in più: così il sistema controlla se un tocco è sbagliato.')
  } else affidabilita = rms < 0.15 ? 'alta' : rms < 0.4 ? 'media' : 'bassa'
  if (metodo === 'linea' && affidabilita === 'alta') affidabilita = 'media'

  const ds = usatiIdx.map((i) => validi[i].d)
  return {
    ok: true,
    metodo,
    affidabilita,
    rms: ridondanza >= 1 ? rms : null, // senza punti in più l'errore è zero per forza: non dice niente
    errori: ris.errori,
    scarti: ris.scarti,
    avvisi,
    intervallo: [Math.min(...ds), Math.max(...ds)], // fuori da qui la misura è un'estrapolazione
    metri: ris.modello.metri,
    pixel: ris.modello.pixel,
  }
}

// Riporta errori e scarti calcolati su un sottoinsieme (un solo lato) agli indici di tutti i punti.
// I punti dell'altro lato non usati non sono "sbagliati": errore = null e non vengono scartati.
function remap(ris, tutti, sotto) {
  const errori = tutti.map((p) => {
    const j = sotto.indexOf(p)
    return j >= 0 ? ris.errori[j] : null
  })
  const scarti = ris.scarti.map((j) => tutti.indexOf(sotto[j]))
  return { modello: ris.modello, errori, scarti }
}
