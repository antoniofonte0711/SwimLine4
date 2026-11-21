/* global process */
// Dice se un video è ripreso dalla testata o di lato (sul fotogramma al tempo t, punto toccato X,Y in pixel del video)
import { unFotogramma, info } from './fotogramma.js'
import { eRipresaDallaTestata } from '../../src/lib/analisiVideo/testata.js'
const [video, t, x, y] = process.argv.slice(2).filter((a) => a !== '--')
const { W } = await info(video)
const img = await unFotogramma(video, Number(t))
const k = W / img.w
const r = eRipresaDallaTestata(img, { x: Number(x) / k, y: Number(y) / k })
console.log(r.testata ? 'TESTATA' : 'DI LATO', JSON.stringify({ sx: r.g.corde.sx, dx: r.g.corde.dx, fuga: r.g.fuga }))
