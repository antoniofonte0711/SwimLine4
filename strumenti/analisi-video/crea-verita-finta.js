/* global process, Buffer */
// Collaudo della "prova del 9": crea video FINTI (MP4, verità nota) con il loro file di verità .json,
// così si controlla che verita.js dia l'errore giusto prima di usarlo sui video veri.
// Uso: npx vite-node strumenti/analisi-video/crea-verita-finta.js -- <cartella di uscita>
// Crea: lato-costante (1,5 m/s), lato-accelera (1,0 → 1,8 m/s), lato-irregolare (fotogrammi a intervalli
// irregolari come certi telefoni), testata-virata.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { FFMPEG } from './fotogramma.js'
import { creaScena, PASSO_STEFANO } from '../../src/lib/analisiVideo/sintetico.js'
import { creaScenaTestata, percorsi, PASSO_COPPIA } from '../../src/lib/analisiVideo/sinteticoTestata.js'

const out = process.argv.slice(2).filter((a) => a !== '--')[0]
if (!out) { console.error('Uso: crea-verita-finta.js <cartella>'); process.exit(1) }
mkdirSync(out, { recursive: true })

function bmp({ w, h, data }) {
  const row = Math.ceil((w * 3) / 4) * 4, size = 54 + row * h, b = Buffer.alloc(size)
  b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14)
  b.writeInt32LE(w, 18); b.writeInt32LE(h, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(row * h, 34)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, o = 54 + (h - 1 - y) * row + x * 3; b[o] = data[i + 2]; b[o + 1] = data[i + 1]; b[o + 2] = data[i] }
  return b
}

// tempi: i momenti (s) dei fotogrammi. Con tempi irregolari: un'immagine per fotogramma e un elenco con la
// durata di ciascuna (concat di ffmpeg), così il video ha esattamente quei tempi.
async function scrivi(file, scena, tempi) {
  const irregolari = tempi.some((t, i) => i && Math.abs(t - tempi[i - 1] - 1 / 30) > 1e-6)
  const codifica = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-bf', '0']
  if (irregolari) {
    const dir = file + '_tmp'
    mkdirSync(dir, { recursive: true })
    let elenco = 'ffconcat version 1.0\n'
    tempi.forEach((t, i) => {
      const nome = `f${String(i).padStart(5, '0')}.bmp`
      writeFileSync(path.join(dir, nome), bmp(scena.fotogramma(t)))
      elenco += `file ${nome}\noption framerate 90000\nduration ${((tempi[i + 1] ?? t + 1 / 30) - t).toFixed(6)}\n`
    })
    writeFileSync(path.join(dir, 'elenco.txt'), elenco)
    const z = spawn(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'elenco.txt'), '-fps_mode', 'passthrough',
      ...codifica, '-video_track_timescale', '90000', file], { stdio: 'inherit' })
    const codice = await new Promise((r) => z.on('close', r))
    if (codice) throw new Error('ffmpeg non è riuscito a creare ' + file)
    rmSync(dir, { recursive: true })
    return
  }
  const p = spawn(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'bmp', '-framerate', '30', '-i', '-',
    ...codifica, file], { stdio: ['pipe', 'inherit', 'inherit'] })
  for (const t of tempi) { if (!p.stdin.write(bmp(scena.fotogramma(t)))) await new Promise((r) => p.stdin.once('drain', r)) }
  p.stdin.end()
  await new Promise((r) => p.on('close', r))
}

// passaggi veri: momenti in cui la posizione attraversa i metri dati (ricerca fine)
function passaggi(pos, durata, metri) {
  const out = []
  for (const m of metri) {
    for (let t = 0.001; t < durata; t += 0.001) {
      const a = pos(t - 0.001), b = pos(t)
      if ((a - m) * (b - m) <= 0 && a !== b) { out.push({ t: Number(t.toFixed(3)), m }); break }
    }
  }
  return out
}

const fps30 = (durata) => Array.from({ length: Math.floor(durata * 30) + 1 }, (_, i) => i / 30)

// --- di lato
for (const [nome, vel, durata, tempi] of [
  ['lato-costante', () => 1.5, 12, fps30(12)],
  ['lato-accelera', (t) => 1.0 + 0.8 * Math.min(1, t / 10), 12, fps30(12)],
  // fotogrammi irregolari: ogni tanto un fotogramma arriva tardi (come i video WhatsApp/telefono a frame rate variabile)
  ['lato-irregolare', () => 1.5, 12, (() => { const t = []; let x = 0; let i = 0; while (x <= 12) { t.push(Number(x.toFixed(4))); x += i % 7 === 3 ? 0.05 : i % 11 === 5 ? 0.02 : 1 / 30; i++ } return t })()],
]) {
  const s = creaScena({ disegno: 'stefano', w: 854, h: 480, camera: 'segue', velocita: vel, partenza: 3 })
  const file = path.join(out, nome + '.mp4')
  await scrivi(file, s, tempi)
  const metri = [5, 7.5, 10, 12.5, 15, 17.5, 20].filter((m) => m > s.posizione(0.6) && m < s.posizione(durata - 0.6))
  writeFileSync(path.join(out, nome + '.json'), JSON.stringify({
    video: nome + '.mp4', note: 'video finto, verità esatta', tap: [Math.round(s.colonnaNuotatore(0) + 10), Math.round(s.yNuotatore)],
    da: 0, a: durata, vasca: 25, stile: 'crawl', camera: 'movimento', passo: PASSO_STEFANO, precisione: 0,
    passaggi: passaggi(s.posizione, durata, metri),
  }, null, 1))
  console.log('creato', nome)
}

// --- dalla testata, con virata: passaggi in arrivo, tocco (inizio e fine capovolta) e in uscita
{
  const pos = percorsi.virata(7, 1.1)
  const s = creaScenaTestata({ posizione: pos, tremolio: 1, seme: 5 })
  const d = (t) => pos(t).d
  const durata = 9
  const file = path.join(out, 'testata-virata.mp4')
  await scrivi(file, s, fps30(durata))
  // arrivo: metri che scendono; poi il tratto fermo; poi metri che salgono
  const tGiro = (() => { let tm = 0; for (let t = 0; t < durata; t += 0.001) if (d(t) <= d(tm) - 1e-9) tm = t; return tm })()
  const fineGiro = (() => { for (let t = tGiro; t < durata; t += 0.001) if (d(t) > d(tGiro) + 0.001) return t; return tGiro })()
  const arrivo = passaggi((t) => (t <= tGiro ? d(t) : d(tGiro)), tGiro, [6, 4, 2]) // ogni 2 m: con 1 m il braccio che si allunga pesa troppo
  const uscita = passaggi((t) => (t >= fineGiro ? d(t) : d(fineGiro)), durata, [2, 4, 6])
  const giro = [{ t: Number(tGiro.toFixed(3)), m: Number(d(tGiro).toFixed(2)) }, { t: Number(fineGiro.toFixed(3)), m: Number(d(fineGiro).toFixed(2)) }]
  const p0 = s.puntoNuotatore(0)
  writeFileSync(path.join(out, 'testata-virata.json'), JSON.stringify({
    video: 'testata-virata.mp4', note: 'video finto dalla testata, virata', tap: [Math.round(p0.x), Math.round(p0.y)],
    da: 0, a: durata, vasca: 25, stile: 'crawl', camera: 'movimento', passo: PASSO_COPPIA, precisione: 0,
    passaggi: [...arrivo, ...giro, ...uscita],
  }, null, 1))
  console.log('creato testata-virata')
}
