/* global process */
// Prova della geometria per la ripresa dalla testata su un fotogramma: corde, punto di fuga, cambi di colore.
// Uso: npx vite-node strumenti/analisi-video/geometria-testata.js -- <video> <t> <tapX> <tapY> [uscita.bmp]
import { unFotogramma, salvaBmp } from './fotogramma.js'
import { mappaCordaFotogramma, retteCorde, cordeCorsia, puntoDiFuga, coloriLungoCorda, cambiLungoCorda, xRetta } from '../../src/lib/analisiVideo/testata.js'

const [video, t, tx, ty, uscita] = process.argv.slice(2).filter((a) => a !== '--')
const img = await unFotogramma(video, Number(t))
const { w, h } = img
const mappa = mappaCordaFotogramma(img)
const rette = retteCorde(mappa, w, h)
console.log(`${w}x${h}, pixel corda: ${mappa.reduce((s, x) => s + (x ? 1 : 0), 0)}`)
rette.forEach((l) => console.log(`retta x = ${l.p.toFixed(0)} - ${l.q.toFixed(3)}·y  voti ${l.voti}  (x in cima ${xRetta(l, 0).toFixed(0)}, in fondo ${xRetta(l, h).toFixed(0)})`))
const tap = { x: Number(tx), y: Number(ty) }
const { sx, dx } = cordeCorsia(rette, tap)
console.log('corsia:', sx && `sx ${xRetta(sx, tap.y).toFixed(0)}`, dx && `dx ${xRetta(dx, tap.y).toFixed(0)}`)
const pf = puntoDiFuga(sx, dx)
console.log('punto di fuga:', pf && `x ${pf.x.toFixed(0)} y ${pf.y.toFixed(0)}`)
for (const [nome, l] of [['sx', sx], ['dx', dx]]) {
  if (!l) continue
  const col = coloriLungoCorda(mappa, w, h, l)
  console.log(`cambi ${nome}:`, cambiLungoCorda(col).map((c) => `y ${c.y} (${c.salto > 0 ? 'sotto blu' : 'sotto rosso'} ${c.salto.toFixed(2)})`).join(', '))
  let s = ''
  for (let y = 0; y < h; y += 8) { let r = 0, b = 0; for (let j = y; j < Math.min(h, y + 8); j++) { r += col[j].rosso; b += col[j].blu } s += r + b < 2 ? '.' : b > r ? 'B' : 'R' }
  console.log(`  ${nome} ogni 8 righe dall'alto: ${s}`)
}
if (uscita) {
  const out = { w, h, data: new Uint8ClampedArray(img.data) }
  for (let p = 0; p < w * h; p++) if (mappa[p]) { out.data[p * 4] = mappa[p] === 1 ? 255 : mappa[p] === 3 ? 255 : 0; out.data[p * 4 + 1] = mappa[p] === 3 ? 0 : mappa[p] === 1 ? 255 : 0; out.data[p * 4 + 2] = mappa[p] >= 2 ? 255 : 0 }
  for (const l of rette) for (let y = 0; y < h; y++) { const x = Math.round(xRetta(l, y)); if (x >= 0 && x < w) { const i = (y * w + x) * 4; out.data[i] = 0; out.data[i + 1] = 255; out.data[i + 2] = 0 } }
  salvaBmp(uscita, out)
}
