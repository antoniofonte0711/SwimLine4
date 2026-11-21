import { describe, expect, it } from 'vitest'
import { mappaDistanza, puntoDiFuga, cambiLungoCorda, retteCorde, cordeCorsia, xRetta, campioniInMetri, taraTestata } from './testata'
import { calcolaSerie } from './serie'

describe('ripresa dalla testata — prospettiva', () => {
  it('d(y) = A/(y−yv)+B passa per i riferimenti (valori del video WhatsApp 19.01.34)', () => {
    const m = mappaDistanza(-42, [{ y: 212, d: 5 }, { y: 601, d: 2 }])
    expect(m.metri(212)).toBeCloseTo(5, 5)
    expect(m.metri(601)).toBeCloseTo(2, 5)
    // controllo indipendente: una coppia di dischetti (0,145 m) vicino alla T occupa ~45 px
    const pxCoppia = 0.145 / (m.A / (580 + 42) ** 2)
    expect(pxCoppia).toBeGreaterThan(38)
    expect(pxCoppia).toBeLessThan(52)
  })

  it('punto di fuga = incrocio delle due corde', () => {
    const sx = { p: 200, q: 0.325 }, dx = { p: 242, q: -0.7 }
    const f = puntoDiFuga(sx, dx)
    expect(xRetta(sx, f.y)).toBeCloseTo(xRetta(dx, f.y), 6)
    expect(f.y).toBeLessThan(0) // sopra l'immagine
  })

  it('trova due corde disegnate e sceglie quelle attorno al nuotatore', () => {
    const w = 200, h = 300
    const mappa = new Uint8Array(w * h)
    const corde = [{ p: 80, q: 0.25 }, { p: 120, q: -0.3 }]
    for (const l of corde) for (let y = 0; y < h; y++) { const x = Math.round(xRetta(l, y)); if (x >= 0 && x < w) mappa[y * w + x] = 3 }
    const rette = retteCorde(mappa, w, h)
    const { sx, dx } = cordeCorsia(rette, { x: 100, y: 200 }, w)
    expect(xRetta(sx, 200)).toBeCloseTo(30, -1)
    expect(xRetta(dx, 200)).toBeCloseTo(180, -1)
  })

  it('cambio di colore lungo la corda: sotto blu (zona dei 5 m), sopra rosso', () => {
    const colori = Array.from({ length: 400 }, (_, y) => (y < 200 ? { y, rosso: 3, blu: 0 } : { y, rosso: 0, blu: 3 }))
    const c = cambiLungoCorda(colori)
    expect(c.length).toBe(1)
    expect(Math.abs(c[0].y - 200)).toBeLessThan(5)
    expect(c[0].salto).toBeGreaterThan(0)
  })

  it('virata: la media è la strada percorsa / tempo, non lo spostamento (che sarebbe ~0)', () => {
    // nuotatore finto a 1 m/s: da 6 m alla parete (a 1 m), poi torna a 6 m. Riferimenti fissi.
    const A = 1250, yv = -42, B = 0
    const yDi = (d) => yv + A / (d - B)
    const campioni = []
    for (let i = 0; i <= 300; i++) {
      const t = i / 30
      const d = t < 5 ? 6 - t : 1 + (t - 5)
      campioni.push({ t, trovato: true, x: 100, y: yDi(d), y5: yDi(5), yT: yDi(2), fugaY: yv, conf: 1, catena: 0 })
    }
    const tara = taraTestata(campioni)
    expect(tara.qualita).toBe('alta')
    const cm = campioniInMetri(campioni, tara)
    expect(cm[0].u).toBeCloseTo(6, 1)
    const s = calcolaSerie(cm, { mpp: 1, qualitaScala: 'alta', camera: 'movimento', stile: 'crawl', fattore: 1, testata: true })
    expect(s.riepilogo.media).toBeGreaterThan(0.85)
    expect(s.riepilogo.media).toBeLessThan(1.05)
    const vMezzo = s.v[60] // t = 2 s
    expect(vMezzo).toBeCloseTo(1, 1)
  })
})
