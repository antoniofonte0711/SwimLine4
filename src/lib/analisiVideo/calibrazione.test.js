import { describe, expect, it } from 'vitest'
import { calibra, LARGHEZZA_CORSIA, riferimentiVasca } from './calibrazione'

// Telecamera finta: vasca (d metri lungo la corsia, y metri di traverso) → pixel, con prospettiva vera
// (i metri lontani occupano meno pixel di quelli vicini)
const G = [[30, 4, 100], [1, -50, 700], [0.02, 0.01, 1]]
function foto(d, y) {
  const w = G[2][0] * d + G[2][1] * y + G[2][2]
  return { x: (G[0][0] * d + G[0][1] * y + G[0][2]) / w, y: (G[1][0] * d + G[1][1] * y + G[1][2]) / w }
}
// rumore riproducibile: il dito non è preciso al pixel
let seme = 7
const rumore = (px) => { seme = (seme * 16807) % 2147483647; return ((seme / 2147483647) - 0.5) * 2 * px }
const tocco = (d, lato, px = 1) => {
  const p = foto(d, lato ? LARGHEZZA_CORSIA : 0)
  return { x: p.x + rumore(px), y: p.y + rumore(px), d, lato }
}
// nuotatore al centro della corsia
const centro = (d) => foto(d, LARGHEZZA_CORSIA / 2)

describe('calibra — prospettiva completa (due lati)', () => {
  const punti = [0, 5, 10, 15, 20, 25].flatMap((d) => [tocco(d, 0), tocco(d, 1)])
  const c = calibra(punti)

  it('usa il piano e la misura è precisa anche al centro della corsia', () => {
    expect(c.ok).toBe(true)
    expect(c.metodo).toBe('piano')
    for (const d of [2.5, 7.3, 12.5, 18.9, 24]) {
      const p = centro(d)
      expect(Math.abs(c.metri(p.x, p.y) - d)).toBeLessThan(0.1)
    }
  })
  it('affidabilità alta, errore medio piccolo, nessuno scarto', () => {
    expect(c.affidabilita).toBe('alta')
    expect(c.rms).toBeLessThan(0.15)
    expect(c.scarti).toEqual([])
    expect(c.intervallo).toEqual([0, 25])
  })
  it('pixel() è l\'inverso di metri()', () => {
    const q = c.pixel(12, LARGHEZZA_CORSIA / 2)
    expect(Math.abs(c.metri(q.x, q.y) - 12)).toBeLessThan(1e-6)
  })
})

describe('calibra — un tocco sbagliato viene scartato', () => {
  const punti = [0, 5, 10, 15, 20, 25].flatMap((d) => [tocco(d, 0), tocco(d, 1)])
  punti[4] = { ...punti[4], d: 15 } // distanza scritta male: era 10
  const c = calibra(punti)
  it('lo riconosce, lo scarta e la scala resta giusta', () => {
    expect(c.ok).toBe(true)
    expect(c.scarti).toEqual([4])
    expect(c.avvisi[0]).toMatch(/punto 5/)
    const p = centro(12.5)
    expect(Math.abs(c.metri(p.x, p.y) - 12.5)).toBeLessThan(0.1)
  })
})

describe('calibra — un solo lato', () => {
  const punti = [0, 5, 10, 15, 20, 25].map((d) => tocco(d, 0))
  const c = calibra(punti)
  it('usa la prospettiva lungo la fila: esatta sulla fila, affidabilità al massimo media', () => {
    expect(c.metodo).toBe('linea')
    expect(c.affidabilita).toBe('media')
    const p = foto(12.5, 0)
    expect(Math.abs(c.metri(p.x, p.y) - 12.5)).toBeLessThan(0.1)
    expect(c.avvisi.join(' ')).toMatch(/altro lato/)
  })
  it('con i punti dell\'altro lato troppo pochi li ignora senza dichiararli sbagliati', () => {
    const c2 = calibra([...punti, tocco(10, 1)])
    expect(c2.metodo).toBe('linea')
    expect(c2.scarti).toEqual([])
    expect(c2.errori[6]).toBeNull()
  })
})

describe('calibra — due punti (ultima spiaggia)', () => {
  const c = calibra([tocco(0, 0, 0), tocco(25, 0, 0)])
  it('funziona ma con affidabilità bassa e avviso', () => {
    expect(c.ok).toBe(true)
    expect(c.metodo).toBe('due-punti')
    expect(c.affidabilita).toBe('bassa')
    expect(c.avvisi.join(' ')).toMatch(/prospettiva/)
  })
  it('in prospettiva sbaglia davvero: per questo è l\'ultima spiaggia', () => {
    const p = foto(12.5, 0)
    // con questa telecamera a metà vasca l'errore supera i 2 metri (20%)
    expect(Math.abs(c.metri(p.x, p.y) - 12.5)).toBeGreaterThan(2)
  })
})

describe('calibra — senza punti in più non si può controllare', () => {
  const c = calibra([tocco(0, 0), tocco(15, 0), tocco(0, 1), tocco(15, 1)])
  it('4 punti esatti: piano ma affidabilità media e invito ad aggiungerne', () => {
    expect(c.metodo).toBe('piano')
    expect(c.affidabilita).toBe('media')
    expect(c.rms).toBeNull()
    expect(c.avvisi.join(' ')).toMatch(/punto in più/)
  })
})

describe('calibra — casi non risolvibili', () => {
  it('meno di 2 punti', () => {
    expect(calibra([tocco(0, 0)])).toMatchObject({ ok: false })
    expect(calibra([])).toMatchObject({ ok: false })
  })
  it('tutte le distanze uguali', () => {
    expect(calibra([tocco(5, 0), tocco(5, 1), tocco(5, 0)]).errore).toMatch(/stessa distanza/)
  })
})

describe('riferimentiVasca', () => {
  it('cambi di colore dei galleggianti', () => {
    expect(riferimentiVasca(25)).toEqual([0, 5, 10, 15, 20, 25])
    expect(riferimentiVasca(50)).toEqual([0, 5, 15, 25, 35, 45, 50])
  })
})
