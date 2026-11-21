// Riquadri disegnati sopra il video: SOLO velocità istantanea (grande) e velocità media (piccolo), in basso a
// destra (scelta del coach, 21/11/2026: niente ciclo né fase, interessano solo le due velocità).
// Un solo disegno per tre usi: schermo, screenshot e (in futuro) video scaricato, così non divergono mai.
//
// dati = {
//   istantanea: m/s | null      null = nessun numero affidabile: si mostra "—", mai un valore inventato
//   media: m/s | null
//   ciclo: m/s | null | undefined   media dell'ultimo ciclo (solo delfino e rana; undefined = non mostrare)
//   fase: 'subacquea' | 'superficie' | null
//   affidabilita: 'alta' | 'media' | 'bassa' | null
// }

const DISPLAY = '"Bricolage Grotesque", Figtree, system-ui, sans-serif'

// Colore della barretta a sinistra dei riquadri: dice quanto fidarsi del numero
export const COLORI_AFFIDABILITA = {
  alta: '#22c55e',
  media: '#f59e0b',
  bassa: '#ef4444',
}
const GRIGIO = '#94a3b8'

export const COLORI_FASE = {
  subacquea: '#06b6d4',
  superficie: '#2563eb',
}
export const NOMI_FASE = { subacquea: 'Subacquea', superficie: 'Superficie' }

// 1.6234 -> "1,62"; niente numero -> "—"
export function scriviVelocita(v) {
  return Number.isFinite(v) && v >= 0 ? v.toFixed(2).replace('.', ',') : '—'
}

// Rettangolo occupato davvero dal video dentro il suo contenitore (object-fit: contain, con le bande nere)
export function rettangoloVideo(contW, contH, videoW, videoH) {
  if (!contW || !contH || !videoW || !videoH) return { x: 0, y: 0, w: contW || 0, h: contH || 0 }
  const s = Math.min(contW / videoW, contH / videoH)
  const w = videoW * s
  const h = videoH * s
  return { x: (contW - w) / 2, y: (contH - h) / 2, w, h }
}

function rettangoloTondo(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function riquadro(ctx, { x, y, w, h, u, etichetta, valore, colore, grande }) {
  ctx.save()
  rettangoloTondo(ctx, x, y, w, h, 12 * u)
  ctx.fillStyle = 'rgba(10, 26, 47, 0.74)'
  ctx.fill()
  // barretta dell'affidabilità
  rettangoloTondo(ctx, x + 6 * u, y + 8 * u, 4 * u, h - 16 * u, 2 * u)
  ctx.fillStyle = colore
  ctx.fill()

  const sx = x + 18 * u
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = `700 ${(grande ? 12 : 11) * u}px ${DISPLAY}`
  ctx.fillText(etichetta.toUpperCase(), sx, y + (grande ? 20 : 18) * u)

  const g = (grande ? 36 : 24) * u
  const base = y + h - (grande ? 13 : 11) * u
  ctx.fillStyle = valore === '—' ? GRIGIO : '#ffffff'
  ctx.font = `800 ${g}px ${DISPLAY}`
  ctx.fillText(valore, sx, base)
  if (valore !== '—') {
    const wv = ctx.measureText(valore).width
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.font = `700 ${(grande ? 14 : 11) * u}px ${DISPLAY}`
    ctx.fillText('m/s', sx + wv + 5 * u, base)
  }
  ctx.restore()
}

// Disegna i riquadri nel rettangolo del video r = {x, y, w, h}.
// margineBasso: spazio da lasciare libero in fondo (sullo schermo ci sono i comandi)
export function disegnaRiquadri(ctx, r, dati = {}, { margineBasso = 0 } = {}) {
  // unità: i riquadri crescono con il video ma restano leggibili anche su un telefono piccolo
  // (massimo 1,5: su un PC grande riquadri più grossi coprirebbero la vasca)
  const u = Math.min(Math.max(Math.min(r.w, r.h) / 380, 0.75), 1.5)
  const pad = 12 * u
  const colore = COLORI_AFFIDABILITA[dati.affidabilita] || GRIGIO

  const gw = 158 * u
  const gh = 80 * u
  const pw = 108 * u
  const ph = 58 * u
  const fondo = r.y + r.h - pad - margineBasso
  const gx = r.x + r.w - pad - gw
  const gy = fondo - gh
  const px = gx - 8 * u - pw
  const py = fondo - ph

  riquadro(ctx, { x: px, y: py, w: pw, h: ph, u, etichetta: 'Media', valore: scriviVelocita(dati.media), colore, grande: false })
  riquadro(ctx, { x: gx, y: gy, w: gw, h: gh, u, etichetta: 'Velocità', valore: scriviVelocita(dati.istantanea), colore, grande: true })
}

// Riquadro attorno al nuotatore seguito (per controllare che l'app segua quello giusto).
// c = campione del motore (pixel di analisi), k = pixel dello schermo per pixel di analisi
export function disegnaInseguimento(ctx, r, k, c, affidabilita) {
  if (!c) return
  const x = r.x + (c.trovato ? c.x : c.xPrevisto) * k
  const yy = c.y ?? null
  const altezza = c.sopra && c.sotto
    ? Math.abs((c.sotto.a + c.sotto.b * ((c.x ?? c.xPrevisto) - c.sotto.xc)) - (c.sopra.a + c.sopra.b * ((c.x ?? c.xPrevisto) - c.sopra.xc)))
    : c.bw * 0.6
  let y = r.y + (yy ?? (c.sopra && c.sotto ? (c.sopra.a + c.sotto.a) / 2 : 0)) * k
  const bw = c.bw * k
  let bh = altezza * 0.8 * k
  // ripresa dalla testata: il corpo è "in piedi" nell'immagine, il riquadro va dalla testa ai piedi
  if (c.trovato && Number.isFinite(c.alto) && Number.isFinite(c.basso)) {
    y = r.y + ((c.alto + c.basso) / 2) * k
    bh = Math.max(20, (c.basso - c.alto) * k)
  }
  ctx.save()
  ctx.lineWidth = 2
  ctx.setLineDash(c.trovato ? [] : [6, 5])
  ctx.strokeStyle = c.trovato ? (COLORI_AFFIDABILITA[affidabilita] || '#ffffff') : 'rgba(255,255,255,0.6)'
  rettangoloTondo(ctx, x - bw / 2, y - bh / 2, bw, bh, 8)
  ctx.stroke()
  if (!c.trovato) {
    ctx.font = `700 12px ${DISPLAY}`
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.textAlign = 'center'
    ctx.fillText('lo sto cercando…', x, y - bh / 2 - 6)
  }
  ctx.restore()
}
