// Operazioni di base sui fotogrammi. Un fotogramma è { w, h, data } con data RGBA (come ImageData),
// così funziona sia nel browser sia nei test (dove i fotogrammi sono disegnati in memoria).

// Colore dell'acqua: mediana dei colori su una griglia di campioni (l'acqua è la maggior parte dell'immagine)
export function coloreAcqua(img) {
  const { w, h, data } = img
  const r = [], g = [], b = []
  const passo = Math.max(2, Math.floor(Math.sqrt((w * h) / 4000)))
  for (let y = Math.floor(h * 0.15); y < h; y += passo) {
    for (let x = 0; x < w; x += passo) {
      const i = (y * w + x) * 4
      r.push(data[i]); g.push(data[i + 1]); b.push(data[i + 2])
    }
  }
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1] }
  return [med(r), med(g), med(b)]
}

// Quanto ogni pixel è diverso dall'acqua (0 = acqua). Galleggianti, nuotatore e schizzi spiccano.
export function diversitaAcqua(img, acqua) {
  const { w, h, data } = img
  const out = new Float32Array(w * h)
  const [ar, ag, ab] = acqua
  for (let p = 0, i = 0; p < out.length; p++, i += 4) {
    const dr = data[i] - ar, dg = data[i + 1] - ag, db = data[i + 2] - ab
    out[p] = Math.sqrt(dr * dr + dg * dg + db * db)
  }
  return out
}

// Quanto ogni pixel è "caldo" (0..1): pelle, cuffie e costumi rossi/arancio. Acqua, scia e schiuma sono
// blu, azzurre o bianche e restano a 0: è l'unico segnale che separa davvero il nuotatore dalla sua scia
// (l'istogramma dei colori pesato sulla diversità dall'acqua li trova quasi uguali).
export function mappaCaldo(img, acqua) {
  const { w, h, data } = img
  const out = new Float32Array(w * h)
  const rbAcqua = acqua[0] - acqua[2]
  for (let p = 0, i = 0; p < out.length; p++, i += 4) {
    const rb = data[i] - data[i + 2]
    const c = Math.min(rb - 10, rb - rbAcqua - 40)
    out[p] = c <= 0 ? 0 : Math.min(1, c / 80)
  }
  return out
}

// Valore del canale c (w×h) nel punto (x, y) con interpolazione bilineare
export function campiona(c, w, h, x, y) {
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return NaN
  const x0 = Math.floor(x), y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1)
  const fx = x - x0, fy = y - y0
  const a = c[y0 * w + x0], b = c[y0 * w + x1], d = c[y1 * w + x0], e = c[y1 * w + x1]
  return (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy
}

// Colore → indice di un istogramma: 12 tinte × 3 saturazioni per i colori vivi + 4 livelli di grigio
export const N_BIN = 12 * 3 + 4
export function binColore(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const v = max / 255
  const s = max === 0 ? 0 : (max - min) / max
  if (s < 0.2 || v < 0.12) return 36 + Math.min(3, Math.floor(v * 4))
  let h
  if (max === r) h = ((g - b) / (max - min) + 6) % 6
  else if (max === g) h = (b - r) / (max - min) + 2
  else h = (r - g) / (max - min) + 4
  const hi = Math.min(11, Math.floor((h / 6) * 12))
  const si = s < 0.45 ? 0 : s < 0.7 ? 1 : 2
  return hi * 3 + si
}

// Indice di colore di ogni pixel (calcolato una volta per fotogramma)
export function mappaBin(img) {
  const { w, h, data } = img
  const out = new Uint8Array(w * h)
  for (let p = 0, i = 0; p < out.length; p++, i += 4) out[p] = binColore(data[i], data[i + 1], data[i + 2])
  return out
}

// "Schiuma": pixel chiari e poco colorati (schizzi, bracciate che rompono la superficie)
export function eSchiuma(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  return max > 200 && (max - min) < 50
}

// Classe di colore di un galleggiante: per riconoscere i cambi di colore lungo la corsia
// 0 rosso, 1 giallo/arancio, 2 verde, 3 blu, 4 bianco, 5 altro/scuro
export function classeGalleggiante(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const s = max === 0 ? 0 : (max - min) / max
  if (max > 170 && s < 0.25) return 4
  if (s < 0.35 || max < 60) return 5
  let h
  if (max === r) h = ((g - b) / (max - min) + 6) % 6
  else if (max === g) h = (b - r) / (max - min) + 2
  else h = (r - g) / (max - min) + 4
  const gradi = h * 60
  if (gradi < 18 || gradi >= 330) return 0
  if (gradi < 70) return 1
  if (gradi < 165) return 2
  if (gradi < 270) return 3
  return 0
}
export const N_CLASSI = 6
