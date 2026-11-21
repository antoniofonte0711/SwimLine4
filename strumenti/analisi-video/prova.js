/* global process, Buffer */
// Prova dell'analisi video FUORI dal browser, sullo stesso motore dell'app (stessi file di src/lib/analisiVideo).
// Serve per verificare in pochi secondi media e istantanea su un video vero e per misurare quanto è veloce.
// Uso:
//   npx vite-node strumenti/analisi-video/prova.js -- <video> --tap X,Y [--da 0.5] [--a 9] [--camera movimento]
//        [--stile crawl] [--vasca 25] [--cron T1:D1,T2:D2] [--csv uscita.csv]
//   X,Y = punto del nuotatore in pixel del video ORIGINALE al tempo --da.
//   --cron = cronometro: due momenti (s) e distanze dalla parete (m), es. 1.2:5,7.9:20
// L'ffmpeg è quello di Remotion (video/node_modules), già sul PC: niente da installare.
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { MotoreAnalisi } from '../../src/lib/analisiVideo/motore.js'
import { scegliScala } from '../../src/lib/analisiVideo/analisi.js'
import { calcolaSerie } from '../../src/lib/analisiVideo/serie.js'
import { LARGHEZZA_ANALISI } from '../../src/lib/analisiVideo/estrazione.js'
import { posizioneInVasca, metroInVasca } from '../../src/lib/analisiVideo/zone.js'

const args = process.argv.slice(2).filter((a) => a !== '--')
const video = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'))
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d }
if (!video || !opt('tap')) { console.error('Uso: prova.js <video> --tap X,Y [--da s] [--a s] [--camera ferma|movimento] [--stile crawl] [--cron T1:D1,T2:D2]'); process.exit(1) }

const radice = path.resolve(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..')
const candidati = [
  path.resolve(radice, 'video/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'),
  path.resolve(radice, '../../../video/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'), // da un worktree
]
const FFMPEG = process.env.FFMPEG || candidati.find(existsSync)
if (!FFMPEG) { console.error('ffmpeg non trovato (imposta FFMPEG=...)'); process.exit(1) }

const da = Number(opt('da', 0)), a = opt('a') ? Number(opt('a')) : null
const ruota = args.includes('--ruota')
const camera = opt('camera', 'movimento'), stile = opt('stile', 'crawl'), vasca = Number(opt('vasca', 25))
const [tx, ty] = opt('tap').split(',').map(Number)
const cron = opt('cron') ? (() => { const [p, q] = opt('cron').split(',').map((s) => s.split(':').map(Number)); return { a: { t: p[0], d: p[1] }, b: { t: q[0], d: q[1] } } })() : null

// dimensioni originali e fps
function info() {
  return new Promise((ok) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-i', video]); let s = ''
    p.stderr.on('data', (d) => { s += d }); p.on('close', () => {
      const m = s.match(/Video:.*?(\d{2,5})x(\d{2,5})/); const f = s.match(/([\d.]+) fps/)
      ok({ W: Number(m[1]), H: Number(m[2]), fps: f ? Number(f[1]) : 30 })
    })
  })
}

const { W, H, fps } = await info()
const w = Math.min(W, LARGHEZZA_ANALISI), h = Math.round((H * w) / W) & ~1
const fattore = W / w
const filtri = [`scale=${w}:${h}`]
const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-ss', String(da), ...(a ? ['-to', String(a)] : []), '-i', video,
  '-vf', filtri.join(','), '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgba', '-'], { stdio: ['ignore', 'pipe', 'inherit'] })

const dim = w * h * 4
let buf = Buffer.alloc(0), n = 0, motore = null, esito = null, msMotore = 0
const t0 = performance.now()
for await (const pezzo of ff.stdout) {
  buf = Buffer.concat([buf, pezzo])
  while (buf.length >= dim) {
    const data = new Uint8ClampedArray(buf.buffer.slice(buf.byteOffset, buf.byteOffset + dim))
    buf = buf.subarray(dim)
    let img = { w, h, data }
    // --ruota: video ripreso dalla testata (corsia verticale) girato di 90° → corsia orizzontale
    if (ruota) {
      const r = new Uint8ClampedArray(dim)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, o = (x * h + (h - 1 - y)) * 4
        r[o] = data[i]; r[o + 1] = data[i + 1]; r[o + 2] = data[i + 2]; r[o + 3] = 255
      }
      img = { w: h, h: w, data: r }
    }
    const t = da + n / fps
    const s = performance.now()
    if (!motore) { motore = new MotoreAnalisi({ w: img.w, h: img.h, camera }); esito = motore.inizia(img, t, ruota ? { x: h - 1 - ty / fattore, y: tx / fattore } : { x: tx / fattore, y: ty / fattore }) }
    else motore.passo(img, t)
    msMotore += performance.now() - s
    n++
  }
}
const totale = performance.now() - t0
const scala = scegliScala({ camera, calib: null, mppCalib: null, voti: motore.voti, vasca })
const serie = calcolaSerie(motore.campioni, { mpp: scala?.mpp || null, qualitaScala: scala?.qualita || 'bassa', calib: null, fattore, camera, stile, cronometro: cron })
const c = motore.campioni
const f2 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(2))
const vs = serie.v.filter((x) => x !== null)
console.log(`video ${W}x${H} @${fps} fps → analisi ${w}x${h}, ${n} fotogrammi`)
console.log(`tempo: ${(totale / 1000).toFixed(1)} s totali, motore ${(msMotore / n).toFixed(1)} ms/fotogramma (${(1000 / (msMotore / n)).toFixed(0)} fps)`)
console.log(`corsie trovate: ${esito.corsieTrovate}, passo: ${esito.passoTrovato}, nuotatore seguito: ${(100 * c.filter((x) => x.trovato).length / c.length).toFixed(0)}%`)
console.log(`scala: ${scala ? `${scala.fonte} ${scala.qualita} ${scala.mpp.toFixed(4)} m/dischetto` : 'nessuna'}`)
if (serie.riepilogo) console.log(`riepilogo: ${f2(serie.riepilogo.distanza)} m in ${f2(serie.riepilogo.tempo)} s → media ${f2(serie.riepilogo.media)} m/s`)
if (serie.cronometro) console.log('cronometro:', serie.cronometro.ok ? `media ${f2(serie.cronometro.media)} m/s, k ${f2(serie.cronometro.k)}${Number.isFinite(serie.cronometro.erroreScala) ? `, scala sbagliava del ${(serie.cronometro.erroreScala * 100).toFixed(0)}%` : ''}` : serie.cronometro.motivo)
console.log(`istantanea: copertura ${(100 * vs.length / serie.t.length).toFixed(0)}%, min ${f2(Math.min(...vs))} max ${f2(Math.max(...vs))}`)
console.log(`affidabilità: ${['alta', 'media', 'bassa'].map((k) => `${k} ${serie.aff.filter((x) => x === k).length}`).join(', ')}; punti dubbi ${serie.puntiDubbi.length}`)
// andamento ogni mezzo secondo
let righe = []
for (let i = 0; i < serie.t.length; i++) {
  if (i % Math.round(fps / 2)) continue
  righe.push(`${serie.t[i].toFixed(1).padStart(5)} s  x ${c[i].x === null ? '   —' : String(Math.round(c[i].x * fattore)).padStart(4)}  pos ${f2(serie.m[i]).padStart(6)}  ist ${f2(serie.v[i])}  media ${f2(serie.media[i])}  ${serie.aff[i]}`)
}
console.log(righe.join('\n'))
if (opt('csv')) {
  writeFileSync(opt('csv'), 't,x,y,trovato,conf,u,pos,ist,media,aff\n' + serie.t.map((t, i) => [t.toFixed(3), c[i].x, c[i].y, c[i].trovato, c[i].conf?.toFixed?.(2), c[i].u, serie.m[i], serie.v[i], serie.media[i], serie.aff[i]].join(',')).join('\n'))
}
// disegno dei galleggianti raccolto lungo la corsia (una lettera per mezzo dischetto, colore prevalente)
if (args.includes('--disegno')) {
  const L = ['R', 'G', 'V', 'B', 'w', '.']
  motore.voti.forEach((v, cat) => {
    if (!v || !v.size) return
    const k = [...v.keys()].sort((p, q) => p - q)
    let s = ''
    for (let i = k[0]; i <= k[k.length - 1]; i++) {
      const c = v.get(i)
      if (!c) { s += ' '; continue }
      const tot = c.reduce((a, b) => a + b, 0)
      let best = 0; for (let j = 1; j < c.length; j++) if (c[j] > c[best]) best = j
      s += tot < 3 ? '?' : L[best]
    }
    console.log(`catena ${cat}: da u=${(k[0] / 2).toFixed(1)} a u=${(k[k.length - 1] / 2).toFixed(1)} dischetti (${k.length} mezzi)`)
    for (let i = 0; i < s.length; i += 100) console.log('  ' + s.slice(i, i + 100))
  })
}

// posizione nella vasca capita dal video (zone di fine vasca)
{
  const pos = posizioneInVasca({ campioni: motore.campioni, voti: motore.voti, vasca })
  console.log('zone:', pos.cambi.map((c) => `u=${c.u.toFixed(1)} forza ${c.forza.toFixed(2)}`).join(' | ') || 'nessun cambio')
  console.log(`scala zone: ${pos.fonte} ${pos.qualita} ${pos.mpp.toFixed(4)} m/dischetto; ancora ${pos.ancora ? JSON.stringify(pos.ancora) : 'nessuna'}`)
  const us = motore.campioni.filter((c) => c.catena === pos.catena && c.u !== null)
  if (us.length) console.log(`tratto: dal metro ${f2(metroInVasca(pos, us[0].u))} al metro ${f2(metroInVasca(pos, us[us.length - 1].u))}`)
  if (opt('salva-voti')) writeFileSync(opt('salva-voti'), JSON.stringify(motore.voti.map((v) => (v ? [...v].map(([k, c]) => [k, [...c]]) : null))))
}
