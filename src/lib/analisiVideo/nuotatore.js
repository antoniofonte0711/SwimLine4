// Inseguimento del nuotatore scelto con un tocco.
// - Aspetto: istogramma dei colori (cuffia, costume, pelle) pesato su quanto ogni pixel è diverso dall'acqua.
// - Corsia: il nuotatore resta tra le sue due file di galleggianti, quindi si cerca solo lì
//   (chi nuota nelle corsie accanto non può "rubargli" l'identità).
// - Movimento: posizione prevista = movimento della camera + sua velocità nell'inquadratura.
// Se non lo trova con sicurezza NON inventa una posizione: segna "perso", continua a prevedere dove
// dovrebbe essere e allarga la ricerca finché lo ritrova.
import { N_BIN } from './immagine'
import { yLinea } from './corsie'

export const SOGLIA_TROVATO = 0.42
export const SOGLIA_RITROVATO = 0.55

const pesoPrimoPiano = (d) => Math.min(1, Math.max(0, (d - 22) / 55))

// Istogrammi colonna per colonna nella fascia di righe [ya, yb] per x in [xa, xb]
function istogrammiColonne(ctx, xa, xb, ya, yb) {
  const { w, bin, div } = ctx
  const n = xb - xa + 1
  const h = new Float32Array(n * N_BIN)
  const fg = new Float32Array(n)
  for (let y = ya; y <= yb; y++) {
    const r = y * w
    for (let i = 0; i < n; i++) {
      const p = r + xa + i
      const q = pesoPrimoPiano(div[p])
      if (q <= 0) continue
      h[i * N_BIN + bin[p]] += q
      fg[i] += q
    }
  }
  return { h, fg, n }
}

function bhattacharyya(a, b) {
  let s = 0
  for (let k = 0; k < N_BIN; k++) s += Math.sqrt(a[k] * b[k])
  return s
}

// Fascia verticale della corsia attorno a x (o attorno al tocco se le corsie non ci sono)
function fascia(stato, x) {
  if (stato.sopra && stato.sotto) {
    const y1 = yLinea(stato.sopra, x), y2 = yLinea(stato.sotto, x)
    const alto = Math.min(y1, y2), basso = Math.max(y1, y2)
    const H = basso - alto
    // un po' di margine dalle file: i galleggianti non fanno parte del nuotatore
    return { ya: alto + H * 0.12, yb: basso - H * 0.12, H }
  }
  return { ya: stato.y - stato.bh / 2, yb: stato.y + stato.bh / 2, H: stato.bh / 0.7 }
}

// Istogramma del riquadro in (x, fascia)
function istogrammaRiquadro(ctx, x, f, bw) {
  const xa = Math.max(0, Math.round(x - bw / 2)), xb = Math.min(ctx.w - 1, Math.round(x + bw / 2))
  const ya = Math.max(0, Math.round(f.ya)), yb = Math.min(ctx.h - 1, Math.round(f.yb))
  const { h, fg, n } = istogrammiColonne(ctx, xa, xb, ya, yb)
  const tot = new Float32Array(N_BIN)
  let fgTot = 0
  for (let i = 0; i < n; i++) {
    fgTot += fg[i]
    for (let k = 0; k < N_BIN; k++) tot[k] += h[i * N_BIN + k]
  }
  if (fgTot > 0) for (let k = 0; k < N_BIN; k++) tot[k] /= fgTot
  const area = Math.max(1, (xb - xa + 1) * (yb - ya + 1))
  return { hist: tot, fg: fgTot / area }
}

// stato iniziale dal tocco (x, y in pixel del fotogramma di analisi)
export function iniziaNuotatore(ctx, x, y, corsie) {
  const stato = { x, y, sopra: corsie?.sopra || null, sotto: corsie?.sotto || null, v: 0, persoDa: null, perso: false }
  const f0 = fascia({ ...stato, bh: ctx.h * 0.08 }, x)
  stato.bh = f0.yb - f0.ya
  stato.bw = Math.max(16, (stato.sopra && stato.sotto ? f0.H * 1.5 : ctx.w * 0.1))
  if (stato.sopra && stato.sotto) stato.y = (f0.ya + f0.yb) / 2
  // si centra il riquadro dove c'è più "nuotatore" vicino al tocco (il dito non è preciso)
  const R = Math.round(stato.bw * 0.6)
  const xa = Math.max(0, Math.round(x - R - stato.bw / 2)), xb = Math.min(ctx.w - 1, Math.round(x + R + stato.bw / 2))
  const col = istogrammiColonne(ctx, xa, xb, Math.max(0, Math.round(f0.ya)), Math.min(ctx.h - 1, Math.round(f0.yb)))
  let best = -1, bx = x
  const half = Math.round(stato.bw / 2)
  for (let c = xa + half; c <= xb - half; c++) {
    let s = 0
    for (let i = c - half - xa; i <= c + half - xa; i++) s += col.fg[i]
    // a parità, vicino al tocco
    s *= Math.exp(-((c - x) ** 2) / (2 * (stato.bw * 0.5) ** 2))
    if (s > best) { best = s; bx = c }
  }
  stato.x = bx
  // larghezza del riquadro = lunghezza della sagoma (colonne con abbastanza "nuotatore")
  if (stato.sopra && stato.sotto) {
    const ampio = Math.round(f0.H * 2.5)
    const xa2 = Math.max(0, Math.round(bx - ampio)), xb2 = Math.min(ctx.w - 1, Math.round(bx + ampio))
    const c2 = istogrammiColonne(ctx, xa2, xb2, Math.max(0, Math.round(f0.ya)), Math.min(ctx.h - 1, Math.round(f0.yb)))
    const sm = Array.from(c2.fg, (_, i) => {
      let s = 0, k = 0
      for (let j = Math.max(0, i - 3); j <= Math.min(c2.n - 1, i + 3); j++) { s += c2.fg[j]; k++ }
      return s / k
    })
    // Onde, riflessi e schiuma sono "diversi dall'acqua" quanto il nuotatore: si toglie il fondo (mediana
    // delle colonne della corsia) e la sagoma è dove il nuotatore spicca SOPRA il fondo. Senza, con
    // l'acqua mossa la sagoma risultava lunga mezza immagine.
    const fondo = [...sm].sort((p, q) => p - q)[Math.floor(sm.length * 0.5)]
    const sopraFondo = sm.map((v) => Math.max(0, v - fondo))
    const ic = Math.round(bx - xa2)
    const picco = Math.max(...sopraFondo.slice(Math.max(0, ic - 10), ic + 10))
    let sx = ic, dx = ic
    while (sx > 0 && sopraFondo[sx - 1] > picco * 0.45) sx--
    while (dx < c2.n - 1 && sopraFondo[dx + 1] > picco * 0.45) dx++
    const lun = dx - sx + 1
    // tra 0,9 e 1,8 volte l'altezza della corsia: un riquadro piccolo (solo la testa) sull'acqua mossa si perde
    // e finisce sulla scia; uno enorme copre i galleggianti. La sagoma misurata decide solo dentro questi limiti.
    stato.rapporto = Math.min(1.8, Math.max(0.9, (lun * 0.9) / f0.H))
    stato.bw = Math.max(16, f0.H * stato.rapporto)
    stato.x = xa2 + (sx + dx) / 2
  }
  const m = istogrammaRiquadro(ctx, stato.x, fascia(stato, stato.x), stato.bw)
  stato.modello = m.hist
  stato.fgModello = Math.max(m.fg, 0.05)
  return stato
}

// Un passo: ctx = canali del fotogramma, dt in secondi, movimentoCamera = spostamento del disegno della vasca (px)
// Ritorna { x, y, conf, trovato } senza modificare `stato`; il chiamante applica con applicaPasso.
export function cercaNuotatore(ctx, stato, dt, movimentoCamera) {
  const persoDa = stato.perso ? stato.tPerso || 0 : 0
  const xPrev = stato.x + movimentoCamera + stato.v * dt
  const sigma = Math.max(stato.bw * 0.45, Math.abs(stato.v * dt) * 1.5) * (1 + Math.min(4, persoDa * 2))
  const R = Math.round(Math.min(ctx.w, stato.bw * 1.2 + sigma * 2))
  const xa = Math.max(0, Math.round(xPrev - R - stato.bw / 2))
  const xb = Math.min(ctx.w - 1, Math.round(xPrev + R + stato.bw / 2))
  if (xb - xa < stato.bw) return { x: xPrev, y: stato.y, conf: 0, trovato: false, previsto: xPrev }
  const f = fascia(stato, xPrev)
  const col = istogrammiColonne(ctx, xa, xb, Math.max(0, Math.round(f.ya)), Math.min(ctx.h - 1, Math.round(f.yb)))
  const half = Math.round(stato.bw / 2)
  const area = Math.max(1, (2 * half + 1) * (Math.round(f.yb) - Math.round(f.ya) + 1))
  // somma scorrevole degli istogrammi di colonna = istogramma del riquadro in ogni posizione
  const acc = new Float32Array(N_BIN)
  let fgAcc = 0
  const aggiungi = (i, segno) => {
    fgAcc += segno * col.fg[i]
    const o = i * N_BIN
    for (let k = 0; k < N_BIN; k++) acc[k] += segno * col.h[o + k]
  }
  for (let i = 0; i <= 2 * half && i < col.n; i++) aggiungi(i, 1)
  const norm = new Float32Array(N_BIN)
  const risultati = []
  for (let c = half; c < col.n - half; c++) {
    if (c > half) { aggiungi(c - half - 1, -1); aggiungi(c + half, 1) }
    const fgM = fgAcc / area
    let bc = 0
    if (fgAcc > 1e-6) {
      for (let k = 0; k < N_BIN; k++) norm[k] = Math.max(0, acc[k]) / fgAcc
      bc = bhattacharyya(stato.modello, norm)
    }
    const rapp = fgM / stato.fgModello
    const presenza = Math.min(1, rapp / 0.55)
    const conf = bc * presenza
    const x = xa + c
    const prior = Math.exp(-((x - xPrev) ** 2) / (2 * sigma * sigma))
    // per decidere DOVE: somiglianza × quantità di nuotatore nel riquadro (massima quando lo copre tutto)
    risultati.push({ x, conf, bc, rapp, punteggio: bc * Math.min(1.5, rapp) * (0.35 + 0.65 * prior) })
  }
  if (!risultati.length) return { x: xPrev, y: stato.y, conf: 0, trovato: false, previsto: xPrev }
  let b = 0
  for (let i = 1; i < risultati.length; i++) if (risultati[i].punteggio > risultati[b].punteggio) b = i
  const best = risultati[b]
  // affinamento sotto il pixel
  let x = best.x
  if (b > 0 && b < risultati.length - 1) {
    const p0 = risultati[b - 1].punteggio, p1 = best.punteggio, p2 = risultati[b + 1].punteggio
    const den = p0 - 2 * p1 + p2
    if (den < 0) x += 0.5 * (p0 - p2) / den
  }
  const soglia = stato.perso ? SOGLIA_RITROVATO : SOGLIA_TROVATO
  const fy = fascia(stato, x)
  if (best.conf < soglia) {
    // l'aspetto può cambiare (riemerge dalla subacquea, schizzi): se nella SUA corsia, dove deve essere,
    // c'è una sagoma piena e almeno un po' somigliante, è lui. Il modello d'aspetto si rinnova.
    // Più è vicino alla posizione prevista, meno deve somigliare: chi riemerge dalla subacquea cambia
    // colori di colpo, ma resta nella sua corsia e dove il suo movimento dice che deve essere.
    let alt = null
    const tPerso = stato.tPerso || 0
    for (const q of risultati) {
      const dist = Math.abs(q.x - xPrev)
      if (dist > Math.max(stato.bw * 0.8, sigma)) continue
      if (q.rapp < 0.8 || q.rapp > 3) continue
      const vicino = dist < stato.bw * 0.5 && tPerso < 1.5
      if (q.bc < (vicino ? 0.02 : 0.3)) continue
      const pq = q.rapp * Math.max(q.bc, 0.1) * Math.exp(-(dist ** 2) / (2 * (stato.bw * 0.4) ** 2))
      if (!alt || pq > alt.pq) alt = { ...q, pq }
    }
    if (alt) return { x: alt.x, y: (fy.ya + fy.yb) / 2, conf: Math.max(best.conf, soglia), trovato: true, previsto: xPrev, rinnova: true }
  }
  return { x, y: (fy.ya + fy.yb) / 2, conf: best.conf, trovato: best.conf >= soglia, previsto: xPrev }
}

// Applica il risultato allo stato (velocità nell'inquadratura, modello d'aspetto, perso/ritrovato)
export function applicaPasso(ctx, stato, r, dt, movimentoCamera, corsie) {
  if (corsie) { stato.sopra = corsie.sopra || stato.sopra; stato.sotto = corsie.sotto || stato.sotto }
  if (r.trovato) {
    if (!stato.perso && dt > 0) {
      const vNuova = (r.x - stato.x - movimentoCamera) / dt
      stato.v = 0.75 * stato.v + 0.25 * vNuova
      // A metà vasca un nuotatore non rallenta di colpo: la sua velocità nella vasca resta vicina a quella
      // degli ultimi secondi (vRif, lenta). Senza questo limite il riquadro che scivola sulla scia (ferma
      // nella vasca) abbassa la velocità prevista, la previsione lo spinge ancora più sulla scia, e così via.
      if (stato.vRif) {
        const lo = Math.min(0.6 * stato.vRif, 1.4 * stato.vRif), hi = Math.max(0.6 * stato.vRif, 1.4 * stato.vRif)
        stato.v = Math.min(hi, Math.max(lo, stato.v))
        stato.vRif = 0.99 * stato.vRif + 0.01 * stato.v
      }
    }
    stato.x = r.x
    stato.y = r.y
    stato.perso = false
    stato.tPerso = 0
    if (r.conf > 0.5 || r.rinnova) {
      const m = istogrammaRiquadro(ctx, r.x, fascia(stato, r.x), stato.bw)
      const a = r.rinnova ? 0.5 : 0.08
      for (let k = 0; k < N_BIN; k++) stato.modello[k] = (1 - a) * stato.modello[k] + a * m.hist[k]
      stato.fgModello = (1 - a / 2) * stato.fgModello + (a / 2) * Math.max(0.05, m.fg)
    }
  } else {
    // nessun numero inventato: lo stato segue solo la previsione per sapere dove cercare
    stato.x = r.previsto
    stato.perso = true
    stato.tPerso = (stato.tPerso || 0) + dt
    stato.v *= 0.98
  }
  if (stato.sopra && stato.sotto) {
    const f = fascia(stato, stato.x)
    stato.bw = Math.max(16, f.H * (stato.rapporto || 1.5))
  }
}

// Quota di "schiuma" (pixel chiari e poco colorati) nel riquadro: bracciate che rompono la superficie
export function schiumaRiquadro(img, stato) {
  const f = fascia(stato, stato.x)
  // larghezza almeno quanto la corsia è alta: le bracciate escono anche fuori da un riquadro stretto sulla testa
  // (non di più: più largo entrano gli schizzi dei vicini e la subacquea non si riconosce più)
  const mezza = Math.max(stato.bw, f.H) * 0.75
  const xa = Math.max(0, Math.round(stato.x - mezza)), xb = Math.min(img.w - 1, Math.round(stato.x + mezza))
  const ya = Math.max(0, Math.round(f.ya - f.H * 0.1)), yb = Math.min(img.h - 1, Math.round(f.yb + f.H * 0.1))
  let n = 0, s = 0
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
    const i = (y * img.w + x) * 4
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2]
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (max > 195 && max - min < 55) s++
    n++
  }
  return n ? s / n : 0
}
