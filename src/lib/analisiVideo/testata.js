// Ripresa dalla TESTATA della vasca (camera sul bordo, la corsia va "dentro" l'immagine verso il fondo).
//
// Qui il nuotatore non si sposta di lato: viene verso la camera o se ne allontana, e la prospettiva comprime
// i metri lontani in pochi pixel. Come si misura:
//  1. Le due corde della corsia sono rette nell'immagine che convergono in un punto di fuga (riga yv).
//  2. Lungo la corsia la distanza dalla parete della camera dipende solo dalla riga y (camera non inclinata
//     di lato): d(y) = A / (y − yv) + B (proiezione di una retta: un punto all'infinito, la riga yv).
//  3. A e B si ricavano dai riferimenti che ogni vasca da gara ha: i galleggianti cambiano colore a 5 m
//     dalle pareti (vicino alla camera e in fondo, a vasca − 5 m). Due riferimenti bastano; se c'è anche il
//     secondo cambio la misura si controlla da sola.
//  4. Il nuotatore si segue come "ciò che non è sfondo" dentro la corsia (sfondo = mediana di molti
//     fotogrammi): funziona sopra e sotto l'acqua, dove diventa una sagoma scura, e durante la virata.

// ---------- pixel delle corde ----------
// Dischetti rossi o blu scuro, misurati sul video della vasca di Stefano (21/11/2026):
//  - rosso (sfocato diventa rosato): (216,128,125)…(235,148,145)  → r molto più alto di g e b
//  - blu scuro: (27,62,102)…(55,82,102)                           → scuro, b > r, ma r non quasi zero
//  - linea nera sul fondo (DA ESCLUDERE): (7,62,96)…(15,84,125)  → r quasi zero
//  - acqua: (91,152,173)…(117,179,193)                            → b − g piccolo
export function ePixelCorda(r, g, b) {
  if (r > 130 && r - g > 35 && r - b > 30) return 1 // rosso
  if (r + g + b < 330 && b > r + 25 && r >= 22) return 2 // blu scuro (molto più scuro dell'acqua, r non quasi zero)
  return 0
}

export function mappaCorde(img) {
  const { w, h, data } = img
  const out = new Uint8Array(w * h)
  for (let p = 0, i = 0; p < out.length; p++, i += 4) out[p] = ePixelCorda(data[i], data[i + 1], data[i + 2])
  return out
}

// ---------- rette (x = p + q·y) con la trasformata di Hough ----------
const Q_MIN = -2.5, Q_MAX = 2.5, N_Q = 201

// Ritorna le rette più votate: [{ p, q, voti }] (p = x alla riga 0)
export function retteCorde(mappa, w, h, { max = 8 } = {}) {
  const nP = w * 4 // x a metà altezza da −1,5w a +2,5w, passo 1 px
  const off = Math.round(w * 1.5)
  const acc = new Uint32Array(N_Q * nP)
  const ym = h / 2
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x++) {
      if (!mappa[y * w + x]) continue
      for (let k = 0; k < N_Q; k++) {
        const q = Q_MIN + (k * (Q_MAX - Q_MIN)) / (N_Q - 1)
        const xm = Math.round(x - q * (ym - y)) + off // x della retta a metà altezza (x = p − q·y)
        if (xm >= 0 && xm < nP) acc[k * nP + xm]++
      }
    }
  }
  // massimi locali, poi soppressione dei vicini
  const picchi = []
  for (let k = 0; k < N_Q; k++) {
    for (let j = 0; j < nP; j++) {
      const v = acc[k * nP + j]
      if (v < h * 0.08) continue
      picchi.push({ k, j, v })
    }
  }
  picchi.sort((a, b) => b.v - a.v)
  const scelte = []
  for (const c of picchi) {
    if (scelte.length >= max) break
    const q = Q_MIN + (c.k * (Q_MAX - Q_MIN)) / (N_Q - 1)
    const xm = c.j - off
    // stessa retta di una già scelta se a metà e in cima/fondo passa vicino
    const doppia = scelte.some((s) => {
      const dm = Math.abs(s.xm - xm)
      const d0 = Math.abs((s.xm + s.q * ym) - (xm + q * ym))
      const d1 = Math.abs((s.xm - s.q * (h - ym)) - (xm - q * (h - ym)))
      return Math.min(dm, d0, d1) < w * 0.04 && Math.max(dm, d0, d1) < w * 0.12
    })
    if (doppia) continue
    scelte.push({ xm, q, voti: c.v })
  }
  return scelte.map((s) => ({ p: s.xm + s.q * ym, q: s.q, voti: s.voti }))
}

export const xRetta = (l, y) => l.p - l.q * y

// Le due corde della corsia del nuotatore: per ogni lato, la retta PIÙ VOTATA tra quelle che passano da
// quella parte del punto (x alla riga del punto). Prendere la più vicina sceglieva i "doppioni" storti che
// la corda vicina alla camera (larga, in prospettiva) genera accanto a sé.
export function cordeCorsia(rette, punto, w) {
  let sx = null, dx = null
  for (const l of rette) {
    const x = xRetta(l, punto.y)
    if (x < punto.x && x > punto.x - w * 0.8 && (!sx || l.voti > sx.voti)) sx = l
    if (x > punto.x && x < punto.x + w * 0.8 && (!dx || l.voti > dx.voti)) dx = l
  }
  return { sx, dx }
}

// Punto di fuga: incrocio delle due corde (riga yv, colonna xv)
export function puntoDiFuga(sx, dx) {
  // p1 − q1 y = p2 − q2 y → y = (p1 − p2) / (q1 − q2)
  if (!sx || !dx || Math.abs(sx.q - dx.q) < 1e-6) return null
  const y = (sx.p - dx.p) / (sx.q - dx.q)
  return { x: xRetta(sx, y), y }
}

// Colori lungo una corda, riga per riga: { y, rosso, blu } contando i pixel di corda vicini alla retta
export function coloriLungoCorda(mappa, w, h, l, { semi = 3 } = {}) {
  const out = []
  for (let y = 0; y < h; y++) {
    const xc = Math.round(xRetta(l, y))
    let rosso = 0, blu = 0
    for (let x = xc - semi; x <= xc + semi; x++) {
      if (x < 0 || x >= w) continue
      const c = mappa[y * w + x]
      if (c === 1) rosso++
      else if (c === 2) blu++
    }
    out.push({ y, rosso, blu })
  }
  return out
}

// Cambi di colore lungo la corda (righe). Vicino alla camera c'è la zona di fine vasca (5 m), poi il centro,
// poi in fondo di nuovo la zona. Si cerca il taglio che separa meglio "blu" da "rosso" (o viceversa) con
// finestre che crescono verso il basso (vicino i dischetti sono grandi).
export function cambiLungoCorda(colori, { yMin = 0 } = {}) {
  const n = colori.length
  // quota di blu per riga (solo righe con pixel di corda)
  const quota = colori.map((c) => (c.rosso + c.blu >= 1 ? c.blu / (c.rosso + c.blu) : null))
  const cambi = []
  const finestra = (y) => Math.max(6, Math.round(y * 0.08))
  let ultimo = -Infinity
  for (let y = Math.max(yMin, 4); y < n - 4; y++) {
    const f = finestra(y)
    let sa = 0, na = 0, sb = 0, nb = 0
    for (let j = y - f; j < y; j++) if (j >= 0 && quota[j] !== null) { sa += quota[j]; na++ }
    for (let j = y; j < y + f && j < n; j++) if (quota[j] !== null) { sb += quota[j]; nb++ }
    if (na < f * 0.3 || nb < f * 0.3) continue
    const sopra = sa / na, sotto = sb / nb
    const salto = sotto - sopra // > 0: sotto più blu
    if (Math.abs(salto) < 0.5) continue
    if (y - ultimo < f) {
      if (Math.abs(salto) > Math.abs(cambi[cambi.length - 1].salto)) cambi[cambi.length - 1] = { y, salto }
      continue
    }
    cambi.push({ y, salto })
    ultimo = y
  }
  return cambi
}

// Distanza dalla parete della camera per riga: d(y) = A / (y − yv) + B
export function mappaDistanza(yv, riferimenti) {
  // minimi quadrati su (1/(y−yv), d)
  const pts = riferimenti.filter((r) => r.y > yv + 1)
  if (pts.length < 2) return null
  const xs = pts.map((r) => 1 / (r.y - yv)), ds = pts.map((r) => r.d)
  const n = xs.length
  const mx = xs.reduce((s, x) => s + x, 0) / n, md = ds.reduce((s, x) => s + x, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ds[i] - md); den += (xs[i] - mx) ** 2 }
  if (den <= 0) return null
  const A = num / den, B = md - A * mx
  const scarti = pts.map((r) => Math.abs(A / (r.y - yv) + B - r.d))
  return { A, B, yv, scartoMax: Math.max(...scarti), metri: (y) => (y > yv + 1 ? A / (y - yv) + B : null) }
}

// ---------- sfondo ----------
// Mediana per pixel di alcuni fotogrammi: l'acqua che si muove (riflessi, onde, schiuma) e il nuotatore
// spariscono, restano le cose ferme (corde, linea nera, T, muro). Base per la geometria e per l'inseguimento.
export function sfondoMediano(fotogrammi) {
  const { w, h } = fotogrammi[0]
  const n = fotogrammi.length
  const out = new Uint8ClampedArray(w * h * 4)
  const buf = new Uint8Array(n)
  for (let p = 0; p < w * h * 4; p++) {
    if ((p & 3) === 3) { out[p] = 255; continue }
    for (let k = 0; k < n; k++) buf[k] = fotogrammi[k].data[p]
    buf.sort()
    out[p] = buf[n >> 1]
  }
  return { w, h, data: out }
}

// Dischetti bianchi delle corde sullo sfondo: chiari, poco colorati e più chiari dei vicini (non una
// zona chiara larga come un riflesso fermo o il bordo vasca)
export function mappaBianchi(img) {
  const { w, h, data } = img
  const lum = new Float32Array(w * h)
  for (let p = 0, i = 0; p < w * h; p++, i += 4) lum[p] = (data[i] + data[i + 1] + data[i + 2]) / 3
  // media locale 15×15 con l'immagine integrale
  const S = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) { let r = 0; for (let x = 0; x < w; x++) { r += lum[y * w + x]; S[(y + 1) * (w + 1) + x + 1] = S[y * (w + 1) + x + 1] + r } }
  const R = 7
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - R), y1 = Math.min(h, y + R + 1)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      if (max < 175 || max - min > 70) continue
      const x0 = Math.max(0, x - R), x1 = Math.min(w, x + R + 1)
      const media = (S[y1 * (w + 1) + x1] - S[y0 * (w + 1) + x1] - S[y1 * (w + 1) + x0] + S[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0))
      if (lum[y * w + x] - media > 25) out[y * w + x] = 3
    }
  }
  return out
}

// Pixel "di corda" in UN fotogramma: dischetto bianco con, entro pochi pixel, un dischetto blu scuro o rosso
// (la corda alterna i colori). Riflessi e schiuma sono bianchi ma non hanno dischetti colorati accanto; le
// ombre scure dell'acqua sono "blu" ma non hanno bianchi accanto. Così restano quasi solo le corde.
export function mappaCordaFotogramma(img) {
  const { w, h } = img
  const col = mappaCorde(img)
  const bia = mappaBianchi(img)
  // dilatazione dei colorati (raggio R) per sapere se un bianco ne ha uno vicino
  const R = 4
  const vicinoCol = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!col[y * w + x]) continue
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx
          if (xx >= 0 && xx < w) vicinoCol[yy * w + xx] = col[y * w + x]
        }
      }
    }
  }
  const vicinoBia = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!bia[y * w + x]) continue
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx
          if (xx >= 0 && xx < w) vicinoBia[yy * w + xx] = 1
        }
      }
    }
  }
  const out = new Uint8Array(w * h)
  for (let p = 0; p < w * h; p++) {
    if (bia[p] && vicinoCol[p]) out[p] = 3
    else if (col[p] && vicinoBia[p]) out[p] = col[p]
  }
  return out
}

// Riga del cambio di colore dei 5 m (zona di fine vasca vicino alla camera → centro vasca): media delle due
// corde se entrambe lo vedono. Il cambio "sotto blu, sopra rosso" (o il contrario) più in basso.
export function rigaCinqueMetri(mappa, w, h, corde) {
  const righe = []
  for (const l of [corde.sx, corde.dx]) {
    if (!l) continue
    const c = cambiLungoCorda(coloriLungoCorda(mappa, w, h, l))
    if (c.length) righe.push(c[c.length - 1].y)
  }
  if (!righe.length) return null
  if (righe.length === 2 && Math.abs(righe[0] - righe[1]) > h * 0.06) return null // non tornano: meglio niente
  return righe.reduce((s, x) => s + x, 0) / righe.length
}

// Riga della T sul fondo (2 m dalla parete): la linea nera della corsia si allarga in una barra orizzontale.
// Pixel "nero di corsia": blu scurissimo con il rosso quasi a zero (diverso dai dischetti blu, r ≥ 22).
export function rigaT(img, corde) {
  const { w, h, data } = img
  if (!corde.sx || !corde.dx) return null
  const conti = new Array(h).fill(0)
  for (let y = 0; y < h; y++) {
    const x0 = Math.max(0, Math.ceil(xRetta(corde.sx, y))), x1 = Math.min(w - 1, Math.floor(xRetta(corde.dx, y)))
    if (x1 - x0 < 10) continue
    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4
      if (data[i] < 25 && data[i + 2] > data[i] + 50 && data[i] + data[i + 1] + data[i + 2] < 260) conti[y]++
    }
    conti[y] /= (x1 - x0) // quota della larghezza della corsia
  }
  // linea normale ~10–15% della corsia; la barra della T ~35% e oltre, per alcune righe di fila
  let migliore = null
  for (let y = 2; y < h - 2; y++) {
    const m = (conti[y - 2] + conti[y - 1] + conti[y] + conti[y + 1] + conti[y + 2]) / 5
    if (m > 0.3 && (!migliore || m > migliore.m)) migliore = { y, m }
  }
  return migliore ? migliore.y : null
}

// Geometria di un fotogramma: corde della corsia, punto di fuga, riga dei 5 m, riga della T
export function geometriaFotogramma(img, punto) {
  const { w, h } = img
  const mappa = mappaCordaFotogramma(img)
  const rette = retteCorde(mappa, w, h)
  const corde = cordeCorsia(rette, punto, w)
  const fuga = puntoDiFuga(corde.sx, corde.dx)
  return { corde, fuga, y5: rigaCinqueMetri(mappa, w, h, corde), yT: rigaT(img, corde), mappa }
}

// ---------- inseguimento del nuotatore dentro la corsia ----------
// Segnale: "caldo" (pelle, cuffia, costume colorato) rispetto all'acqua della corsia. Sott'acqua la pelle
// resta più calda dell'acqua anche se più spenta: la soglia è relativa al colore dell'acqua di quel
// fotogramma, così funziona sopra e sotto. Linea nera e corde non sono calde.
function rbAcqua(img, corde, y0, y1) {
  const { w, data } = img
  const v = []
  for (let y = Math.max(0, y0); y < y1; y += 4) {
    const xa = Math.max(0, Math.ceil(xRetta(corde.sx, y)) + 3), xb = Math.min(w - 1, Math.floor(xRetta(corde.dx, y)) - 3)
    for (let x = xa; x <= xb; x += 4) { const i = (y * w + x) * 4; v.push(data[i] - data[i + 2]) }
  }
  v.sort((a, b) => a - b)
  return v.length ? v[v.length >> 1] : -60
}

// Cerca il nuotatore attorno a (x, y) in una finestra di semiAltezza righe. Ritorna { x, y, massa, alto, basso }
export function cercaInCorsia(img, corde, prec, semiAltezza, yMin = 0) {
  const { w, h, data } = img
  if (!corde.sx || !corde.dx) return null
  const y0 = Math.max(0, Math.round(yMin), Math.round(prec.y - semiAltezza)), y1 = Math.min(h, Math.round(prec.y + semiAltezza))
  const acqua = rbAcqua(img, corde, y0, y1)
  let sx = 0, sy = 0, m = 0, alto = Infinity, basso = -Infinity
  for (let y = y0; y < y1; y++) {
    const xa = Math.max(0, Math.ceil(xRetta(corde.sx, y)) + 2), xb = Math.min(w - 1, Math.floor(xRetta(corde.dx, y)) - 2)
    for (let x = xa; x <= xb; x++) {
      const i = (y * w + x) * 4
      const c = data[i] - data[i + 2] - acqua - 35
      if (c <= 0) continue
      const peso = Math.min(1, c / 60)
      sx += x * peso; sy += y * peso; m += peso
      if (peso > 0.5) { if (y < alto) alto = y; if (y > basso) basso = y }
    }
  }
  if (m < 40) return { x: prec.x, y: prec.y, massa: m, trovato: false }
  return { x: sx / m, y: sy / m, massa: m, alto, basso, trovato: true }
}

export const DMAX = 7 // m dalla parete: oltre, dalla testata la misura non è abbastanza precisa

// Motore per la ripresa dalla testata: un fotogramma alla volta, come MotoreAnalisi.
// Le distanze si calcolano alla fine (servono i riferimenti di tutto il video per tarare la prospettiva).
export class MotoreTestata {
  constructor({ w, h }) {
    this.w = w
    this.h = h
    this.campioni = []
  }

  inizia(img, t, tap) {
    this.pos = { x: tap.x, y: tap.y }
    this.vy = 0
    this.passo(img, t, true)
    const g = this.ultimaGeo
    return { corsieTrovate: !!(g.corde.sx && g.corde.dx), riferimenti: g.y5 !== null }
  }

  passo(img, t, primo = false) {
    // Geometria (la parte lenta) un fotogramma ogni 3: la camera si muove piano. In mezzo si tengono
    // corde e riferimenti dell'ultima volta (y5/yT/fuga solo dove misurati davvero).
    this.n = (this.n || 0) + 1
    let g
    if (primo || this.n % 3 === 1 || !this.ultimaGeo?.corde.sx || !this.ultimaGeo?.corde.dx) {
      g = geometriaFotogramma(img, this.pos)
      if ((!g.corde.sx || !g.corde.dx) && this.ultimaGeo) g.corde = this.ultimaGeo.corde
      this.ultimaGeo = g
    } else g = { corde: this.ultimaGeo.corde, y5: null, yT: null, fuga: null }
    const dt = primo ? 0 : t - this.campioni[this.campioni.length - 1].t
    const previsto = { x: this.pos.x, y: this.pos.y + this.vy * dt }
    // finestra: più alta vicino alla camera (il nuotatore è più grande); ~1/8 dell'altezza in cima, 1/4 in fondo
    const semi = this.h * (0.1 + 0.16 * Math.min(1, Math.max(0, previsto.y / this.h)))
    // Riferimenti per una distanza approssimata già durante l'inseguimento (B ≈ 0): d(y) ≈ 5·(y5 − yv)/(y − yv).
    // Servono a non cercare oltre i ~15 m (in cima ci sono bordo vasca e persone, "caldi" anche loro) e a
    // scartare i salti impossibili.
    if (g.y5 !== null && g.fuga) this.rif = { y5: g.y5, yv: g.fuga.y }
    const dStima = (y) => (this.rif && y > this.rif.yv + 1 ? (5 * (this.rif.y5 - this.rif.yv)) / (y - this.rif.yv) : null)
    const yMin = this.rif ? this.rif.yv + (this.rif.y5 - this.rif.yv) / 3 : 0
    let r = cercaInCorsia(img, g.corde, previsto, semi, yMin)
    if (r?.trovato) r = cercaInCorsia(img, g.corde, r, semi * 0.8, yMin) // seconda passata centrata
    // oltre ~7,5 m il nuotatore è troppo piccolo: la posizione balla di mezzo metro → niente misura
    if (r?.trovato && dStima(r.y) !== null && dStima(r.y) > DMAX) r = { ...r, trovato: false }
    if (r?.trovato && !primo && this.ultimoTrovato) {
      const d0 = dStima(this.ultimoTrovato.y), d1 = dStima(r.y), dtt = t - this.ultimoTrovato.t
      if (d0 !== null && d1 !== null && Math.abs(d1 - d0) > 4 * dtt + 0.4) r = { ...r, trovato: false }
    }
    // Troppo piccolo per seguirlo (in alto nell'immagine, lontano) o "massa" crollata rispetto a prima
    // (agganciato a un bordo o a un altro nuotatore): da qui niente misura, meglio un buco che un numero falso.
    const massaTipica = this.massaTipica || r?.massa || 0
    if (r?.trovato && (r.y < this.h * 0.12 || r.massa < massaTipica * 0.12)) r = { ...r, trovato: false }
    if (r?.trovato) this.massaTipica = 0.9 * massaTipica + 0.1 * r.massa
    const trovato = !!r?.trovato
    if (trovato && !primo && dt > 0) this.vy = 0.6 * this.vy + 0.4 * ((r.y - this.pos.y) / dt)
    if (trovato) { this.pos = { x: r.x, y: r.y }; this.ultimoTrovato = { y: r.y, t } }
    this.campioni.push({
      t, trovato, x: trovato ? r.x : null, y: trovato ? r.y : null, xPrevisto: this.pos.x,
      alto: r?.alto ?? null, basso: r?.basso ?? null, massa: r?.massa ?? 0,
      y5: g.y5, yT: g.yT, fugaY: g.fuga?.y ?? null,
      sopra: null, sotto: null, bw: r?.trovato && Number.isFinite(r.basso) ? Math.max(20, (r.basso - r.alto) * 0.6) : 40,
      conf: trovato ? Math.min(1, r.massa / 200) : 0, catena: 0,
    })
  }
}

const mediana = (v) => { const o = v.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b); return o.length ? o[o.length >> 1] : null }

// Taratura della prospettiva su tutto il video: righe tipiche dei 5 m, della T e del punto di fuga.
// d(y) = A / (y − yv) + B con A e B costanti (altezza e zoom della camera non cambiano); il punto di fuga
// di ogni fotogramma si ricava dalla sua riga dei 5 m (la camera si inclina un po' mentre segue).
export function taraTestata(campioni, vasca = 25) {
  const y5 = mediana(campioni.map((c) => c.y5)), yT = mediana(campioni.map((c) => c.yT)), yv = mediana(campioni.map((c) => c.fugaY))
  if (y5 === null || yv === null) return null
  const rif = [{ y: y5, d: 5 }]
  if (yT !== null && yT > y5 + 20) rif.push({ y: yT, d: 2 })
  const mappa = mappaDistanza(yv, rif)
  if (!mappa || mappa.A <= 0) return null
  const { A, B } = mappa
  const fugaDa = (c) => (c.y5 !== null && Math.abs(c.y5 - y5) < 40 ? c.y5 - A / (5 - B) : c.fugaY !== null && Math.abs(c.fugaY - yv) < 60 ? c.fugaY : yv)
  return {
    A, B, yv, y5, yT, vasca,
    qualita: yT !== null ? 'alta' : 'bassa',
    metri: (c, y = c.y) => {
      if (y === null || y === undefined) return null
      const v = fugaDa(c)
      return y > v + 2 ? A / (y - v) + B : null
    },
  }
}

// Campioni "come quelli del motore di lato" (u = metri dalla parete) per riusare calcolaSerie
export function campioniInMetri(campioni, tara) {
  return campioni.map((c) => {
    const d = c.trovato && tara ? tara.metri(c) : null
    return { ...c, u: d, ucam: d === null ? null : 0, trovato: c.trovato && d !== null, qualitaCorsia: 1, previsto: false, schiuma: null }
  })
}

// È una ripresa dalla testata? Le due corde attorno al nuotatore sono quasi verticali e convergono verso
// l'alto (punto di fuga sopra il nuotatore). Di lato le corde sono orizzontali: queste rette non le trovano.
export function eRipresaDallaTestata(img, tap) {
  const g = geometriaFotogramma(img, tap)
  const { sx, dx } = g.corde
  if (!sx || !dx || !g.fuga) return { testata: false, g }
  const converge = sx.q > 0.05 && dx.q < -0.05 // sinistra sale verso destra, destra sale verso sinistra
  const fugaSopra = g.fuga.y < tap.y - img.h * 0.15
  const larghezza = xRetta(dx, tap.y) - xRetta(sx, tap.y)
  return { testata: converge && fugaSopra && larghezza > img.w * 0.15, g }
}
