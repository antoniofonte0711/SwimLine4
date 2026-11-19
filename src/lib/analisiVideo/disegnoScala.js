// Disegno di controllo della scala sopra il video: i punti toccati e, se la scala è calcolata,
// i metri ricostruiti (file della corsia e linee ogni 5 m). Se le linee disegnate cadono sui segni veri
// della vasca, la scala è giusta: il coach lo vede a colpo d'occhio.
import { LARGHEZZA_CORSIA } from './calibrazione'

export const COLORI_LATO = ['#f59e0b', '#22d3ee']
const ROSSO = '#ef4444'
const FONT = '"Bricolage Grotesque", Figtree, system-ui, sans-serif'

function testo(ctx, t, x, y, colore = '#fff') {
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(0,0,0,0.75)'
  ctx.strokeText(t, x, y)
  ctx.fillStyle = colore
  ctx.fillText(t, x, y)
}

// r = rettangolo del video sullo schermo; vw = larghezza del video in pixel; vasca = 25 | 50
export function disegnaScala(ctx, r, vw, punti, ris, vasca) {
  const k = r.w / vw
  const S = (p) => (p ? { x: r.x + p.x * k, y: r.y + p.y * k } : null)
  // punti assurdi (vicino all'orizzonte) non si disegnano: le linee schizzerebbero all'infinito
  const dentro = (q) => q && q.x > r.x - r.w && q.x < r.x + 2 * r.w && q.y > r.y - r.h && q.y < r.y + 2 * r.h

  ctx.save()
  ctx.font = `700 12px ${FONT}`
  ctx.textBaseline = 'middle'

  if (ris?.ok) {
    const da = Math.min(0, ris.intervallo[0])
    const a = Math.max(vasca, ris.intervallo[1])
    const linea = (punto) => {
      ctx.beginPath()
      let aperta = false
      for (let d = da; d <= a + 1e-9; d += 0.5) {
        const q = S(punto(d))
        if (!dentro(q)) { aperta = false; continue }
        if (aperta) ctx.lineTo(q.x, q.y)
        else { ctx.moveTo(q.x, q.y); aperta = true }
      }
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 5])
    if (ris.metodo === 'piano') {
      linea((d) => ris.pixel(d, 0))
      linea((d) => ris.pixel(d, LARGHEZZA_CORSIA))
    } else linea((d) => ris.pixel(d))
    ctx.setLineDash([])

    for (let d = Math.ceil(da / 5) * 5; d <= a + 1e-9; d += 5) {
      let p1, p2, pt
      if (ris.metodo === 'piano') {
        p1 = S(ris.pixel(d, 0))
        p2 = S(ris.pixel(d, LARGHEZZA_CORSIA))
        // la scritta va fuori dalla corsia, oltre la fila 2: così non copre i punti toccati
        pt = S(ris.pixel(d, LARGHEZZA_CORSIA * 1.45))
      } else {
        // trattino perpendicolare alla fila
        const c = S(ris.pixel(d))
        const c2 = S(ris.pixel(d + 0.5))
        if (c && c2) {
          const lx = c2.x - c.x, ly = c2.y - c.y
          const l = Math.hypot(lx, ly) || 1
          p1 = { x: c.x - (ly / l) * 12, y: c.y + (lx / l) * 12 }
          p2 = { x: c.x + (ly / l) * 12, y: c.y - (lx / l) * 12 }
          pt = { x: c.x + (ly / l) * 30, y: c.y - (lx / l) * 30 }
        }
      }
      if (!dentro(p1) || !dentro(p2)) continue
      ctx.strokeStyle = d % 25 === 0 ? '#ffffff' : 'rgba(255,255,255,0.8)'
      ctx.lineWidth = d % 25 === 0 ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
      if (dentro(pt)) {
        ctx.textAlign = 'center'
        testo(ctx, `${d} m`, pt.x, pt.y)
        ctx.textAlign = 'left'
      }
    }
  }

  punti.forEach((p, i) => {
    const q = S(p)
    const scartato = ris?.ok && ris.scarti.includes(i)
    const colore = scartato ? ROSSO : COLORI_LATO[p.lato ? 1 : 0]
    ctx.beginPath()
    ctx.arc(q.x, q.y, 9, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = colore
    ctx.stroke()
    // mirino: il centro preciso del tocco
    ctx.beginPath()
    ctx.moveTo(q.x - 4, q.y); ctx.lineTo(q.x + 4, q.y)
    ctx.moveTo(q.x, q.y - 4); ctx.lineTo(q.x, q.y + 4)
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    // solo il numero del punto (la distanza si legge sulle linee dei metri o toccando il punto)
    testo(ctx, `${i + 1}${scartato ? ' ✗' : ''}`, q.x + 11, q.y - 11, colore)
  })
  ctx.restore()
}
