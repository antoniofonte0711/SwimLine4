// Monta il video tutorial (verticale 1080×1920, 25 fps) da: fotogrammi/intro, schermate/*.jpg, voce/*.wav
// Uso: node monta.cjs <percorso ffmpeg>   ->   uscita/swimline-tutorial.mp4
const { execFileSync } = require('child_process')
const fs = require('fs'), path = require('path')
const FF = process.argv[2]
const qui = (...p) => path.join(__dirname, ...p)
fs.mkdirSync(qui('uscita', 'pezzi'), { recursive: true })
const ff = (args) => execFileSync(FF, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
const durata = (f) => {
  try { execFileSync(FF, ['-i', f], { stdio: 'pipe' }) } catch (e) {
    const m = String(e.stderr).match(/Duration: (\d+):(\d+):([\d.]+)/); return +m[1] * 3600 + +m[2] * 60 + +m[3]
  }
}
const VIDEO = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '25']
const AUDIO = ['-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2']
const FONT = 'C\\:/Windows/Fonts/segoeuib.ttf'

// 1. entrata scenica: 30 s di fotogrammi, la voce del motto entra a 23,5 s
ff(['-framerate', '25', '-i', qui('fotogrammi', 'intro', 'f%04d.jpg'), '-i', qui('voce', '01-intro.wav'),
  '-filter_complex', '[1:a]adelay=23500|23500,apad[a]', '-map', '0:v', '-map', '[a]', '-t', '30', ...VIDEO, ...AUDIO, qui('uscita', 'pezzi', '00.mp4')])

// 2. le parti con le schermate: ogni immagine con un leggero zoom, la voce dall'inizio
const parti = [
  ['02-cose', ['02a-ingresso']],
  ['03-registrati', ['03a-registrati', '03b-gruppo', '03c-email']],
  ['04-conferma', ['conferma']],
  ['05-oggi', ['05a-oggi', '05b-lavori']],
  ['06-tempi', ['06a-tempi', '06b-media']],
  ['07-progressi', ['07a-progressi', '07b-record']],
  ['08-gare', ['08a-gare']],
]
// cartello "conferma l'email": l'ultima schermata sfocata con due righe sopra
ff(['-i', qui('schermate', '03c-email.jpg'), '-vf',
  `scale=1080:1920,boxblur=24:2,drawbox=x=0:y=0:w=iw:h=ih:color=0x041a4d@0.55:t=fill,` +
  `drawtext=fontfile='${FONT}':text='Conferma l’email':fontsize=86:fontcolor=white:x=(w-tw)/2:y=760,` +
  `drawtext=fontfile='${FONT}':text='Il coach ti accetta e sei dentro':fontsize=50:fontcolor=white@0.92:x=(w-tw)/2:y=900`,
  '-frames:v', '1', qui('schermate', 'conferma.jpg')])

let n = 1
for (const [voce, immagini] of parti) {
  const d = durata(qui('voce', voce + '.wav')) + 0.9
  const pezzo = d / immagini.length
  const input = [], filtri = []
  immagini.forEach((im, i) => {
    const frames = Math.round(pezzo * 25)
    // un solo fotogramma in ingresso: zoompan ne fa "frames" con lo zoom che cresce piano
    input.push('-i', qui('schermate', im + '.jpg'))
    filtri.push(`[${i}:v]scale=1080:1920,zoompan=z='min(zoom+0.0007,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=25,trim=end_frame=${frames},setpts=PTS-STARTPTS[v${i}]`)
  })
  const a = immagini.length
  input.push('-i', qui('voce', voce + '.wav'))
  filtri.push(immagini.map((_, i) => `[v${i}]`).join('') + `concat=n=${a}:v=1:a=0[v]`)
  filtri.push(`[${a}:a]adelay=250|250,apad[a]`)
  ff([...input, '-filter_complex', filtri.join(';'), '-map', '[v]', '-map', '[a]', '-t', d.toFixed(2), ...VIDEO, ...AUDIO,
    qui('uscita', 'pezzi', String(n++).padStart(2, '0') + '.mp4')])
}

// 3. chiusura: l'ultimo fotogramma dell'entrata con la voce finale
const dFine = durata(qui('voce', '09-fine.wav')) + 1.6
ff(['-loop', '1', '-t', dFine.toFixed(2), '-i', qui('fotogrammi', 'intro', 'f0749.jpg'), '-i', qui('voce', '09-fine.wav'),
  '-filter_complex', `[0:v]scale=1080:1920,fade=t=out:st=${(dFine - 0.8).toFixed(2)}:d=0.8[v];[1:a]adelay=200|200,apad[a]`,
  '-map', '[v]', '-map', '[a]', '-t', dFine.toFixed(2), ...VIDEO, ...AUDIO, qui('uscita', 'pezzi', String(n++).padStart(2, '0') + '.mp4')])

// 4. tutto insieme
const lista = fs.readdirSync(qui('uscita', 'pezzi')).filter((f) => f.endsWith('.mp4')).sort()
fs.writeFileSync(qui('uscita', 'lista.txt'), lista.map((f) => `file '${qui('uscita', 'pezzi', f).replace(/\\/g, '/')}'`).join('\n'))
ff(['-f', 'concat', '-safe', '0', '-i', qui('uscita', 'lista.txt'), '-c', 'copy', '-movflags', '+faststart', qui('uscita', 'swimline-tutorial.mp4')])
console.log('video pronto:', durata(qui('uscita', 'swimline-tutorial.mp4')).toFixed(1), 's')
