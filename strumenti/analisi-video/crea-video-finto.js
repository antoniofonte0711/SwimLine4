/* global process, Buffer */
// Crea un file MP4 dal video finto dalla testata (virata). Uso: … crea-video-finto.js -- <uscita.mp4>
import { spawn } from 'node:child_process'
import { FFMPEG } from './fotogramma.js'
import { creaScenaTestata, percorsi } from '../../src/lib/analisiVideo/sinteticoTestata.js'
const out = process.argv.slice(2).filter((a) => a !== '--')[0]
const s = creaScenaTestata({ posizione: percorsi.virata(7, 1.1), tremolio: 1, seme: 5 })
console.log('tocco a t=0:', JSON.stringify(s.puntoNuotatore(0)))
function bmp({ w, h, data }) {
  const row = Math.ceil((w * 3) / 4) * 4, size = 54 + row * h, b = Buffer.alloc(size)
  b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14)
  b.writeInt32LE(w, 18); b.writeInt32LE(h, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(row * h, 34)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, o = 54 + (h - 1 - y) * row + x * 3; b[o] = data[i + 2]; b[o + 1] = data[i + 1]; b[o + 2] = data[i] }
  return b
}
const p = spawn(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'bmp', '-framerate', '30', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', out], { stdio: ['pipe', 'inherit', 'inherit'] })
for (let i = 0; i <= 9 * 30; i++) { if (!p.stdin.write(bmp(s.fotogramma(i / 30)))) await new Promise((r) => p.stdin.once('drain', r)) }
p.stdin.end()
await new Promise((r) => p.on('close', r))
console.log('fatto')
