/* global process, Buffer */
// "PROVA DEL 9": confronta i numeri dell'app con la VERITÀ presa a mano su video veri.
// La verità sono i passaggi del nuotatore su punti a distanza nota (boe/bandierine ogni 5 m, tocco a muro),
// letti fotogramma per fotogramma con segna.js. Per ogni tratto tra due passaggi:
//   velocità vera = metri / secondi   contro   velocità dell'app sullo stesso tratto (stesso codice dell'app).
// Alla fine: errore medio, errore peggiore e "limiti di accordo" (media ± 1,96 × scarto tipo, come negli studi
// di validazione: Bland-Altman) su TUTTI i tratti di tutti i video.
//
// Uso:  npx vite-node strumenti/analisi-video/verita.js -- <file.json | cartella con i .json> [altri...]
// Formato del file .json: vedi strumenti/analisi-video/verita/esempio.json e LEGGIMI.md
import { spawn } from 'node:child_process'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import { FFMPEG, FFPROBE, tempiFotogrammi } from './fotogramma.js'
import { creaAnalizzatore } from '../../src/lib/analisiVideo/analisi.js'
import { metroInVasca } from '../../src/lib/analisiVideo/zone.js'
import { LARGHEZZA_ANALISI } from '../../src/lib/analisiVideo/estrazione.js'

// Obiettivo di precisione (scelto da noi; gli studi su sistemi video 2D seri stanno sotto il 2-3%)
export const OBIETTIVO = { tratto: 5, media: 3 } // % : ogni tratto entro ±5%, media complessiva entro ±3%

function dimensioni(video) {
  return new Promise((ok) => {
    const p = spawn(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:stream_side_data=rotation', '-of', 'json', video])
    let s = ''
    p.stdout.on('data', (d) => { s += d })
    p.on('close', () => {
      const j = JSON.parse(s).streams[0]
      const rot = Math.abs(Number(j.side_data_list?.find((x) => 'rotation' in x)?.rotation || 0))
      ok(rot === 90 || rot === 270 ? { W: j.height, H: j.width } : { W: j.width, H: j.height })
    })
  })
}

// Regolarità dei fotogrammi
export function controllaTempi(tempi) {
  const d = []
  for (let i = 1; i < tempi.length; i++) d.push(tempi[i] - tempi[i - 1])
  const o = [...d].sort((a, b) => a - b)
  const tipico = o[o.length >> 1]
  const fps = 1 / tipico
  // quanto sbaglierebbe chi conta n / fps
  let scartoMax = 0
  for (let i = 0; i < tempi.length; i++) scartoMax = Math.max(scartoMax, Math.abs(tempi[0] + i * tipico - tempi[i]))
  const irregolari = d.filter((x) => x > tipico * 1.5 || x < tipico * 0.5).length
  return { fps, tipico, min: o[0], max: o[o.length - 1], irregolari, scartoMax }
}

// Posizione dell'app al tempo t: interpolata tra i due campioni vicini (entrambi entro 0,2 s)
function interpola(t, ts, vals) {
  let lo = -1
  for (let i = 0; i < ts.length; i++) { if (ts[i] <= t) lo = i; else break }
  const prima = (() => { for (let i = lo; i >= 0; i--) if (vals[i] !== null) return i; return -1 })()
  const dopo = (() => { for (let i = Math.max(0, lo + 1); i < ts.length; i++) if (vals[i] !== null) return i; return -1 })()
  if (prima >= 0 && Math.abs(ts[prima] - t) < 1e-6) return vals[prima]
  if (prima < 0 || dopo < 0 || t - ts[prima] > 0.2 || ts[dopo] - t > 0.2) return null
  const f = (t - ts[prima]) / (ts[dopo] - ts[prima] || 1)
  return vals[prima] + f * (vals[dopo] - vals[prima])
}

export async function analizzaVideo(cfg, cartella) {
  const video = path.isAbsolute(cfg.video) ? cfg.video : path.resolve(cartella, cfg.video)
  if (!existsSync(video)) throw new Error('video non trovato: ' + video)
  const tempi = await tempiFotogrammi(video)
  const { W, H } = await dimensioni(video)
  const w = Math.min(W, LARGHEZZA_ANALISI), h = Math.round((H * w) / W) & ~1
  const fattore = W / w
  const da = cfg.da ?? tempi[0], a = cfg.a ?? tempi[tempi.length - 1]

  // passo dei dischetti della vasca già noto (come lo ricorderebbe l'app sul telefono), se dato
  globalThis.localStorage = { getItem: () => (cfg.passo ? String(cfg.passo) : null), setItem: () => {} }
  const an = creaAnalizzatore({ tInizio: da, tFine: a, tap: { x: cfg.tap[0], y: cfg.tap[1] }, camera: cfg.camera || 'movimento', stile: cfg.stile || 'crawl', vasca: cfg.vasca || 25 })

  // tutti i fotogrammi, uno per uno, senza che ffmpeg ne aggiunga o ne tolga (passthrough)
  // (l'ffmpeg di Remotion ha solo image2pipe; con i tempi irregolari si lamenta dei "dts" ma non perde
  // fotogrammi: il conteggio sotto lo controlla, quindi si mostrano solo gli errori gravi)
  const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'fatal', '-i', video, '-vf', `scale=${w}:${h}`, '-fps_mode', 'passthrough',
    '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgba', '-'], { stdio: ['ignore', 'pipe', 'inherit'] })
  const dim = w * h * 4
  let buf = Buffer.alloc(0), n = 0
  for await (const pezzo of ff.stdout) {
    buf = Buffer.concat([buf, pezzo])
    while (buf.length >= dim) {
      const data = new Uint8ClampedArray(buf.buffer.slice(buf.byteOffset, buf.byteOffset + dim))
      buf = buf.subarray(dim)
      const t = tempi[n] ?? (tempi[tempi.length - 1] + (n - tempi.length + 1) / 30)
      n++
      if (t < da - 1e-6 || t > a + 1e-6) continue
      an.aggiungi({ w, h, data }, t, fattore)
    }
  }
  const nonCorrispondono = n !== tempi.length
  return { st: an.concludi(), tempi, n, nonCorrispondono, W, H }
}

// Confronto tratto per tratto
// precisione = di quanto può sbagliare UN passaggio letto a mano (s): mezzo fotogramma per lato → in tutto
// circa un fotogramma sul tratto. Con la verità esatta (video finti) è 0.
export function confronta(st, passaggi, precisione = 0) {
  const { serie } = st
  const mpp = st.scala?.mpp
  // metri dalla parete secondo l'app (per dire "dove ti mette"): dalla testata sono già quelli
  const parete = serie.m.map((m) => (m === null ? null : st.testata ? m : st.posizione?.ancora && mpp ? metroInVasca(st.posizione, m / mpp) : null))
  const ps = [...passaggi].sort((p, q) => p.t - q.t)
  const punti = ps.map((p) => ({ ...p, mApp: interpola(p.t, serie.t, serie.m), pareteApp: interpola(p.t, serie.t, parete) }))
  const tratti = []
  for (let i = 1; i < punti.length; i++) {
    const p = punti[i - 1], q = punti[i]
    const dt = q.t - p.t
    const vVera = Math.abs(q.m - p.m) / dt
    const vApp = p.mApp === null || q.mApp === null ? null : Math.abs(q.mApp - p.mApp) / dt
    // tratto da fermo (capovolta, tocco): l'errore in % non ha senso, si mostra ma non si conta
    const fermo = vVera < 0.2
    // incertezza della verità stessa su questo tratto (%): un tratto corto non può dare una prova precisa
    const incertezza = (100 * 2 * precisione) / dt
    tratti.push({ da: p, a: q, dt, vVera, vApp, fermo, incertezza, errore: vApp === null || fermo ? null : (100 * (vApp - vVera)) / vVera })
  }
  // media su tutto il tratto misurato: dal primo all'ultimo passaggio che l'app ha visto
  const visti = punti.filter((p) => p.mApp !== null)
  let media = null
  if (visti.length >= 2) {
    // strada vera = somma dei tratti (con la virata in mezzo la distanza non è la differenza dei metri)
    let strada = 0, stradaApp = 0
    // media dal primo all'ultimo passaggio visto, senza buchi: un tratto non visto in mezzo la rende non confrontabile
    const i0 = tratti.findIndex((tr) => tr.vApp !== null), i1 = tratti.findLastIndex((tr) => tr.vApp !== null)
    const usati = tratti.slice(i0, i1 + 1)
    if (usati.some((tr) => tr.vApp === null)) return { punti, tratti, media: null, buchi: true }
    for (const tr of usati) { strada += tr.vVera * tr.dt; stradaApp += tr.vApp * tr.dt }
    const tempo = usati.reduce((s, tr) => s + tr.dt, 0)
    if (tempo > 0) media = { vera: strada / tempo, app: stradaApp / tempo, errore: (100 * (stradaApp - strada)) / strada, tempo }
  }
  return { punti, tratti, media }
}

// Statistiche su tutti i tratti (in %): scarto medio (errore sistematico), limiti di accordo, peggiore
// errori: [{ errore, incertezza }] oppure numeri
export function riassumi(errori) {
  const voci = errori.map((x) => (typeof x === 'number' || x === null ? { errore: x, incertezza: 0 } : x)).filter((x) => x.errore !== null && Number.isFinite(x.errore))
  const e = voci.map((x) => x.errore)
  if (!e.length) return null
  const media = e.reduce((s, x) => s + x, 0) / e.length
  const sd = e.length > 1 ? Math.sqrt(e.reduce((s, x) => s + (x - media) ** 2, 0) / (e.length - 1)) : 0
  const peggiore = e.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0)
  return { n: e.length, media, sd, basso: media - 1.96 * sd, alto: media + 1.96 * sd, peggiore, fuori: voci.filter((x) => Math.abs(x.errore) > OBIETTIVO.tratto + x.incertezza).length }
}

const pc = (x) => (x === null || x === undefined ? '  —  ' : `${x >= 0 ? '+' : ''}${x.toFixed(1)}%`)
const f2 = (x) => (x === null || x === undefined ? ' — ' : x.toFixed(2))

function fileDa(args) {
  const out = []
  for (const a of args) {
    if (statSync(a).isDirectory()) for (const f of readdirSync(a)) { if (f.endsWith('.json') && f !== 'esempio.json') out.push(path.join(a, f)) }
    else out.push(a)
  }
  return out
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--')
  if (!args.length) { console.error('Uso: verita.js <file.json | cartella> [altri...]'); process.exit(1) }
  const tutti = [], medie = []
  for (const file of fileDa(args)) {
    const cfg = JSON.parse(readFileSync(file, 'utf8'))
    console.log(`\n=== ${path.basename(file)}${cfg.note ? ` (${cfg.note})` : ''}`)
    let r
    try { r = await analizzaVideo(cfg, path.dirname(file)) } catch (e) { console.log('  ERRORE:', e.message); continue }
    const { st, tempi } = r
    const ct = controllaTempi(tempi)
    console.log(`  video ${r.W}x${r.H}, ${tempi.length} fotogrammi a ~${ct.fps.toFixed(2)} al secondo`)
    if (ct.irregolari) console.log(`  ATTENZIONE: ${ct.irregolari} fotogrammi a intervalli irregolari (da ${(ct.min * 1000).toFixed(0)} a ${(ct.max * 1000).toFixed(0)} ms). Contare "n / fps" sbaglierebbe fino a ${(ct.scartoMax * 1000).toFixed(0)} ms: qui si usano i tempi veri.`)
    if (r.nonCorrispondono) console.log(`  ATTENZIONE: fotogrammi letti ${r.n} ma tempi ${tempi.length}: i tempi potrebbero essere sfasati.`)
    console.log(`  inquadratura: ${st.testata ? 'dalla testata' : 'di lato'}; scala: ${st.scala?.fonte || 'nessuna'} (${st.scala?.qualita || '—'})${!st.testata && st.scala?.mpp ? `, ${st.scala.mpp.toFixed(4)} m per dischetto` : ''}${st.posizione?.cambi?.length ? `; cambi di colore a u = ${st.posizione.cambi.map((c) => c.u.toFixed(1)).join(', ')}` : ''}`)
    if (st.nonMisurabile) console.log('  L\'APP DICE: ' + st.nonMisurabile)
    // precisione dei passaggi: data nel file (0 = esatta, video finti) o, di base, mezzo fotogramma
    const precisione = cfg.precisione ?? 0.5 / ct.fps
    const c = confronta(st, cfg.passaggi, precisione)
    if (process.env.DBG_VOTI && st.voti?.[st.posizione?.catena]) {
      const v = st.voti[st.posizione.catena], L = 'RGVBw.'
      const [a0, a1] = process.env.DBG_VOTI.split(',').map(Number)
      let s = ''
      for (let k = a0 * 2; k <= a1 * 2; k++) { const c = v.get(k); if (!c) { s += ' '; continue } let b = 0; for (let j = 1; j < c.length; j++) if (c[j] > c[b]) b = j; s += L[b] }
      console.log('  voti u ' + a0 + '..' + a1 + ': ' + s)
    }
    for (const p of c.punti) console.log(`  passaggio ${p.t.toFixed(2).padStart(6)} s al metro ${String(p.m).padStart(4)}   l'app ti mette al metro ${f2(p.pareteApp)}`)
    for (const tr of c.tratti) {
      const fuori = tr.fermo ? '  (fermo: non contato)' : tr.vApp === null ? '  (l\'app non ha la posizione)' : Math.abs(tr.errore) > OBIETTIVO.tratto + tr.incertezza ? '  ← FUORI' : ''
      const inc = tr.incertezza >= 0.05 ? ` (verità ±${tr.incertezza.toFixed(1)}%)` : ''
      console.log(`  tratto ${String(tr.da.m).padStart(4)} → ${String(tr.a.m).padStart(4)} m in ${tr.dt.toFixed(2)} s: vera ${f2(tr.vVera)} m/s, app ${f2(tr.vApp)} m/s  ${pc(tr.errore)}${inc}${fuori}`)
      if (!tr.fermo) tutti.push({ errore: tr.errore, incertezza: tr.incertezza })
    }
    if (c.tratti.some((tr) => !tr.fermo && tr.incertezza > 2)) console.log('  NOTA: alcuni tratti sono troppo brevi per una prova precisa: meglio passaggi più distanti (almeno 2-3 s tra uno e l\'altro).')
    if (c.media) {
      console.log(`  MEDIA su ${c.media.tempo.toFixed(1)} s: vera ${f2(c.media.vera)} m/s, app ${f2(c.media.app)} m/s  ${pc(c.media.errore)}`)
      medie.push(c.media.errore)
    } else console.log('  MEDIA: l\'app non ha visto abbastanza passaggi per confrontarla')
  }

  const s = riassumi(tutti), sm = riassumi(medie)
  console.log('\n=== RISULTATO COMPLESSIVO')
  if (!s) { console.log('  nessun tratto confrontabile'); return }
  console.log(`  ${s.n} tratti: errore medio ${pc(s.media)} (se lontano da 0 l'app sbaglia sempre nello stesso verso: problema di scala)`)
  console.log(`  il 95% dei tratti sta tra ${pc(s.basso)} e ${pc(s.alto)}; peggiore ${pc(s.peggiore)}; fuori dal ±${OBIETTIVO.tratto}%: ${s.fuori}`)
  if (sm) console.log(`  medie dei ${sm.n} video: errore medio ${pc(sm.media)}, peggiore ${pc(sm.peggiore)}`)
  const ok = s.fuori === 0 && (!sm || Math.abs(sm.peggiore) <= OBIETTIVO.media)
  console.log(ok
    ? `  ESITO: dentro l'obiettivo (tratti entro ±${OBIETTIVO.tratto}%, medie entro ±${OBIETTIVO.media}%).${s.n < 20 ? ` Ma con ${s.n} tratti è presto per esserne sicuri: servono almeno 20 tratti da 3-4 video diversi.` : ''}`
    : `  ESITO: NON ancora dentro l'obiettivo (tratti entro ±${OBIETTIVO.tratto}%, medie entro ±${OBIETTIVO.media}%).`)
}

await main()
