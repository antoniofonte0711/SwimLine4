/* global process */
// Aiuto per scrivere la VERITÀ: salva ogni fotogramma di un pezzo di video come immagine, con il suo tempo
// esatto nel nome (es. "t_004.367.jpg"). Si apre la cartella, si scorrono le immagini e si annota il tempo
// del fotogramma in cui la testa del nuotatore passa sul punto (boa, bandierina, tocco a muro).
// I tempi sono quelli VERI del video (gli stessi che usa l'app), anche se il telefono ha registrato i
// fotogrammi a intervalli irregolari.
// Uso: npx vite-node strumenti/analisi-video/segna.js -- <video> [--da 2] [--a 6] [--cartella uscita]
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync } from 'node:fs'
import path from 'node:path'
import { FFMPEG, tempiFotogrammi } from './fotogramma.js'

const args = process.argv.slice(2).filter((a) => a !== '--')
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d }
const video = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
if (!video) { console.error('Uso: segna.js <video> [--da s] [--a s] [--cartella uscita]'); process.exit(1) }
const tempi = await tempiFotogrammi(video)
const da = Number(opt('da', tempi[0])), a = Number(opt('a', tempi[tempi.length - 1]))
const out = opt('cartella', video.replace(/\.\w+$/, '') + '_fotogrammi')
mkdirSync(out, { recursive: true })

// tutti i fotogrammi in ordine, senza aggiungerne o toglierne; poi si tengono quelli tra da e a
const indici = tempi.map((t, i) => [t, i]).filter(([t]) => t >= da - 1e-6 && t <= a + 1e-6)
const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', video,
  // (l'ffmpeg di Remotion ha pochi filtri: niente "select", si usa "trim" per numero di fotogramma)
  '-vf', `trim=start_frame=${indici[0][1]}:end_frame=${indici[indici.length - 1][1] + 1},scale='min(1280,iw)':-2`, '-fps_mode', 'passthrough', '-q:v', '3',
  path.join(out, 'tmp_%05d.jpg')], { stdio: 'inherit' })
await new Promise((r) => p.on('close', r))
const file = readdirSync(out).filter((f) => f.startsWith('tmp_')).sort()
file.forEach((f, k) => {
  const t = indici[k]?.[0]
  if (t === undefined) return
  renameSync(path.join(out, f), path.join(out, `t_${t.toFixed(3).padStart(7, '0')}.jpg`))
})
console.log(`${file.length} fotogrammi (da ${da.toFixed(2)} a ${a.toFixed(2)} s) in: ${out}`)
if (file.length !== indici.length) console.log(`ATTENZIONE: attesi ${indici.length} fotogrammi, salvati ${file.length}: i nomi potrebbero essere sfasati.`)
