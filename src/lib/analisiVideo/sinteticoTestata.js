// Video finto per i test: ripresa dalla TESTATA della vasca, con la geometria vera (camera alta sul bordo,
// inclinata verso il basso) e la rifrazione dell'acqua per tutto ciò che sta sotto la superficie (fondo, linea
// nera, T, nuotatore in subacquea). Il nuotatore ha una posizione NOTA in ogni istante: serve a misurare
// l'errore del motore contro la verità.
//
// Mondo: X di lato (0 = centro della corsia), Y in alto (0 = superficie dell'acqua), Z = distanza dalla parete
// della camera lungo la corsia.

function generatore(seme) {
  let s = seme >>> 0 || 1
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

export const PASSO_COPPIA = 0.145 // m: un dischetto bianco + uno colorato (come la vasca di Stefano)
const N_ACQUA = 1.333

// opts: {
//   w, h, f (px), H (m, altezza camera), dietro (m dietro la parete), inclinazione (gradi verso il basso),
//   profondita (m, del fondo), posizione(t) → { d, sotto (m sotto la superficie, 0 = a galla), verso: ±1 },
//   tremolio (gradi), seme, conT (default true)
// }
export function creaScenaTestata(opts = {}) {
  const w = opts.w ?? 480, h = opts.h ?? 854, f = opts.f ?? 670
  const H = opts.H ?? 1.6, dietro = opts.dietro ?? 0.3, prof = opts.profondita ?? 1.8
  const incl0 = ((opts.inclinazione ?? 35) * Math.PI) / 180
  const rnd = generatore(opts.seme ?? 7)
  const posizione = opts.posizione ?? ((t) => ({ d: 7 - 1.2 * t, sotto: 0, verso: -1 }))
  const conT = opts.conT ?? true
  const cx = w / 2, cy = h / 2

  function fotogramma(t) {
    const data = new Uint8ClampedArray(w * h * 4)
    // camera che trema un po' (mano): inclinazione e direzione
    const trem = ((opts.tremolio ?? 0) * Math.PI) / 180
    const th = incl0 + trem * Math.sin(t * 2.3) * 0.7
    const pan = trem * Math.sin(t * 1.7 + 1)
    const cth = Math.cos(th), sth = Math.sin(th), cp = Math.cos(pan), sp = Math.sin(pan)
    const p = posizione(t)
    // braccio che si allunga avanti a ogni bracciata (sposta il "centro" del corpo come nei video veri)
    const braccio = p.sotto > 0.05 ? 0 : 0.35 * Math.max(0, Math.sin(t * 2 * Math.PI / 0.7))
    for (let v = 0; v < h; v++) {
      for (let u = 0; u < w; u++) {
        const i = (v * w + u) * 4
        data[i + 3] = 255
        // direzione del raggio nel mondo
        const a = (u - cx) / f, b = -(v - cy) / f
        let dx = a, dy = b * cth - sth, dz = b * sth + cth
        const dx2 = dx * cp + dz * sp; dz = -dx * sp + dz * cp; dx = dx2
        if (dy >= -1e-4) { data[i] = 205; data[i + 1] = 190; data[i + 2] = 170; continue } // bordo, persone
        const tS = H / -dy
        const Xs = dx * tS, Zs = -dietro + dz * tS
        if (Zs > 25) { data[i] = 190; data[i + 1] = 185; data[i + 2] = 175; continue } // muro in fondo
        if (Zs < 0) { data[i] = 180; data[i + 1] = 180; data[i + 2] = 180; continue } // bordo vicino
        const onda = Math.sin(Xs * 9 + Zs * 5 + t * 4) * 7 + (rnd() - 0.5) * 16
        // corde (in superficie): dischetti alternati bianco / colore
        let col = null
        for (const xc of [-1.25, 1.25]) {
          if (Math.abs(Xs - xc) < 0.055) {
            const k = Math.floor(Zs / (PASSO_COPPIA / 2))
            col = k % 2 === 0 ? [235, 238, 240] : Zs < 5 || Zs > 20 ? [40, 70, 150] : [215, 60, 55]
          }
        }
        // nuotatore a galla
        const sx = 0, lun = 0.9, lar = 0.22
        const corpo = (X, Z) => {
          const zc = Z - p.d
          if (((zc) / lun) ** 2 + ((X - sx) / lar) ** 2 < 1) return true
          // braccio avanti (verso il senso di nuoto)
          const za = zc * -p.verso
          return braccio > 0 && za > lun * 0.6 && za < lun + braccio && Math.abs(X - sx - 0.12) < 0.06
        }
        if (!col && p.sotto <= 0.05 && corpo(Xs, Zs)) col = [228, 168, 132]
        if (col) { data[i] = col[0] + onda * 0.3; data[i + 1] = col[1] + onda * 0.3; data[i + 2] = col[2] + onda * 0.3; continue }
        // sotto la superficie: rifrazione (Snell)
        const n = Math.hypot(dx, dy, dz)
        const ix = dx / n, iy = dy / n, iz = dz / n
        const cosi = -iy, eta = 1 / N_ACQUA
        const k2 = 1 - eta * eta * (1 - cosi * cosi)
        const rx = eta * ix, ry = eta * iy + (eta * cosi - Math.sqrt(k2)), rz = eta * iz
        let r = 95 + onda, g = 160 + onda, bb = 182 + onda * 0.5
        // nuotatore in subacquea (piano a p.sotto metri)
        if (p.sotto > 0.05) {
          const tU = p.sotto / -ry
          if (corpo(Xs + rx * tU, Zs + rz * tU)) { r = 175 + onda * 0.3; g = 150 + onda * 0.3; bb = 140 }
        }
        if (r === 95 + onda) {
          const tF = prof / -ry
          const Xf = Xs + rx * tF, Zf = Zs + rz * tF
          const piastrella = Math.abs(((Xf % 0.25) + 0.25) % 0.25 - 0.125) > 0.118 || Math.abs(((Zf % 0.25) + 0.25) % 0.25 - 0.125) > 0.118
          const linea = Math.abs(Xf) < 0.125 && Zf > 2 && Zf < 23
          const barraT = conT && Math.abs(Zf - 2) < 0.125 && Math.abs(Xf) < 0.5
          if (linea || barraT) { r = 10; g = 66 + onda * 0.3; bb = 105 + onda * 0.3 } else if (piastrella) { r -= 30; g -= 30; bb -= 25 }
        }
        data[i] = r; data[i + 1] = g; data[i + 2] = bb
      }
    }
    return { w, h, data }
  }

  // dove sta il nuotatore nell'immagine (per il tocco iniziale): proiezione del centro del corpo
  function puntoNuotatore(t) {
    const p = posizione(t)
    const Y = -p.sotto, Z = p.d + dietro
    const yc = -H + Y // rispetto alla camera
    // coordinate camera (senza tremolio)
    const fz = Z * Math.cos(incl0) - yc * Math.sin(incl0)
    const fy = Z * Math.sin(incl0) + yc * Math.cos(incl0)
    return { x: cx, y: cy - (f * fy) / fz }
  }

  return { w, h, fotogramma, posizione, puntoNuotatore }
}

// Posizioni tipiche (verità) per i test
export const percorsi = {
  // arrivo nuotando a velocità costante v, da d0 verso la parete
  arrivo: (d0, v) => (t) => ({ d: d0 - v * t, sotto: 0, verso: -1 }),
  // spinta dalla parete in subacquea: da 1 m, velocità che scende da v0 a v1 in 2 s, poi a galla
  spinta: (v0, v1) => (t) => {
    const tau = 1.2
    const d = 1 + v1 * t + (v0 - v1) * tau * (1 - Math.exp(-t / tau))
    return { d, sotto: t < 2 ? 0.45 : 0, verso: 1 }
  },
  // virata completa: arrivo a v fino a 1,2 m, 0,8 s fermo (capovolta), spinta subacquea, poi nuoto
  virata: (d0, v) => {
    const tArr = (d0 - 1.2) / v
    return (t) => {
      if (t < tArr) return { d: d0 - v * t, sotto: 0, verso: -1 }
      if (t < tArr + 0.8) return { d: 1.2, sotto: 0.3, verso: -1 }
      const s = t - tArr - 0.8, tau = 1.0, v0 = 2.0, v1 = 1.2
      return { d: 1.2 + v1 * s + (v0 - v1) * tau * (1 - Math.exp(-s / tau)), sotto: s < 1.6 ? 0.45 : 0, verso: 1 }
    }
  },
}

// velocità vera (derivata numerica della posizione)
export function velocitaVera(posizione, t) {
  const e = 0.01
  return Math.abs(posizione(t + e).d - posizione(t - e).d) / (2 * e)
}
