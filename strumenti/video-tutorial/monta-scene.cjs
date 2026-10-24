// Monta il tutorial con le scene animate: intro (fotogrammi) + scene/*.webm dentro un telefono sull'acqua + voce + chiusura.
// Uso: node monta-scene.cjs <percorso ffmpeg>   ->   uscita/swimline-tutorial-scene.mp4
const { execFileSync } = require('child_process')
const fs = require('fs'), path = require('path')
const FF = process.argv[2]
const qui = (...p) => path.join(__dirname, ...p)
const P = qui('uscita', 'pezzi2')
fs.mkdirSync(P, { recursive: true })
const ff = (args) => execFileSync(FF, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
const durata = (f) => {
  try { execFileSync(FF, ['-i', f], { stdio: 'pipe' }) } catch (e) {
    const m = String(e.stderr).match(/Duration: (\d+):(\d+):([\d.]+)/); return +m[1] * 3600 + +m[2] * 60 + +m[3]
  }
}
const VIDEO = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '25']
const AUDIO = ['-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2']
const FONT = 'C\\:/Windows/Fonts/segoeuib.ttf'

// telefono: schermo 820×1640 con angoli tondi, cornice blu notte intorno
const W = 820, H = 1640, R = 70, B = 18
const angoli = (w, h, r) => `if(gt(abs(W/2-X),W/2-${r})*gt(abs(H/2-Y),H/2-${r}),if(lte(hypot(${r}-(W/2-abs(W/2-X)),${r}-(H/2-abs(H/2-Y))),${r}),255,0),255)`
ff(['-f', 'lavfi', '-i', `color=white:s=${W}x${H}`, '-vf', `format=gray,geq=lum='${angoli(W, H, R)}'`, '-frames:v', '1', qui('uscita', 'maschera.png')])
ff(['-f', 'lavfi', '-i', `color=0x0a1a2f:s=${W + 2 * B}x${H + 2 * B}`, '-vf', `format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${angoli(W + 2 * B, H + 2 * B, R + B)}'`, '-frames:v', '1', qui('uscita', 'cornice.png')])
// fondo: l'acqua del logo, un po' più scura così il telefono risalta
ff(['-i', qui('acqua.png'), '-vf', 'crop=iw-40:ih:0:0,scale=1080:-2,crop=1080:1920:0:0,eq=brightness=-0.06:saturation=1.1,boxblur=3:1', '-frames:v', '1', qui('uscita', 'fondo.jpg')])

const X = (1080 - W) / 2, Y = 230
const scene = [
  ['s1-cose', '02-cose', 'Cos’è SwimLine', 0],
  ['s2-registrati', '03-registrati', 'Registrati', 0],
  [null, '04-conferma', null, 0],
  ['s3-oggi', '05-oggi', 'Oggi', 0],
  ['s4-tempi', '06-tempi', 'Scrivi i tempi', 0],
  ['s5-progressi', '07-progressi', 'I miei tempi', 0],
  ['s6-gare', '08-gare', 'Gare', 0],
]

// pezzo 0: l'entrata scenica (già pronta dal primo montaggio)
fs.copyFileSync(qui('uscita', 'pezzi', '00.mp4'), path.join(P, '00.mp4'))
let n = 1
for (const [scena, voce, titolo, salta] of scene) {
  const out = path.join(P, String(n++).padStart(2, '0') + '.mp4')
  const d = durata(qui('voce', voce + '.wav')) + 1.0
  if (!scena) { fs.copyFileSync(qui('uscita', 'pezzi', '03.mp4'), out); continue } // cartello "conferma l'email"
  const filtro = [
    `[1:v]trim=start=${salta},setpts=PTS-STARTPTS,fps=25,scale=${W}:${H},tpad=stop_mode=clone:stop_duration=30,trim=duration=${d.toFixed(2)}[app]`,
    `[app][2:v]alphamerge[schermo]`,
    `[0:v][3:v]overlay=${X - B}:${Y - B}[c]`,
    `[c][schermo]overlay=${X}:${Y},` +
      `drawtext=fontfile='${FONT}':text='${titolo}':fontsize=72:fontcolor=white:x=(w-tw)/2:y=92:shadowcolor=0x041a4d@0.7:shadowx=0:shadowy=4[v]`,
    `[4:a]adelay=300|300,apad[a]`,
  ].join(';')
  // la scena è una serie di foto: velocità = foto fatte / tempo passato tra la prima e l'ultima
  const foto = fs.readdirSync(qui('scene', scena)).filter((f) => f.endsWith('.jpg')).sort()
  const ms = fs.statSync(qui('scene', scena, foto.at(-1))).mtimeMs - fs.statSync(qui('scene', scena, foto[0])).mtimeMs
  const fps = Math.max(5, Math.min(30, (foto.length - 1) / (ms / 1000))).toFixed(3)
  ff(['-loop', '1', '-i', qui('uscita', 'fondo.jpg'), '-framerate', fps, '-i', qui('scene', scena, 'f%05d.jpg'), '-loop', '1', '-i', qui('uscita', 'maschera.png'),
    '-loop', '1', '-i', qui('uscita', 'cornice.png'), '-i', qui('voce', voce + '.wav'),
    '-filter_complex', filtro, '-map', '[v]', '-map', '[a]', '-t', d.toFixed(2), ...VIDEO, ...AUDIO, out])
  console.log('scena', scena, d.toFixed(1) + 's')
}
fs.copyFileSync(qui('uscita', 'pezzi', '08.mp4'), path.join(P, String(n++).padStart(2, '0') + '.mp4')) // chiusura sul logo

const lista = fs.readdirSync(P).filter((f) => f.endsWith('.mp4')).sort()
fs.writeFileSync(qui('uscita', 'lista2.txt'), lista.map((f) => `file '${path.join(P, f).replace(/\\/g, '/')}'`).join('\n'))
ff(['-f', 'concat', '-safe', '0', '-i', qui('uscita', 'lista2.txt'), '-c', 'copy', '-movflags', '+faststart', qui('uscita', 'swimline-tutorial-scene.mp4')])
console.log('video pronto:', durata(qui('uscita', 'swimline-tutorial-scene.mp4')).toFixed(1), 's')
