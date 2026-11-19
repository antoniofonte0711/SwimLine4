import { describe, it, expect } from 'vitest'
import { mappaCaldo } from './immagine'

const ACQUA = [40, 120, 150]
const PELLE = [215, 150, 120]
const SCIA = [215, 235, 245]

function fotogramma(w, h, rettangoli) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let p = 0; p < w * h; p++) data.set([...ACQUA, 255], p * 4)
  for (const { x0, x1, y0, y1, c } of rettangoli) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) data.set([...c, 255], (y * w + x) * 4)
  }
  return { w, h, data }
}
describe('mappaCaldo', () => {
  it('pelle calda, acqua e schiuma a zero', () => {
    const img = fotogramma(3, 1, [{ x0: 1, x1: 1, y0: 0, y1: 0, c: PELLE }, { x0: 2, x1: 2, y0: 0, y1: 0, c: SCIA }])
    const c = mappaCaldo(img, ACQUA)
    expect(c[0]).toBe(0)
    expect(c[1]).toBeGreaterThan(0.5)
    expect(c[2]).toBe(0)
  })
})
