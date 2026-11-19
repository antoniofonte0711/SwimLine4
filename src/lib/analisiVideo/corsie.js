// Corsie (file di galleggianti) come righello e come riferimento fisso della vasca.
// - Trova le due file che delimitano la corsia del nuotatore (linee quasi orizzontali, con il disegno
//   ripetuto dei dischetti).
// - Misura il passo dei dischetti in pixel vicino al nuotatore: la scala locale, che cambia con la prospettiva.
// - Misura di quanto il disegno dei dischetti scorre da un fotogramma all'altro: il movimento della camera
//   sul piano dell'acqua (lo sfondo non va bene: se il coach cammina si sposta meno della vasca).
import { campiona } from './immagine'

// Energia orizzontale di una riga (quanto il canale cambia da un pixel al successivo): alta sulle file di dischetti
function energia(c, w, y, x0, x1) {
  let s = 0
  const r = y * w
  for (let x = x0; x < x1; x++) s += Math.abs(c[r + x + 1] - c[r + x - 1])
  return s / Math.max(1, x1 - x0)
}

const mediana = (a) => {
  const b = Array.from(a).filter(Number.isFinite).sort((p, q) => p - q)
  return b.length ? b[b.length >> 1] : NaN
}

// Punteggio di ogni riga tra y0 e y1: mediana delle strisce verticali (uno schizzo in una striscia non conta)
function punteggiRighe(c, w, x0, x1, y0, y1, nStrisce = 6) {
  const out = new Float32Array(y1 - y0 + 1)
  const largh = (x1 - x0) / nStrisce
  const v = new Array(nStrisce)
  for (let y = y0; y <= y1; y++) {
    for (let k = 0; k < nStrisce; k++) {
      const a = Math.max(1, Math.round(x0 + k * largh))
      const b = Math.min(w - 2, Math.round(x0 + (k + 1) * largh))
      v[k] = energia(c, w, y, a, b)
    }
    out[y - y0] = mediana(v)
  }
  return out
}

// Linea della corsia vicino a una posizione prevista: picco in ogni striscia, poi retta robusta.
// linea = { xc, a, b }: y(x) = a + b·(x − xc)
// escludi = [xa, xb]: colonne da ignorare (il nuotatore: i suoi schizzi attirerebbero la linea)
export function adattaLinea(c, w, h, xc, mezza, yPrevisto, raggio = 6, nStrisce = 8, escludi = null) {
  const x0 = Math.max(2, Math.round(xc - mezza))
  const x1 = Math.min(w - 3, Math.round(xc + mezza))
  const largh = (x1 - x0) / nStrisce
  const pts = []
  for (let k = 0; k < nStrisce; k++) {
    const a = Math.round(x0 + k * largh)
    const b = Math.round(x0 + (k + 1) * largh)
    const xs = (a + b) / 2
    if (escludi && b > escludi[0] && a < escludi[1]) continue
    const yp = yPrevisto(xs)
    let best = -1, bestY = -1
    const sc = []
    for (let y = Math.max(1, Math.round(yp - raggio)); y <= Math.min(h - 2, Math.round(yp + raggio)); y++) {
      const e = energia(c, w, y, a, b)
      sc.push([y, e])
      if (e > best) { best = e; bestY = y }
    }
    if (bestY < 0) continue
    // centro della fila: baricentro delle righe forti (le file vicine alla camera sono spesse
    // diversi pixel, il massimo da solo cadrebbe a caso sul bordo)
    const base = Math.min(...sc.map(([, e]) => e))
    const soglia = base + 0.5 * (best - base)
    let sw = 0, sy = 0
    for (const [y, e] of sc) if (e > soglia) { sw += e - soglia; sy += y * (e - soglia) }
    const yf = sw > 0 ? sy / sw : bestY
    pts.push({ x: xs, y: yf, e: best })
  }
  if (pts.length < 3) return null
  const eMax = Math.max(...pts.map((p) => p.e))
  // anche i tratti deboli contano (dischetti blu sull'acqua blu), ma pesano meno
  let usati = pts.filter((p) => p.e > 0.2 * eMax)
  const fit = (pp) => {
    const W = pp.reduce((s, p) => s + p.e, 0)
    const mx = pp.reduce((s, p) => s + p.x * p.e, 0) / W
    const my = pp.reduce((s, p) => s + p.y * p.e, 0) / W
    let sxy = 0, sxx = 0
    pp.forEach((p) => { sxy += p.e * (p.x - mx) * (p.y - my); sxx += p.e * (p.x - mx) ** 2 })
    const b = sxx > 0 ? sxy / sxx : 0
    return { b, a: my + b * (xc - mx) }
  }
  if (usati.length < 3) return null
  let f = fit(usati)
  // via i punti lontani dalla retta (schizzi, braccia sopra la corsia) e si rifà il conto
  const res = (p) => Math.abs(p.y - (f.a + f.b * (p.x - xc)))
  const tolleranza = Math.max(2.5, mediana(usati.map(res)) * 2.5)
  const buoni = usati.filter((p) => res(p) < tolleranza)
  if (buoni.length >= 3 && buoni.length < usati.length) { usati = buoni; f = fit(usati) }
  if (Math.abs(f.b) > 0.6) return null
  return { xc, a: f.a, b: f.b, forza: mediana(usati.map((p) => p.e)) }
}

export const yLinea = (l, x) => l.a + l.b * (x - l.xc)

// Le due file di galleggianti sopra e sotto il punto toccato (la corsia del nuotatore)
export function trovaCorsie(c, w, h, x, y) {
  const mezza = Math.min(w * 0.3, Math.max(60, w * 0.25))
  const x0 = Math.max(2, Math.round(x - mezza)), x1 = Math.min(w - 3, Math.round(x + mezza))
  const y0 = Math.max(2, Math.round(y - h * 0.45)), y1 = Math.min(h - 3, Math.round(y + h * 0.45))
  const p = punteggiRighe(c, w, x0, x1, y0, y1)
  // leggero ammorbidimento
  const s = p.map((v, i) => (p[Math.max(0, i - 1)] + 2 * v + p[Math.min(p.length - 1, i + 1)]) / 4)
  const base = mediana(s)
  const picchi = []
  for (let i = 2; i < s.length - 2; i++) {
    if (s[i] >= s[i - 1] && s[i] > s[i + 1] && s[i] >= s[i - 2] && s[i] >= s[i + 2] && s[i] > base * 1.8) picchi.push({ y: y0 + i, e: s[i] })
  }
  // una fila di galleggianti ha un disegno che si ripete (i dischetti); schizzi, braccia e bordi del
  // nuotatore no. Si tengono solo le righe regolari, lontano dalla colonna del nuotatore.
  const minDist = Math.max(4, h * 0.015)
  const regolare = (q) => {
    const lato = (xa, xb) => {
      if (xb - xa < 40) return 0
      const pr = new Float32Array(xb - xa + 1)
      for (let i = 0; i < pr.length; i++) pr[i] = (c[(q.y - 1) * w + xa + i] + c[q.y * w + xa + i] + c[(q.y + 1) * w + xa + i]) / 3
      return periodo(pr, 3, 40)?.forza || 0
    }
    // fuori dalla sagoma del nuotatore (e dai suoi schizzi), a sinistra o a destra
    return Math.max(lato(x0, Math.round(bl)), lato(Math.round(br), x1))
  }
  // sagoma del nuotatore attorno al tocco: colonne dove la fascia del tocco è molto diversa dall'acqua
  const fr = Math.max(3, Math.round(h * 0.04))
  const colonne = []
  for (let xx = x0; xx <= x1; xx++) {
    let sm = 0
    for (let yy = Math.max(0, Math.round(y) - fr); yy <= Math.min(h - 1, Math.round(y) + fr); yy++) sm += c[yy * w + xx]
    colonne.push(sm)
  }
  const liscia = colonne.map((_, i) => {
    let sm = 0, k = 0
    for (let j = Math.max(0, i - 4); j <= Math.min(colonne.length - 1, i + 4); j++) { sm += colonne[j]; k++ }
    return sm / k
  })
  const ic = Math.round(x) - x0
  const fondo = mediana(liscia)
  const pic = Math.max(...liscia.slice(Math.max(0, ic - 15), ic + 15))
  const lim = fondo + 0.3 * (pic - fondo)
  let il = ic, ir = ic
  while (il > 0 && liscia[il - 1] > lim) il--
  while (ir < liscia.length - 1 && liscia[ir + 1] > lim) ir++
  const marg = Math.max(15, (ir - il) * 0.25)
  const bl = x0 + il - marg, br = x0 + ir + marg
  const conReg = picchi.map((q) => ({ ...q, reg: regolare(q) }))
  // e devono essere tra le righe più forti: una riga debole ma regolare (onde, ombre) non è una fila
  const regolari = conReg.filter((q) => q.reg > 0.4)
  const eMax = Math.max(0, ...regolari.map((q) => q.e))
  const candidati = regolari.filter((q) => q.e > 0.35 * eMax)
  // la migliore per lato: forte, regolare e vicina (le file della corsia accanto sono più lontane)
  const voto = (q) => q.e * q.reg * Math.exp(-Math.abs(q.y - y) / (0.25 * h))
  const migliore = (arr) => arr.sort((a, b) => voto(b) - voto(a))[0]
  const sopra = migliore(candidati.filter((q) => q.y < y - minDist))
  const sotto = migliore(candidati.filter((q) => q.y > y + minDist))
  const linea = (q) => q && adattaLinea(c, w, h, x, mezza, () => q.y, 10)
  return { sopra: linea(sopra), sotto: linea(sotto) }
}

// Valori del canale lungo la linea della corsia, per x da x0 a x1 (media di 3 righe attorno alla linea)
export function profilo(c, w, h, l, x0, x1) {
  const n = x1 - x0 + 1
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = x0 + i
    const y = yLinea(l, x)
    out[i] = (campiona(c, w, h, x, y - 1) + campiona(c, w, h, x, y) + campiona(c, w, h, x, y + 1)) / 3
  }
  return out
}

// Toglie la media mobile (resta solo il disegno ripetuto dei dischetti). I NaN restano NaN.
function senzaFondo(p, fin = 12) {
  const n = p.length
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(p[i])) { out[i] = NaN; continue }
    let s = 0, k = 0
    for (let j = Math.max(0, i - fin); j <= Math.min(n - 1, i + fin); j++) if (Number.isFinite(p[j])) { s += p[j]; k++ }
    out[i] = p[i] - s / k
  }
  return out
}

// Passo dei dischetti in pixel (autocorrelazione). forza 0..1: quanto il disegno è davvero regolare.
export function periodo(p, minLag = 3, maxLag = 40) {
  const d = senzaFondo(p, Math.max(6, Math.round(maxLag / 2)))
  const n = d.length
  const r = new Float32Array(maxLag + 2)
  for (let L = minLag - 1; L <= Math.min(maxLag + 1, n - 8); L++) {
    let s = 0, a = 0, b = 0
    for (let i = 0; i + L < n; i++) {
      const u = d[i], v = d[i + L]
      if (!Number.isFinite(u) || !Number.isFinite(v)) continue
      s += u * v; a += u * u; b += v * v
    }
    r[L] = a > 0 && b > 0 ? s / Math.sqrt(a * b) : 0
  }
  const picchi = []
  for (let L = minLag; L <= Math.min(maxLag, n - 9); L++) if (r[L] > r[L - 1] && r[L] >= r[L + 1] && r[L] > 0.15) picchi.push(L)
  if (!picchi.length) return null
  const rMax = Math.max(...picchi.map((L) => r[L]))
  // il passo vero è il picco più corto abbastanza alto (gli altri sono multipli: 2P, 3P…)
  let L = picchi.find((q) => r[q] >= 0.6 * rMax)
  // controllo: se a metà di L c'è un picco discreto, il passo vero è quello
  const meta = picchi.find((q) => Math.abs(q - L / 2) <= 1 && r[q] > 0.3)
  if (meta) L = meta
  const den = r[L - 1] - 2 * r[L] + r[L + 1]
  const Lf = den < 0 ? L + 0.5 * (r[L - 1] - r[L + 1]) / den : L
  return { P: Lf, forza: r[L] }
}

// Di quanti pixel il disegno della corsia si è spostato tra due fotogrammi (positivo = verso destra).
// Il disegno si ripete ogni P pixel: si cerca solo vicino allo spostamento previsto (la camera non cambia
// velocità di colpo), altrimenti uno scatto di un dischetto sarebbe indistinguibile.
export function spostamento(prec, att, previsto, P) {
  const a = senzaFondo(prec, Math.max(6, Math.round(P * 1.5)))
  const b = senzaFondo(att, Math.max(6, Math.round(P * 1.5)))
  const n = a.length
  const lo = Math.floor(previsto - 0.6 * P), hi = Math.ceil(previsto + 0.6 * P)
  const ncc = (L) => {
    let s = 0, x = 0, y = 0, k = 0
    for (let i = Math.max(0, L); i < Math.min(n, n + L); i++) {
      const u = b[i], v = a[i - L]
      if (!Number.isFinite(u) || !Number.isFinite(v)) continue
      s += u * v; x += u * u; y += v * v; k++
    }
    return k > n * 0.3 && x > 0 && y > 0 ? s / Math.sqrt(x * y) : -1
  }
  let best = -2, bestL = 0
  const val = new Map()
  for (let L = lo; L <= hi; L++) {
    const q = ncc(L)
    val.set(L, q)
    if (q > best) { best = q; bestL = L }
  }
  if (best < 0) return null
  const q0 = val.get(bestL - 1) ?? ncc(bestL - 1)
  const q2 = val.get(bestL + 1) ?? ncc(bestL + 1)
  const den = q0 - 2 * best + q2
  const s = den < 0 ? bestL + 0.5 * (q0 - q2) / den : bestL
  return { s, qualita: best }
}

// Stima grossolana dello scorrimento, senza ambiguità dei dischetti: si guarda solo quello che NON si
// ripete (tratti di colore diverso, irregolarità, pezzi senza galleggianti), togliendo il disegno fine.
// Ritorna { s, qualita, unicita } oppure null se la corsia è troppo uniforme per dirlo.
export function spostamentoGrossolano(prec, att, P, raggio) {
  const liscia = (p) => {
    const n = p.length
    const f = Math.max(2, Math.round(P * 0.75))
    const out = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      let s = 0, k = 0
      for (let j = Math.max(0, i - f); j <= Math.min(n - 1, i + f); j++) if (Number.isFinite(p[j])) { s += p[j]; k++ }
      out[i] = k ? s / k : NaN
    }
    return out
  }
  const a = senzaFondo(liscia(prec), Math.round(P * 6))
  const b = senzaFondo(liscia(att), Math.round(P * 6))
  const n = a.length
  let varA = 0, k0 = 0
  for (let i = 0; i < n; i++) if (Number.isFinite(a[i])) { varA += a[i] * a[i]; k0++ }
  if (!k0 || varA / k0 < 4) return null // corsia uniforme: niente da agganciare
  const val = []
  for (let L = -raggio; L <= raggio; L++) {
    let s = 0, x = 0, y = 0, k = 0
    for (let i = Math.max(0, L); i < Math.min(n, n + L); i++) {
      const u = b[i], v = a[i - L]
      if (!Number.isFinite(u) || !Number.isFinite(v)) continue
      s += u * v; x += u * u; y += v * v; k++
    }
    val.push(k > n * 0.4 && x > 0 && y > 0 ? s / Math.sqrt(x * y) : -1)
  }
  let bi = 0
  for (let i = 1; i < val.length; i++) if (val[i] > val[bi]) bi = i
  // secondo picco lontano almeno mezzo dischetto: se è quasi alto come il primo, la stima è ambigua
  let secondo = -1
  for (let i = 0; i < val.length; i++) if (Math.abs(i - bi) > P * 0.5) secondo = Math.max(secondo, val[i])
  return { s: bi - raggio, qualita: val[bi], unicita: val[bi] - secondo }
}
