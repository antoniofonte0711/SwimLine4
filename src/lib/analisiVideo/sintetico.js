// Video finto per i test: vasca vista di lato in prospettiva, file di galleggianti con i colori da gara,
// nuotatore con velocità NOTA, schizzi, onde, un altro nuotatore nella corsia accanto, camera ferma o che segue.
// Serve a misurare l'errore del motore contro la verità (senza video veri non si può dire altro).

const COLORI = { rosso: [210, 30, 35], blu: [25, 60, 200], giallo: [235, 205, 40], bianco: [240, 240, 240] }
// Disegno della vasca di Stefano (21/11/2026): ultimi 5 m blu/bianchi, centro bianco con un tratto rosso
// ogni ~2 m (e ogni tanto blu al posto del rosso). Un "passo" = un dischetto bianco + uno colorato.
function coloreStefano(m, k) {
  if (m < 5 || m >= 20) return k % 2 ? COLORI.blu : COLORI.bianco
  const blocco = Math.floor(m / 1.9)
  if (m % 1.9 < 0.55) return blocco % 4 === 2 ? COLORI.blu : COLORI.rosso
  return COLORI.bianco
}
function coloreGalleggiante(m) {
  if (m < 5 || m >= 20) return COLORI.rosso
  if (m < 10 || m >= 15) return COLORI.blu
  return COLORI.giallo
}

// rumore riproducibile
function generatore(seme) {
  let s = seme >>> 0 || 1
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

export const PASSO_DISCHETTI = 0.12 // m
export const PASSO_STEFANO = 0.145 // m (coppia di dischetti)

// opts: { w, h, durata, camera: 'ferma'|'segue', velocita(t) m/s, partenza m, subacqueaFino s, nascostoDa, nascostoA, seme }
export function creaScena(opts = {}) {
  const w = opts.w ?? 800, h = opts.h ?? 450
  const vel = opts.velocita ?? (() => 1.6)
  const partenza = opts.partenza ?? (opts.camera === 'segue' ? 3 : 7.5)
  const camera = opts.camera ?? 'ferma'
  const rnd = generatore(opts.seme ?? 11)
  // file di galleggianti: riga sull'immagine e pixel per metro (le file lontane sono più piccole)
  const file = [
    { y: h * 0.3, k: 45 },
    { y: h * 0.55, k: 55 },
    { y: h * 0.83, k: 68 },
  ]
  const yNuotatore = (file[1].y + file[2].y) / 2
  const kNuotatore = (file[1].k + file[2].k) / 2
  // posizione vera: integrale della velocità (passo fine)
  const tab = [[0, partenza]]
  const dtI = 1 / 600
  const posizione = (t) => {
    while (tab[tab.length - 1][0] < t) {
      const [t0, m0] = tab[tab.length - 1]
      tab.push([t0 + dtI, m0 + vel(t0 + dtI / 2) * dtI])
    }
    const i = Math.min(tab.length - 1, Math.max(0, Math.round(t / dtI)))
    return tab[i][1]
  }
  const centroCamera = (t) => (camera === 'segue' ? posizione(t) - 1 + 0.8 * Math.sin(t * 1.1) : 12.5)
  // metri → colonna dell'immagine, con un po' di prospettiva anche in orizzontale
  const colonna = (m, c, k) => { const d = m - c; return w / 2 + k * d * (1 - 0.01 * d) }

  function fotogramma(t) {
    const data = new Uint8ClampedArray(w * h * 4)
    const c = centroCamera(t)
    // acqua con onde e riflessi che cambiano a ogni fotogramma
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const onda = Math.sin(x * 0.05 + y * 0.11 + t * 3) * 8 + (rnd() - 0.5) * 22
        data[i] = 30 + onda; data[i + 1] = 128 + onda; data[i + 2] = 188 + onda * 0.5; data[i + 3] = 255
        if (rnd() < 0.004) { data[i] = 235; data[i + 1] = 240; data[i + 2] = 245 } // riflessi
      }
    }
    const pixel = (x, y, col, alfa = 1) => {
      x = Math.round(x); y = Math.round(y)
      if (x < 0 || y < 0 || x >= w || y >= h) return
      const i = (y * w + x) * 4
      data[i] = data[i] * (1 - alfa) + col[0] * alfa
      data[i + 1] = data[i + 1] * (1 - alfa) + col[1] * alfa
      data[i + 2] = data[i + 2] * (1 - alfa) + col[2] * alfa
    }
    // galleggianti: dischetti larghi 0,07 m ogni 0,12 m (disegno 'stefano': due dischetti per passo, senza buchi)
    const passo = opts.disegno === 'stefano' ? PASSO_STEFANO : PASSO_DISCHETTI
    for (const f of file) {
      const spess = Math.max(2, Math.round(f.k / 10))
      for (let x = 0; x < w; x++) {
        // metri corrispondenti alla colonna (inversa approssimata, basta per disegnare)
        let m = c + (x - w / 2) / f.k
        for (let it = 0; it < 3; it++) m -= (colonna(m, c, f.k) - x) / (f.k * (1 - 0.02 * (m - c)))
        if (m < 0 || m > 25) continue
        const fase = ((m % passo) + passo) % passo
        let disco = fase < 0.07, col
        if (opts.disegno === 'stefano') {
          const k = Math.floor(m / (passo / 2))
          disco = true
          col = k % 2 ? coloreStefano(m, k) : (m < 5 || m >= 20 ? COLORI.bianco : (coloreStefano(m, k) === COLORI.bianco ? [200, 205, 210] : coloreStefano(m, k)))
          // separazione scura tra un dischetto e l'altro
          if (((m % (passo / 2)) + passo) % (passo / 2) < 0.012) col = [20, 30, 40]
        } else col = disco ? coloreGalleggiante(m) : [20, 30, 40]
        const bob = Math.sin(m * 3 + t * 4) * 0.8
        for (let dy = -spess; dy <= spess; dy++) pixel(x, f.y + dy + bob, col, disco ? 1 : 0.6)
      }
    }
    // l'altro nuotatore nella corsia di sopra, in direzione opposta
    const mAltro = 20 - 1.3 * t
    disegnaNuotatore(pixel, colonna(mAltro, c, (file[0].k + file[1].k) / 2), (file[0].y + file[1].y) / 2,
      (file[0].k + file[1].k) / 2, -1, [200, 30, 30], t, false, rnd)
    // il nostro nuotatore
    const mS = posizione(t)
    const nascosto = opts.nascostoDa !== undefined && t >= opts.nascostoDa && t <= opts.nascostoA
    if (!nascosto) {
      const sub = opts.subacqueaFino !== undefined && t < opts.subacqueaFino
      disegnaNuotatore(pixel, colonna(mS, c, kNuotatore), yNuotatore, kNuotatore, 1, [250, 220, 30], t, sub, rnd)
    } else {
      // coperto da una nuvola di schizzi
      const xs = colonna(mS, c, kNuotatore)
      for (let k = 0; k < 900; k++) pixel(xs + (rnd() - 0.5) * kNuotatore * 2.4, yNuotatore + (rnd() - 0.5) * 40, COLORI.bianco)
    }
    return { w, h, data }
  }

  const colonnaNuotatore = (t) => colonna(posizione(t), centroCamera(t), kNuotatore)
  return { w, h, fotogramma, posizione, velocita: vel, centroCamera, yNuotatore, file, colonnaNuotatore, kNuotatore }
}

function disegnaNuotatore(pixel, xc, yc, k, verso, cuffia, t, subacqueo, rnd) {
  const lun = 1.0 * k, alt = 0.17 * k
  const alfa = subacqueo ? 0.45 : 1
  for (let dx = -lun; dx <= lun; dx++) {
    const hh = alt * Math.sqrt(Math.max(0, 1 - (dx / lun) ** 2))
    for (let dy = -hh; dy <= hh; dy++) pixel(xc + dx, yc + dy, [225, 165, 135], alfa)
  }
  const xt = xc + verso * lun * 0.95
  const rt = alt * 1.1
  for (let dx = -rt; dx <= rt; dx++) for (let dy = -rt; dy <= rt; dy++) if (dx * dx + dy * dy <= rt * rt) pixel(xt + dx, yc + dy, cuffia, alfa)
  if (subacqueo) return
  // schizzi delle bracciate, a ritmo
  const intens = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.2)
  const n = Math.round(150 * intens)
  for (let i = 0; i < n; i++) pixel(xc + (rnd() - 0.3) * lun * 1.6 * verso, yc + (rnd() - 0.5) * alt * 3, [245, 248, 250])
}
