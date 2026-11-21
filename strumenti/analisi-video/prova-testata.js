/* global process, Buffer */
// Prova del motore per la ripresa dalla TESTATA della vasca, fuori dal browser.
// Uso: npx vite-node strumenti/analisi-video/prova-testata.js -- <video> --tap X,Y [--da s] [--a s]
import { spawn } from 'node:child_process'
import { FFMPEG, info } from './fotogramma.js'
import { MotoreTestata, taraTestata, campioniInMetri } from '../../src/lib/analisiVideo/testata.js'
import { calcolaSerie } from '../../src/lib/analisiVideo/serie.js'
import { LARGHEZZA_ANALISI } from '../../src/lib/analisiVideo/estrazione.js'

const args = process.argv.slice(2).filter((a) => a !== '--')
const video = args[0]
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d }
const da = Number(opt('da', 0)), a = opt('a') ? Number(opt('a')) : null
const [tx, ty] = opt('tap').split(',').map(Number)
const { W, H, fps } = await info(video)
const w = Math.min(W, LARGHEZZA_ANALISI), h = Math.round((H * w) / W) & ~1
const fattore = W / w
const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-ss', String(da), ...(a ? ['-to', String(a)] : []), '-i', video,
  '-vf', `scale=${w}:${h}`, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgba', '-'], { stdio: ['ignore', 'pipe', 'inherit'] })
const dim = w * h * 4
let buf = Buffer.alloc(0), n = 0, motore = null, esito = null, ms = 0
for await (const pezzo of ff.stdout) {
  buf = Buffer.concat([buf, pezzo])
  while (buf.length >= dim) {
    const data = new Uint8ClampedArray(buf.buffer.slice(buf.byteOffset, buf.byteOffset + dim))
    buf = buf.subarray(dim)
    const img = { w, h, data }, t = da + n / fps
    const s0 = performance.now()
    if (!motore) { motore = new MotoreTestata({ w, h }); esito = motore.inizia(img, t, { x: tx / fattore, y: ty / fattore }) }
    else motore.passo(img, t)
    ms += performance.now() - s0
    n++
  }
}
const c = motore.campioni
const tara = taraTestata(c)
console.log(`${n} fotogrammi, motore ${(ms / n).toFixed(1)} ms/fotogramma; corsia ${esito.corsieTrovate}, riferimenti ${esito.riferimenti}; seguito ${(100 * c.filter((x) => x.trovato).length / n).toFixed(0)}%`)
console.log('taratura:', tara && `A ${tara.A.toFixed(0)} B ${tara.B.toFixed(2)} yv ${tara.yv.toFixed(0)} y5 ${tara.y5.toFixed(0)} yT ${tara.yT?.toFixed(0)} (${tara.qualita})`)
const f2 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? '   —' : x.toFixed(2).padStart(5))
const cm = campioniInMetri(c, tara)
const serie = calcolaSerie(cm, { mpp: 1, qualitaScala: tara?.qualita || 'bassa', camera: 'movimento', stile: opt('stile', 'crawl'), fattore, testata: true })
for (let i = 0; i < c.length; i += Math.round(fps / 4)) {
  console.log(`${c[i].t.toFixed(2).padStart(5)} s  y ${c[i].y === null ? '  —' : String(Math.round(c[i].y)).padStart(4)}  d ${f2(cm[i].u)} m  liscia ${f2(serie.m[i])}  ist ${f2(serie.v[i])} m/s  media ${f2(serie.media[i])}  ${serie.aff[i]}`)
}
