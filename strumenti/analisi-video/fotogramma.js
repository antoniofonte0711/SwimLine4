/* global process, Buffer */
// Legge UN fotogramma di un video come { w, h, data } RGBA (con l'ffmpeg di Remotion). Per le prove.
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const radice = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..')
export const FFMPEG = process.env.FFMPEG || [
  path.resolve(radice, 'video/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'),
  path.resolve(radice, '../../../video/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'),
].find(existsSync)

export const FFPROBE = FFMPEG && path.join(path.dirname(FFMPEG), path.basename(FFMPEG).replace(/ffmpeg/i, 'ffprobe'))

// Tempi VERI di ogni fotogramma (i video dei telefoni possono avere fotogrammi a intervalli irregolari:
// contare "n / fps" sbaglia i secondi). Sono gli stessi tempi che il browser dà all'app.
export function tempiFotogrammi(video) {
  return new Promise((ok, ko) => {
    const p = spawn(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=pts_time,best_effort_timestamp_time', '-of', 'csv=p=0', video])
    let s = ''
    p.stdout.on('data', (d) => { s += d })
    p.on('close', (code) => {
      if (code) return ko(new Error('ffprobe non riesce a leggere ' + video))
      ok(s.trim().split(/\r?\n/).map((r) => { const [a, b] = r.split(','); const x = Number(a); return Number.isFinite(x) ? x : Number(b) }).filter(Number.isFinite))
    })
  })
}

export function info(video) {
  return new Promise((ok) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-i', video]); let s = ''
    p.stderr.on('data', (d) => { s += d }); p.on('close', () => {
      const m = s.match(/Video:.*?(\d{2,5})x(\d{2,5})/); const f = s.match(/([\d.]+) fps/)
      ok({ W: Number(m[1]), H: Number(m[2]), fps: f ? Number(f[1]) : 30 })
    })
  })
}

export async function unFotogramma(video, t, larghezza = 960) {
  const { W, H } = await info(video)
  const w = Math.min(W, larghezza), h = Math.round((H * w) / W) & ~1
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', video, '-frames:v', '1',
    '-vf', `scale=${w}:${h}`, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgba', '-'])
  const pezzi = []
  for await (const c of p.stdout) pezzi.push(c)
  const buf = Buffer.concat(pezzi)
  return { w, h, data: new Uint8ClampedArray(buf.buffer, buf.byteOffset, w * h * 4) }
}

// salva un'immagine RGBA come BMP (per guardarla durante le prove)
export function salvaBmp(file, { w, h, data }) {
  const row = Math.ceil((w * 3) / 4) * 4, size = 54 + row * h
  const b = Buffer.alloc(size)
  b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14)
  b.writeInt32LE(w, 18); b.writeInt32LE(h, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(row * h, 34)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, o = 54 + (h - 1 - y) * row + x * 3
    b[o] = data[i + 2]; b[o + 1] = data[i + 1]; b[o + 2] = data[i]
  }
  writeFileSync(file, b)
}
