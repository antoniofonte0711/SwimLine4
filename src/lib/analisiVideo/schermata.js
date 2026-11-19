// Screenshot del fotogramma scelto, con i riquadri sopra, alla risoluzione piena del video.
// Su telefono si apre "Condividi" (da lì "Salva immagine" lo mette nelle foto), su PC si scarica il file.
// Non viene salvato nient'altro, da nessuna parte.
import { disegnaRiquadri } from './overlay'

export function canvasSchermata(video, dati) {
  const w = video.videoWidth
  const h = video.videoHeight
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.drawImage(video, 0, 0, w, h)
  disegnaRiquadri(ctx, { x: 0, y: 0, w, h }, dati)
  return c
}

const inBlob = (c) => new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('toBlob vuoto'))), 'image/png'))

// "telefono" = schermo touch senza mouse: lì si condivide, altrove si scarica
const eTelefono = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

export function nomeSchermata(secondi) {
  const d = new Date()
  const g = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const t = (Math.round((secondi || 0) * 10) / 10).toFixed(1).replace('.', ',')
  return `swimline4-analisi-${g}-${t}s.png`
}

// Salva un file: su telefono con "Condividi" (da lì si mette nelle foto o si manda), su PC scaricandolo.
// Ritorna un messaggio da mostrare all'utente.
export async function salvaFile(blob, nome) {
  const file = new File([blob], nome, { type: blob.type })
  if (eTelefono() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'Pronto: scegli dove salvarlo (Foto, File) o a chi mandarlo.'
    } catch (e) {
      if (e?.name === 'AbortError') return ''
      // condivisione non riuscita: si ripiega sul download
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  return 'Salvato nella cartella dei download.'
}

export async function salvaSchermata(video, dati) {
  const blob = await inBlob(canvasSchermata(video, dati))
  return salvaFile(blob, nomeSchermata(video.currentTime))
}
