// Lettura dei fotogrammi nel browser, uno alla volta e in ordine, con un <video> nascosto (lo stesso file
// già aperto: niente viene caricato da nessuna parte). Il video principale resta libero: si può guardare
// mentre l'analisi va avanti.
//
// Metodo: riproduzione a passo a passo con requestVideoFrameCallback (ogni fotogramma vero, con il suo
// tempo esatto); dove non c'è, salti con currentTime (più lento).

const una = (el, ev) => new Promise((ok, ko) => {
  const fatto = () => { el.removeEventListener(ev, fatto); el.removeEventListener('error', errore); ok() }
  const errore = () => { el.removeEventListener(ev, fatto); el.removeEventListener('error', errore); ko(new Error('video')) }
  el.addEventListener(ev, fatto)
  el.addEventListener('error', errore)
})

export const LARGHEZZA_ANALISI = 960
const BUCO = 0.09 // s: più di ~2 fotogrammi a 30 fps senza niente in mezzo

// impronta veloce di un fotogramma (pixel sparsi): uguale = stesso fotogramma
export function firma(img) {
  let h = 0
  const d = img.data
  for (let i = 0; i < d.length; i += 4093) h = (h * 31 + d[i]) | 0
  return h
}

async function apri(url) {
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  // dentro la pagina (invisibile): alcuni browser non avvisano dei fotogrammi di un video staccato
  v.setAttribute('aria-hidden', 'true')
  v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;z-index:-1'
  document.body.appendChild(v)
  v.src = url
  await una(v, 'loadedmetadata')
  if (!Number.isFinite(v.duration)) {
    // WebM senza durata: la si scopre andando in fondo
    v.currentTime = 1e7
    await una(v, 'durationchange').catch(() => {})
  }
  return v
}

function chiudi(v) {
  v.pause()
  v.removeAttribute('src')
  v.load()
  v.remove()
}

function preparaTela(v, larghezzaMax) {
  const w = Math.min(v.videoWidth, larghezzaMax)
  const h = Math.round((v.videoHeight * w) / v.videoWidth)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  return { w, h, ctx, fattore: v.videoWidth / w }
}

// Un solo fotogramma al tempo t (per la scala o per la correzione)
export async function unFotogramma(url, t, larghezzaMax = LARGHEZZA_ANALISI) {
  const v = await apri(url)
  try {
    const { w, h, ctx, fattore } = preparaTela(v, larghezzaMax)
    v.currentTime = Math.min(Math.max(0, t), v.duration - 0.001)
    await una(v, 'seeked')
    ctx.drawImage(v, 0, 0, w, h)
    return { img: { w, h, data: ctx.getImageData(0, 0, w, h).data }, fattore }
  } finally {
    chiudi(v)
  }
}

// Tutti i fotogrammi tra da e a. suFotogramma(img, t) può essere async; ritorna false per fermarsi.
export async function scorriFotogrammi(url, { da, a, larghezzaMax = LARGHEZZA_ANALISI, suFotogramma, annullato = () => false, onSalti }) {
  const v = await apri(url)
  try {
    const { w, h, ctx, fattore } = preparaTela(v, larghezzaMax)
    const fine = Math.min(a ?? v.duration, v.duration)
    v.currentTime = Math.max(0, da)
    await una(v, 'seeked')
    const leggi = () => { ctx.drawImage(v, 0, 0, w, h); return { w, h, data: ctx.getImageData(0, 0, w, h).data } }

    // il primo fotogramma è quello già mostrato dopo il salto
    if ((await suFotogramma(leggi(), v.currentTime, fattore)) === false) return
    let ultimo = v.currentTime
    // Intervallo tra due fotogrammi, imparato strada facendo (il più piccolo visto). Se il browser ne salta
    // qualcuno mentre riproduce (succede con i video di WhatsApp: 1 ogni 6 a velocità normale), si rallenta
    // la lettura a 0,75× e si torna a prendere quelli persi (0,5× costava il doppio del tempo per
    // pochissimi fotogrammi in più). Misurato: a 0,75× quasi nessun fotogramma
    // perso e analisi circa in tempo reale; a 1× il 16% in meno.
    let intervallo = Infinity
    const VELOCITA = [1, 0.75]
    let marcia = 0
    v.playbackRate = VELOCITA[0]
    let fermato = false
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      const tentativi = new Map()
      fermato = await new Promise((ok, ko) => {
        let finito = false
        let guardia = null
        // se i fotogrammi non arrivano (scheda in secondo piano, browser che non disegna) si passa ai salti
        const arma = () => { clearTimeout(guardia); guardia = setTimeout(() => { if (!finito) { finito = true; v.pause(); ok('bloccato') } }, 1500) }
        const termina = (motivo = true) => { if (!finito) { finito = true; clearTimeout(guardia); ok(motivo) } }
        const passo = async (_, meta) => {
          if (finito) return
          clearTimeout(guardia)
          v.pause()
          const t = meta.mediaTime
          if (t > fine + 1e-3 || annullato()) { termina(); return }
          // Buco (il video è andato avanti da solo mentre si analizzava, succede soprattutto all'avvio):
          // si torna subito dopo l'ultimo fotogramma letto e si riprende da lì. Massimo 3 tentativi per
          // punto, poi si accetta il buco (meglio un buco che un'analisi che non finisce).
          const perso = Number.isFinite(intervallo) && t > ultimo + intervallo * 1.5
          if (perso && marcia < VELOCITA.length - 1) {
            v.playbackRate = VELOCITA[++marcia]
            v.currentTime = ultimo + 0.001
            await una(v, 'seeked')
            arma()
            v.requestVideoFrameCallback(passo)
            v.play().catch(() => termina('bloccato'))
            return
          }
          if (t > ultimo + BUCO && (tentativi.get(ultimo) || 0) < 3) {
            tentativi.set(ultimo, (tentativi.get(ultimo) || 0) + 1)
            v.currentTime = ultimo + 0.001
            await una(v, 'seeked')
            arma()
            v.requestVideoFrameCallback(passo)
            v.play().catch(() => termina('bloccato'))
            return
          }
          if (t > ultimo + 1e-4) {
            // sotto 5 ms non è un fotogramma vero (240 fps e oltre: si resta sulla soglia fissa)
            if (t - ultimo > 0.005) intervallo = Math.min(intervallo, t - ultimo)
            ultimo = t
            try {
              if ((await suFotogramma(leggi(), t, fattore)) === false) { termina(); return }
            } catch (e) { finito = true; clearTimeout(guardia); ko(e); return }
          }
          arma()
          v.requestVideoFrameCallback(passo)
          v.play().catch(() => termina('bloccato'))
        }
        // finito il video senza aver letto tutto (fotogrammi persi): si completa con i salti
        v.addEventListener('ended', () => termina(ultimo < fine - 0.1 ? 'bloccato' : true), { once: true })
        arma()
        v.requestVideoFrameCallback(passo)
        v.play().catch(() => termina('bloccato'))
      })
    } else fermato = 'bloccato'
    if (fermato === 'bloccato' && !annullato()) {
      // salti di 1/60 di secondo da dove si era arrivati. Il browser non dice il tempo vero del fotogramma
      // mostrato: si tiene solo quando l'immagine cambia e gli si dà il tempo a metà tra i due salti
      // (errore massimo 1/120 s). Precisione più bassa: lo si segnala a chi chiama.
      onSalti?.()
      v.pause()
      const passo = 1 / 60
      let firmaPrec = null
      for (let t = ultimo + passo; t <= fine + 1e-6; t += passo) {
        if (annullato()) return
        v.currentTime = t
        await una(v, 'seeked')
        const img = leggi()
        const f = firma(img)
        if (f === firmaPrec) continue
        firmaPrec = f
        if ((await suFotogramma(img, t - passo / 2, fattore)) === false) return
      }
    }
  } finally {
    chiudi(v)
  }
}
