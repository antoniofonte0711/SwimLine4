/* global process */
// Geometria della ripresa dalla testata fotogramma per fotogramma (ogni 0,25 s): riga dei 5 m, della T, punto di fuga
import { unFotogramma } from './fotogramma.js'
import { geometriaFotogramma, xRetta } from '../../src/lib/analisiVideo/testata.js'
const [video, px, py, da = 0, a = 11.5] = process.argv.slice(2).filter((x) => x !== '--')
let punto = { x: Number(px), y: Number(py) }
for (let t = Number(da); t <= Number(a); t += 0.25) {
  const img = await unFotogramma(video, t)
  const g = geometriaFotogramma(img, punto)
  const f = (v) => (v === null || v === undefined ? '  —' : String(Math.round(v)).padStart(4))
  console.log(`${t.toFixed(2).padStart(5)} s  y5 ${f(g.y5)}  yT ${f(g.yT)}  fuga y ${f(g.fuga?.y)}  sx ${g.corde.sx ? f(xRetta(g.corde.sx, punto.y)) : '  —'} dx ${g.corde.dx ? f(xRetta(g.corde.dx, punto.y)) : '  —'}`)
  // il punto di riferimento segue il centro della corsia
  if (g.corde.sx && g.corde.dx) punto = { x: (xRetta(g.corde.sx, punto.y) + xRetta(g.corde.dx, punto.y)) / 2, y: punto.y }
}
