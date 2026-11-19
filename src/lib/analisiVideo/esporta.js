// Video con i dati sopra, creato sul dispositivo del coach (niente server). Si riproduce il tratto
// analizzato, si disegna ogni fotogramma con i riquadri su una tela e la si registra.
// Dura quanto il tratto (si registra in tempo reale).
import { disegnaRiquadri } from './overlay'
import { valoriAl } from './serie'

const FORMATI = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']

export const esportazionePossibile = () =>
  typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype

export async function esportaVideo({ url, da, a, serie, stile, onAvanzamento, annullato = () => false }) {
  const tipo = FORMATI.find((f) => MediaRecorder.isTypeSupported?.(f))
  if (!tipo) throw new Error('formato')
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.src = url
  await new Promise((ok, ko) => { v.onloadedmetadata = ok; v.onerror = ko })
  const w = Math.min(v.videoWidth, 1280)
  const h = Math.round((v.videoHeight * w) / v.videoWidth)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const disegna = () => {
    ctx.drawImage(v, 0, 0, w, h)
    disegnaRiquadri(ctx, { x: 0, y: 0, w, h }, valoriAl(serie, v.currentTime, stile))
  }
  v.currentTime = da
  await new Promise((ok) => { v.onseeked = ok })
  disegna()
  const flusso = c.captureStream(30)
  const reg = new MediaRecorder(flusso, { mimeType: tipo, videoBitsPerSecond: 6_000_000 })
  const pezzi = []
  reg.ondataavailable = (e) => { if (e.data.size) pezzi.push(e.data) }
  const fermato = new Promise((ok) => { reg.onstop = ok })
  reg.start(250)
  await new Promise((ok) => {
    let finito = false
    const fine = () => { if (!finito) { finito = true; v.pause(); ok() } }
    const passo = () => {
      if (finito) return
      disegna()
      onAvanzamento?.(Math.min(1, (v.currentTime - da) / Math.max(0.1, a - da)))
      if (v.currentTime >= a || annullato()) { fine(); return }
      if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(passo)
      else requestAnimationFrame(passo)
    }
    v.onended = fine
    v.play().then(() => passo()).catch(fine)
  })
  reg.stop()
  await fermato
  v.removeAttribute('src')
  v.load()
  if (annullato()) return null
  return { blob: new Blob(pezzi, { type: tipo.split(';')[0] }), estensione: tipo.includes('mp4') ? 'mp4' : 'webm' }
}
