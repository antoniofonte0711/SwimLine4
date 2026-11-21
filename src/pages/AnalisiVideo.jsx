import { useCallback, useEffect, useRef, useState } from 'react'
import AppShell from '../components/AppShell'
import Icona from '../components/Icona'
import { disegnaInseguimento, disegnaRiquadri, rettangoloVideo } from '../lib/analisiVideo/overlay'
import { salvaFile, salvaSchermata } from '../lib/analisiVideo/schermata'
import { STILI, valoriAl } from '../lib/analisiVideo/serie'
import { correggi, eseguiAnalisi } from '../lib/analisiVideo/analisi'
import { esportaVideo, esportazionePossibile } from '../lib/analisiVideo/esporta'
import { PannelloRisultati } from '../components/analisiVideo/PannelloAnalisi'

// Analisi video: si carica un video dal dispositivo e si tocca il nuotatore. L'app analizza tutto il video
// (al centro: "Analizzo il video" con la percentuale), capisce da sola in che punto della vasca è il nuotatore
// (cambi di colore dei galleggianti a 5 m dalle pareti, vedi zone.js) e alla fine fa ripartire il video con
// velocità istantanea e media scritte sopra, al tempo del video.
// Il video NON va su nessun server e non entra nel database: resta nella memoria del browser e viene tolto
// quando si chiude. Si conservano solo gli screenshot o il video con i dati che il coach decide di salvare.

// Messaggi chiari per i video che il dispositivo non riesce ad aprire
function messaggioErrore(codice) {
  if (codice === 4) return 'Questo video non si apre su questo dispositivo. Succede spesso con i video HEVC dell\'iPhone aperti su un PC Windows: aprilo dal telefono che l\'ha girato, prova con Edge oppure, sull\'iPhone, Impostazioni → Fotocamera → Formati → "Più compatibile".'
  if (codice === 3) return 'Il video è danneggiato o usa un formato che il dispositivo non sa leggere fino in fondo. Prova con un altro file.'
  return 'Il video non si è aperto. Riprova o scegli un altro file.'
}

// 75.34 -> "1:15,3"
const num1 = (v) => v.toFixed(1).replace('.', ',')

export function scriviTempo(s) {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1).replace('.', ',')}`
}

const VELOCITA_RIPRODUZIONE = [1, 0.5, 0.25]
const PASSO = 1 / 30
const VUOTO = { istantanea: null, media: null, fase: null, affidabilita: null }

// campione più vicino al tempo t
function campioneAl(campioni, t) {
  if (!campioni?.length || t < campioni[0].t - 0.1 || t > campioni[campioni.length - 1].t + 0.1) return null
  let lo = 0, hi = campioni.length - 1
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (campioni[m].t <= t) lo = m
    else hi = m
  }
  return Math.abs(campioni[hi].t - t) < Math.abs(campioni[lo].t - t) ? campioni[hi] : campioni[lo]
}

function Lettore({ url, nome, onChiudi, stile, vasca }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const areaRef = useRef(null) // zona del video (con un pannello aperto lascia spazio sotto)
  const comandiRef = useRef(null)
  const pannelloRef = useRef(null)
  const [pronto, setPronto] = useState(false)
  const [inPausa, setInPausa] = useState(true)
  const [tempo, setTempo] = useState(0)
  const [durata, setDurata] = useState(0)
  const [velocita, setVelocita] = useState(1)
  const [errore, setErrore] = useState('')
  const [esito, setEsito] = useState('')

  // 'scegli' (si tocca il nuotatore) | 'guarda' | 'risultati' | 'correggi'
  const [modo, setModo] = useState('scegli')
  const [altezzaPannello, setAltezzaPannello] = useState(0)

  // Analisi
  const [analisi, setAnalisi] = useState(null) // stato del motore: campioni, serie, scala, avanzamento, finito
  const [inCorso, setInCorso] = useState(false)
  const [dubbioDaCorreggere, setDubbioDaCorreggere] = useState(null)
  const [scaricando, setScaricando] = useState(null)
  const annullaRef = useRef(false)
  const stileAnalisi = useRef('crawl')

  const stato = useRef({})
  stato.current = { modo, analisi }
  // solo in sviluppo: per le verifiche dalla console
  useEffect(() => { if (import.meta.env.DEV) window.__analisiVideo = analisi }, [analisi])

  const conPannello = modo === 'risultati'

  // Disegna sopra il video: riquadri della velocità e riquadro attorno al nuotatore
  const disegna = useCallback(() => {
    const v = videoRef.current
    const c = canvasRef.current
    const area = areaRef.current
    if (!v || !c || !area) return
    const dpr = window.devicePixelRatio || 1
    const cw = area.clientWidth
    const ch = area.clientHeight
    if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
      c.width = Math.round(cw * dpr)
      c.height = Math.round(ch * dpr)
    }
    const ctx = c.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cw, ch)
    if (!v.videoWidth) return
    const r = rettangoloVideo(cw, ch, v.videoWidth, v.videoHeight)
    const s = stato.current
    if (!s.analisi?.finito) return // prima e durante l'analisi: video pulito
    const dati = s.analisi?.serie ? valoriAl(s.analisi.serie, v.currentTime, stileAnalisi.current) : VUOTO
    if (s.analisi) {
      const camp = campioneAl(s.analisi.campioni, v.currentTime)
      if (camp) disegnaInseguimento(ctx, r, (r.w / v.videoWidth) * s.analisi.fattore, camp, dati.affidabilita)
    }
    // se i comandi in basso coprono il video, i riquadri salgono sopra di loro
    const hComandi = s.modo === 'guarda' ? comandiRef.current?.offsetHeight || 0 : 0
    const coperto = Math.max(0, r.y + r.h - (ch - hComandi))
    disegnaRiquadri(ctx, r, dati, { margineBasso: coperto })
  }, [])

  useEffect(() => { disegna() }, [modo, analisi, altezzaPannello, disegna])

  // Aggiorna tempo e disegno a ogni fotogramma mostrato
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
    if (areaRef.current) ro.observe(areaRef.current)
    return () => ro.disconnect()
  }, [disegna])

  // altezza del pannello aperto: il video si restringe sopra di lui, così nulla resta coperto
  useEffect(() => {
    if (!conPannello || !pannelloRef.current) { setAltezzaPannello(0); return }
    const el = pannelloRef.current
    const ro = new ResizeObserver(() => setAltezzaPannello(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [conPannello, modo])

  // Mentre il lettore è aperto la pagina sotto non scorre; chiudendo si ferma l'analisi
  useEffect(() => {
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prima; annullaRef.current = true }
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
      const dati = analisi?.serie ? valoriAl(analisi.serie, v.currentTime, stileAnalisi.current) : VUOTO
      setEsito(await salvaSchermata(v, dati))
    } catch {
      setEsito('Screenshot non riuscito su questo dispositivo.')
    }
  }

  useEffect(() => {
    if (!esito) return
    const t = setTimeout(() => setEsito(''), 5000)
    return () => clearTimeout(t)
  }, [esito])

  // ---- Tocchi sul video: nuotatore da seguire, correzione ----
  // da coordinate dello schermo a pixel del video (null se fuori dall'immagine)
  function aVideo(e) {
    const v = videoRef.current
    const area = areaRef.current
    const b = area.getBoundingClientRect()
    const r = rettangoloVideo(b.width, b.height, v.videoWidth, v.videoHeight)
    const sx = e.clientX - b.left
    const sy = e.clientY - b.top
    if (sx < r.x || sx > r.x + r.w || sy < r.y || sy > r.y + r.h) return null
    const k = v.videoWidth / r.w
    return { x: (sx - r.x) * k, y: (sy - r.y) * k }
  }
  function tocco(e) {
    if (!pronto || inCorso) return
    const p = aVideo(e)
    if (!p) return
    if (modo === 'scegli') avviaAnalisi(p)
    else if (modo === 'correggi') avviaCorrezione(p)
  }

  // ---- Analisi ----
  async function avviaAnalisi(tap) {
    const v = videoRef.current
    v.pause()
    const tInizio = v.currentTime
    stileAnalisi.current = stile
    annullaRef.current = false
    setInCorso(true)
    setAnalisi(null)
    try {
      const fine = await eseguiAnalisi(
        { url, tInizio, tFine: durata, tap, camera: 'movimento', stile, vasca, calib: null, punti: [], tCalib: 0 },
        { onAggiornamento: (s) => setAnalisi({ ...s }), annullato: () => annullaRef.current },
      )
      if (annullaRef.current) { setAnalisi(null); return }
      if (fine.nonMisurabile) { setAnalisi(null); setErrore(fine.nonMisurabile); return }
      setAnalisi({ ...fine, avanzamento: 1, finito: true })
      // il "video con i dati": riparte da dove è iniziata l'analisi, al tempo del video, con i numeri sopra
      rivedi(tInizio)
    } catch {
      setEsito('Analisi non riuscita: il video non si riesce a leggere fotogramma per fotogramma su questo dispositivo.')
      setAnalisi(null)
    } finally {
      setInCorso(false)
    }
  }

  function chiediCorrezione(d) {
    setDubbioDaCorreggere(d)
    vaiA(d.da)
    setModo('correggi')
  }

  async function avviaCorrezione(tap) {
    const d = dubbioDaCorreggere
    if (!d || !analisi) return
    setModo('guarda')
    setInCorso(true)
    annullaRef.current = false
    try {
      await correggi(analisi, { da: d.da, a: d.a, tap }, { onAggiornamento: (s) => setAnalisi({ ...s }), annullato: () => annullaRef.current })
      setEsito('Correzione fatta.')
      rivedi(d.da)
    } catch {
      setEsito('Correzione non riuscita.')
    } finally {
      setInCorso(false)
      setDubbioDaCorreggere(null)
    }
  }

  // Rivedi il video analizzato dall'inizio (senza audio: così parte da solo su tutti i telefoni)
  function rivedi(t) {
    const v = videoRef.current
    if (!v) return
    const da = t ?? analisi?.serie?.t?.[0] ?? 0
    setModo('guarda')
    v.muted = true
    v.currentTime = da
    setTempo(da)
    v.play().catch(() => {})
  }

  async function scaricaVideo() {
    if (!analisi?.serie?.t.length) return
    setScaricando(0)
    annullaRef.current = false
    try {
      const t = analisi.serie.t
      const r = await esportaVideo({
        url, da: t[0], a: t[t.length - 1], serie: analisi.serie, stile: stileAnalisi.current,
        onAvanzamento: (p) => setScaricando(p), annullato: () => annullaRef.current,
      })
      if (r) setEsito(await salvaFile(r.blob, `swimline4-analisi.${r.estensione}`))
    } catch {
      setEsito('Su questo dispositivo non si riesce a creare il video. Usa gli screenshot.')
    } finally {
      setScaricando(null)
    }
  }

  function chiudi() {
    if (analisi && !window.confirm('Chiudere il video? L\'analisi non viene salvata e andrà persa.')) return
    annullaRef.current = true
    onChiudi()
  }

  const tocchiAttivi = (modo === 'scegli' || modo === 'correggi') && !inCorso
  const avanzamento = inCorso ? (analisi?.avanzamento ?? 0) : null
  const tratto = analisi?.finito ? analisi.tratto : null
  const mediaTotale = analisi?.finito ? analisi.serie?.riepilogo?.media : null

  return (
    <div className="fixed inset-0 z-[70] bg-black text-white select-none" role="dialog" aria-label={`Analisi video: ${nome}`}>
      <div ref={areaRef} className="absolute inset-x-0 top-0" style={{ bottom: conPannello ? altezzaPannello : 0 }}>
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
          onClick={modo === 'guarda' ? playPausa : undefined} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />
        {tocchiAttivi && (
          <div className="absolute inset-0 cursor-crosshair" style={{ touchAction: 'none' }}
            onPointerUp={tocco} aria-label="Tocca il nuotatore da seguire" />
        )}
      </div>

      {/* Fascia in alto: tratto della vasca e media del tratto (dopo l'analisi). A destra "chiudi". */}
      <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/60 to-transparent pt-[env(safe-area-inset-top)] pointer-events-none">
        <div className="h-14 px-3 flex items-center justify-end gap-2">
          <div data-fascia-info className="flex-1 min-w-0 text-sm font-semibold">
            {mediaTotale != null && modo !== 'risultati' && (
              <span className="inline-block bg-black/55 rounded-full px-3 py-1.5">
                {tratto ? `Dal metro ${num1(tratto.da)} al ${num1(tratto.a)} · ` : ''}media {mediaTotale.toFixed(2).replace('.', ',')} m/s
              </span>
            )}
          </div>
          <button type="button" onClick={chiudi} aria-label="Chiudi e togli il video"
            className="pointer-events-auto shrink-0 w-11 h-11 rounded-full bg-black/50 flex items-center justify-center text-2xl leading-none">
            ×
          </button>
        </div>
      </div>

      {modo === 'correggi' && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+3.75rem)] inset-x-0 flex justify-center px-4">
          <div className="bg-blue-500 rounded-campo px-4 py-2 text-sm font-bold flex items-center gap-3 shadow-flottante">
            Tocca il nuotatore giusto ({scriviTempo(dubbioDaCorreggere?.da)})
            <button type="button" onClick={() => setModo('risultati')} className="underline">Annulla</button>
          </div>
        </div>
      )}

      {/* Solo una scritta piccola che NON blocca i tocchi (pointer-events-none): stile e vasca si scelgono
          prima di aprire il video, così niente copre il nuotatore */}
      {modo === 'scegli' && !inCorso && pronto && !errore && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] inset-x-0 flex justify-center px-16 pointer-events-none">
          <p className="bg-blue-600/90 rounded-full px-4 py-2 text-sm font-bold text-center shadow-flottante">
            Tocca il nuotatore da analizzare
          </p>
        </div>
      )}

      {avanzamento !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-6" role="status" aria-live="polite">
          <div className="w-full max-w-xs text-center">
            <p className="font-display text-2xl font-extrabold">{dubbioDaCorreggere ? 'Correggo' : 'Analizzo il video'}</p>
            <p className="font-display text-6xl font-extrabold tabular-nums my-3">{Math.round(avanzamento * 100)}%</p>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-blue-500 transition-[width]" style={{ width: `${Math.round(avanzamento * 100)}%` }} />
            </div>
            <p className="text-[12px] text-white/70 mt-3">Tieni la pagina aperta: alla fine il video riparte con le velocità sopra.</p>
            <button type="button" onClick={() => { annullaRef.current = true }} className="mt-4 h-10 px-5 rounded-full bg-white/15 text-sm font-bold">Annulla</button>
          </div>
        </div>
      )}

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
        <div role="status" className="absolute top-[calc(env(safe-area-inset-top)+4rem)] inset-x-0 flex justify-center px-4 pointer-events-none">
          <span className="bg-black/80 rounded-full px-4 py-2 text-sm font-semibold text-center">{esito}</span>
        </div>
      )}

      {/* Pannelli in basso */}
      {!errore && conPannello && (
        <div ref={pannelloRef} className="absolute bottom-0 inset-x-0">
          {modo === 'risultati' && analisi && (
            <PannelloRisultati analisi={analisi} onCorreggi={chiediCorrezione} onScarica={scaricaVideo} scaricando={scaricando}
              esportabile={esportazionePossibile()}
              onRivedi={() => rivedi()}
              onNuova={() => { videoRef.current?.pause(); setAnalisi(null); setModo('scegli') }} onChiudi={() => setModo('guarda')} />
          )}
        </div>
      )}
      {/* Comandi in basso */}
      {!errore && avanzamento === null && (modo === 'guarda' || modo === 'correggi' || modo === 'scegli') && (
        <div ref={comandiRef} className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-6 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex justify-between text-xs font-semibold tabular-nums px-1">
            <span>{scriviTempo(tempo)}</span>
            <span className="text-white/60">{scriviTempo(durata)}</span>
          </div>
          <input type="range" min={0} max={durata || 0} step={0.01} value={Math.min(tempo, durata || 0)}
            onChange={(e) => vaiA(Number(e.target.value))} disabled={!pronto}
            aria-label="Posizione nel video" className="w-full accent-blue-500 h-8" />
          <div className="flex items-center gap-1">
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
              className="shrink-0 min-w-[44px] h-11 px-2 rounded-full bg-white/15 text-sm font-bold disabled:opacity-40">
              {String(velocita).replace('.', ',')}×
            </button>
            {analisi?.finito && (
              <button type="button" onClick={() => { videoRef.current?.pause(); setModo('risultati') }}
                className="shrink-0 h-11 px-3 rounded-full bg-blue-500 text-sm font-bold">
                Risultati
              </button>
            )}
            <button type="button" onClick={schermata} disabled={!pronto} aria-label="Screenshot"
              className="shrink-0 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center disabled:opacity-40">
              <Icona nome="fotocamera" className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnalisiVideo() {
  const [video, setVideo] = useState(null) // { url, nome }
  const [stile, setStile] = useState('crawl')
  const [vasca, setVasca] = useState(25)
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
          Scegli stile e vasca, carica il video e tocca il nuotatore: l'app analizza il video, capisce da sola
          in che punto della vasca è e te lo rifà vedere con la velocità e la media in m/s.
        </p>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Stile</p>
        <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Stile">
          {STILI.map(([k, n]) => (
            <button key={k} type="button" onClick={() => setStile(k)} aria-pressed={stile === k}
              className={`h-10 px-4 rounded-full text-sm font-bold ${stile === k ? 'bg-abisso text-white' : 'bg-slate-100 text-abisso'}`}>{n}</button>
          ))}
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Vasca</p>
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Lunghezza della vasca">
          {[25, 50].map((v) => (
            <button key={v} type="button" onClick={() => setVasca(v)} aria-pressed={vasca === v}
              className={`h-10 px-4 rounded-full text-sm font-bold ${vasca === v ? 'bg-abisso text-white' : 'bg-slate-100 text-abisso'}`}>{v} m</button>
          ))}
        </div>
        <label className="cliccabile flex items-center justify-center gap-2 w-full min-h-[52px] rounded-campo bg-blue-600 text-white font-bold cursor-pointer">
          <Icona nome="video" className="w-5 h-5" />
          Scegli un video
          <input type="file" accept="video/*" className="sr-only" onChange={scegli} />
        </label>
        {errore && <p role="alert" className="mt-3 text-sm font-semibold text-stato-errore">{errore}</p>}
        <p className="mt-4 text-xs text-slate-500">
          Il video resta sul tuo dispositivo: non viene caricato su nessun server né salvato nell'app.
          Quando chiudi, viene tolto insieme all'analisi. Si conservano solo gli screenshot e i video con i dati che salvi tu.
        </p>
      </div>
      <div className="bg-white rounded-card p-5 shadow-card mt-3 text-sm text-slate-500">
        <p className="font-bold text-abisso mb-1">Per un risultato affidabile</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Riprendi di lato: la corsia deve attraversare l'immagine da sinistra a destra (non dalla testata della vasca).</li>
          <li>Si devono vedere le due file di galleggianti ai lati del nuotatore.</li>
          <li>Più vasca si vede, più i metri sono precisi: con i due cambi di colore dei 5 m nel video la misura è esatta.</li>
          <li>Dove l'immagine non basta l'app lascia un buco ("—") invece di un numero sbagliato.</li>
        </ul>
      </div>
      {video && <Lettore key={video.url} url={video.url} nome={video.nome} stile={stile} vasca={vasca} onChiudi={() => setVideo(null)} />}
    </AppShell>
  )
}
