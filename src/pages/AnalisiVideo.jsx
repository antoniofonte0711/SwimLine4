import { useCallback, useEffect, useRef, useState } from 'react'
import AppShell from '../components/AppShell'
import Icona from '../components/Icona'
import { disegnaRiquadri, rettangoloVideo } from '../lib/analisiVideo/overlay'
import { salvaSchermata } from '../lib/analisiVideo/schermata'

// Analisi video (passo 1): si carica un video dal dispositivo, si guarda a tutto schermo con i riquadri
// della velocità e si salvano screenshot. Il video NON va su nessun server e non entra nel database:
// resta nella memoria del browser e viene tolto quando si chiude.

// Messaggi chiari per i video che il dispositivo non riesce ad aprire
function messaggioErrore(codice) {
  if (codice === 4) return 'Questo video non si apre su questo dispositivo. Succede spesso con i video HEVC dell\'iPhone aperti su un PC Windows: aprilo dal telefono che l\'ha girato, prova con Edge oppure, sull\'iPhone, Impostazioni → Fotocamera → Formati → "Più compatibile".'
  if (codice === 3) return 'Il video è danneggiato o usa un formato che il dispositivo non sa leggere fino in fondo. Prova con un altro file.'
  return 'Il video non si è aperto. Riprova o scegli un altro file.'
}

// 75.34 -> "1:15,3"
export function scriviTempo(s) {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1).replace('.', ',')}`
}

const VELOCITA_RIPRODUZIONE = [1, 0.5, 0.25]
const PASSO = 1 / 30 // un fotogramma a 30 fps: il vero numero di fotogrammi arriva con l'analisi

// Dati dei riquadri al tempo t. Per ora nessuna analisi: riquadri vuoti ("—"), mai numeri inventati.
const datiAlTempo = () => ({ istantanea: null, media: null, fase: null, affidabilita: null })

function Lettore({ url, nome, onChiudi }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const contRef = useRef(null)
  const comandiRef = useRef(null)
  const [pronto, setPronto] = useState(false)
  const [inPausa, setInPausa] = useState(true)
  const [tempo, setTempo] = useState(0)
  const [durata, setDurata] = useState(0)
  const [velocita, setVelocita] = useState(1)
  const [errore, setErrore] = useState('')
  const [esito, setEsito] = useState('')

  // Disegna i riquadri sopra il video (canvas grande quanto lo schermo, nitido sui display ad alta densità)
  const disegna = useCallback(() => {
    const v = videoRef.current
    const c = canvasRef.current
    const cont = contRef.current
    if (!v || !c || !cont) return
    const dpr = window.devicePixelRatio || 1
    const cw = cont.clientWidth
    const ch = cont.clientHeight
    if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
      c.width = Math.round(cw * dpr)
      c.height = Math.round(ch * dpr)
    }
    const ctx = c.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cw, ch)
    if (!v.videoWidth) return
    const r = rettangoloVideo(cw, ch, v.videoWidth, v.videoHeight)
    // se i comandi in basso coprono il video, i riquadri salgono sopra di loro
    const hComandi = comandiRef.current?.offsetHeight || 0
    const coperto = Math.max(0, r.y + r.h - (ch - hComandi))
    disegnaRiquadri(ctx, r, datiAlTempo(v.currentTime), { margineBasso: coperto })
  }, [])

  // Aggiorna tempo e riquadri a ogni fotogramma mostrato (requestVideoFrameCallback dove c'è, sennò animazione)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let id = null
    let fermo = false
    const usaRvfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype
    const passo = () => {
      if (fermo) return
      setTempo(v.currentTime)
      disegna()
      id = usaRvfc ? v.requestVideoFrameCallback(passo) : requestAnimationFrame(passo)
    }
    id = usaRvfc ? v.requestVideoFrameCallback(passo) : requestAnimationFrame(passo)
    return () => {
      fermo = true
      if (usaRvfc) v.cancelVideoFrameCallback?.(id)
      else cancelAnimationFrame(id)
    }
  }, [disegna])

  useEffect(() => {
    const ro = new ResizeObserver(disegna)
    if (contRef.current) ro.observe(contRef.current)
    return () => ro.disconnect()
  }, [disegna])

  // Mentre il lettore è aperto la pagina sotto non scorre
  useEffect(() => {
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prima }
  }, [])

  const playPausa = useCallback(() => {
    const v = videoRef.current
    if (!v || !pronto) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }, [pronto])

  const vaiA = useCallback((t) => {
    const v = videoRef.current
    if (!v || !Number.isFinite(v.duration)) return
    v.currentTime = Math.min(Math.max(t, 0), v.duration)
    setTempo(v.currentTime)
  }, [])

  const fotogramma = useCallback((verso) => {
    const v = videoRef.current
    if (!v) return
    v.pause()
    vaiA(v.currentTime + verso * PASSO)
  }, [vaiA])

  // Tastiera (PC): spazio = play/pausa, frecce = un fotogramma
  useEffect(() => {
    const tasto = (e) => {
      if (e.target.closest?.('input, textarea, select')) return
      if (e.key === ' ') { e.preventDefault(); playPausa() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); fotogramma(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); fotogramma(-1) }
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [playPausa, fotogramma])

  function caricato() {
    const v = videoRef.current
    if (!v.videoWidth) {
      setErrore('Questo file non ha immagini (solo audio): scegli un video.')
      return
    }
    // Alcuni WebM registrati da app o browser non scrivono la durata (Infinity): il browser la scopre
    // solo andando in fondo. Si salta alla fine e si torna all'inizio, poi il video è pronto.
    if (!Number.isFinite(v.duration)) {
      const scoperta = () => {
        if (!Number.isFinite(v.duration)) return
        v.removeEventListener('durationchange', scoperta)
        v.currentTime = 0
        setDurata(v.duration)
        setPronto(true)
        disegna()
      }
      v.addEventListener('durationchange', scoperta)
      v.currentTime = 1e7
      return
    }
    setDurata(v.duration)
    setPronto(true)
    disegna()
  }

  function cambiaVelocita() {
    const i = VELOCITA_RIPRODUZIONE.indexOf(velocita)
    const nuova = VELOCITA_RIPRODUZIONE[(i + 1) % VELOCITA_RIPRODUZIONE.length]
    setVelocita(nuova)
    if (videoRef.current) videoRef.current.playbackRate = nuova
  }

  async function schermata() {
    const v = videoRef.current
    if (!v || !pronto) return
    v.pause()
    setEsito('')
    try {
      setEsito(await salvaSchermata(v, datiAlTempo(v.currentTime)))
    } catch {
      setEsito('Screenshot non riuscito su questo dispositivo.')
    }
  }

  useEffect(() => {
    if (!esito) return
    const t = setTimeout(() => setEsito(''), 4000)
    return () => clearTimeout(t)
  }, [esito])

  return (
    <div ref={contRef} className="fixed inset-0 z-[70] bg-black text-white select-none" role="dialog" aria-label={`Analisi video: ${nome}`}>
      {/* "#t=0.001": su iPhone senza questo il primo fotogramma resta nero finché non si preme play */}
      <video ref={videoRef} src={`${url}#t=0.001`} playsInline preload="auto"
        className="absolute inset-0 w-full h-full object-contain"
        onLoadedMetadata={caricato}
        onLoadedData={disegna}
        onSeeked={disegna}
        onPlay={() => setInPausa(false)}
        onPause={() => setInPausa(true)}
        onEnded={() => setInPausa(true)}
        onError={(e) => setErrore(messaggioErrore(e.currentTarget.error?.code))}
        onClick={playPausa} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />

      {/* Fascia in alto: riservata alle informazioni che arriveranno (per ora vuota). A destra solo "chiudi". */}
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/60 to-transparent pt-[env(safe-area-inset-top)]">
        <div className="h-14 px-3 flex items-center justify-end gap-2">
          <div data-fascia-info className="flex-1 min-w-0" />
          <button type="button" onClick={onChiudi} aria-label="Chiudi e togli il video"
            className="shrink-0 w-11 h-11 rounded-full bg-black/50 flex items-center justify-center text-2xl leading-none">
            ×
          </button>
        </div>
      </div>

      {errore && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div role="alert" className="max-w-sm bg-white text-abisso rounded-card p-5 shadow-flottante">
            <p className="font-bold mb-1">Video non analizzabile</p>
            <p className="text-sm text-slate-500 mb-4">{errore}</p>
            <button type="button" onClick={onChiudi} className="w-full min-h-[44px] rounded-campo bg-blue-600 text-white font-bold">
              Scegli un altro video
            </button>
          </div>
        </div>
      )}

      {esito && (
        <div role="status" className="absolute top-[calc(env(safe-area-inset-top)+4rem)] inset-x-0 flex justify-center px-4">
          <span className="bg-black/75 rounded-full px-4 py-2 text-sm font-semibold">{esito}</span>
        </div>
      )}

      {/* Comandi in basso */}
      {!errore && (
        <div ref={comandiRef} className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-6 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex justify-between text-xs font-semibold tabular-nums px-1">
            <span>{scriviTempo(tempo)}</span>
            <span className="text-white/60">{scriviTempo(durata)}</span>
          </div>
          <input type="range" min={0} max={durata || 0} step={0.01} value={Math.min(tempo, durata || 0)}
            onChange={(e) => vaiA(Number(e.target.value))} disabled={!pronto}
            aria-label="Posizione nel video" className="w-full accent-blue-500 h-8" />
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={playPausa} disabled={!pronto} aria-label={inPausa ? 'Riproduci' : 'Pausa'}
              className="shrink-0 w-11 h-11 rounded-full bg-white text-abisso flex items-center justify-center disabled:opacity-40">
              {inPausa
                ? <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>
                : <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></svg>}
            </button>
            <button type="button" onClick={() => fotogramma(-1)} disabled={!pronto} aria-label="Fotogramma precedente"
              className="shrink-0 w-11 h-11 rounded-full bg-white/15 flex items-center justify-center disabled:opacity-40">
              <Icona nome="freccia" className="w-5 h-5 rotate-180" />
            </button>
            <button type="button" onClick={() => fotogramma(1)} disabled={!pronto} aria-label="Fotogramma successivo"
              className="shrink-0 w-11 h-11 rounded-full bg-white/15 flex items-center justify-center disabled:opacity-40">
              <Icona nome="freccia" className="w-5 h-5" />
            </button>
            <span className="flex-1" />
            <button type="button" onClick={cambiaVelocita} disabled={!pronto} aria-label={`Velocità di riproduzione ${velocita}x`}
              className="shrink-0 min-w-[52px] h-11 px-2 rounded-full bg-white/15 text-sm font-bold disabled:opacity-40">
              {String(velocita).replace('.', ',')}×
            </button>
            <button type="button" onClick={schermata} disabled={!pronto}
              className="shrink-0 h-11 px-4 rounded-full bg-blue-500 text-white text-sm font-bold disabled:opacity-40">
              Screenshot
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnalisiVideo() {
  const [video, setVideo] = useState(null) // { url, nome }
  const [errore, setErrore] = useState('')

  // Il video vive solo nella memoria del browser: quando si chiude (o si lascia la pagina) si libera
  useEffect(() => () => { if (video) URL.revokeObjectURL(video.url) }, [video])

  function scegli(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    // alcuni telefoni non dicono il tipo: in quel caso si prova comunque ad aprirlo
    if (file.type && !file.type.startsWith('video/')) {
      setErrore('Il file scelto non è un video.')
      return
    }
    setErrore('')
    setVideo({ url: URL.createObjectURL(file), nome: file.name })
  }

  return (
    <AppShell titolo="Analisi video" attiva="funzioni" indietro="/funzioni">
      <div className="bg-white rounded-card p-5 shadow-card">
        <h2 className="font-display text-xl font-extrabold text-abisso mb-1">Velocità dell'atleta dal video</h2>
        <p className="text-sm text-slate-500 mb-4">
          Carica un video di nuoto dal telefono o dal PC: lo guardi a tutto schermo e puoi salvare lo screenshot di un fotogramma.
          Il calcolo della velocità arriva nei prossimi passi.
        </p>
        <label className="cliccabile flex items-center justify-center gap-2 w-full min-h-[52px] rounded-campo bg-blue-600 text-white font-bold cursor-pointer">
          <Icona nome="video" className="w-5 h-5" />
          Scegli un video
          <input type="file" accept="video/*" className="sr-only" onChange={scegli} />
        </label>
        {errore && <p role="alert" className="mt-3 text-sm font-semibold text-stato-errore">{errore}</p>}
        <p className="mt-4 text-xs text-slate-500">
          Il video resta sul tuo dispositivo: non viene caricato su nessun server né salvato nell'app.
          Quando chiudi, viene tolto. Si conservano solo gli screenshot che salvi tu.
        </p>
      </div>
      {video && <Lettore key={video.url} url={video.url} nome={video.nome} onChiudi={() => setVideo(null)} />}
    </AppShell>
  )
}
