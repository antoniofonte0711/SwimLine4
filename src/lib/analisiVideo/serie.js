// Dai campioni del motore ai numeri sul video: posizione in metri, velocità istantanea, media,
// media per ciclo (delfino e rana), fase (subacquea / superficie), affidabilità, punti dubbi.
// Regola: dove i dati non bastano il valore è null ("—" sul video), mai un numero inventato.

export const STILI = [
  ['crawl', 'Crawl'],
  ['dorso', 'Dorso'],
  ['delfino', 'Delfino'],
  ['rana', 'Rana'],
]
export const aCicli = (stile) => stile === 'delfino' || stile === 'rana'
const V_MAX = 3.2 // m/s: oltre è un errore di misura (record mondiali ~2,4 m/s)
const ACC_MAX = 1.2 // m/s²: crawl e dorso, velocità media di bracciata

// opts: { mpp, qualitaScala: 'alta'|'media'|'bassa', calib (statica), fattore, camera, stile }
export function posizioni(campioni, opts) {
  const statica = opts.camera === 'ferma' && opts.calib?.ok
  return campioni.map((c) => {
    if (!c.trovato || c.x === null) return null
    if (statica) {
      const m = opts.calib.metri(c.x * opts.fattore, c.y * opts.fattore)
      return Number.isFinite(m) ? m : null
    }
    if (c.u === null || !opts.mpp) return null
    return c.u * opts.mpp
  })
}

// Il riquadro del nuotatore "balla" (passa dalla testa al braccio, schizzi): la sua posizione
// nell'inquadratura si ammorbidisce (mediana, poi media), mentre lo scorrimento della vasca, misurato sui
// galleggianti e già preciso, resta com'è. Senza, la velocità istantanea saltava da 0 a 3 m/s nello stesso
// tratto a velocità costante. Nel delfino e nella rana la finestra è corta: la velocità dentro il ciclo è
// proprio ciò che interessa. Nel crawl e nel dorso si adatta una parabola su ±1 s: il riquadro insegue anche
// il braccio che esce dall'acqua (oscillazione a ogni bracciata, ~1,5 s) e la parabola non riesce a seguirla.
export function ammorbidisci(campioni, m, opts, statica) {
  const n = m.length
  const cicli = aCicli(opts.stile)
  const semiMed = cicli ? 0.08 : 0.5, semiMedia = cicli ? 0.06 : 1.0
  const base = campioni.map((c, i) => (m[i] === null ? null : statica ? 0 : c.ucam === null || c.ucam === undefined ? null : c.ucam * opts.mpp))
  const off = m.map((v, i) => (v === null || base[i] === null ? null : v - base[i]))
  const cat = campioni.map((c) => (statica ? 0 : c.catena))
  const t = campioni.map((c) => c.t)
  // inizio e fine di ogni catena: vicino ai bordi la finestra si stringe e resta SIMMETRICA, sennò
  // sposterebbe in avanti il primo punto e indietro l'ultimo (distanza e media più corte del vero)
  const primoT = new Map(), ultimoT = new Map()
  for (let i = 0; i < n; i++) if (off[i] !== null) { if (!primoT.has(cat[i])) primoT.set(cat[i], t[i]); ultimoT.set(cat[i], t[i]) }
  const filtra = (val, semi, fn) => val.map((v, i) => {
    if (v === null) return null
    const sm = Math.min(semi, t[i] - primoT.get(cat[i]), ultimoT.get(cat[i]) - t[i])
    const ts = [], xs = []
    for (let j = i; j >= 0 && t[j] >= t[i] - sm - 1e-9; j--) if (val[j] !== null && cat[j] === cat[i]) { ts.push(t[j] - t[i]); xs.push(val[j]) }
    for (let j = i + 1; j < n && t[j] <= t[i] + sm + 1e-9; j++) if (val[j] !== null && cat[j] === cat[i]) { ts.push(t[j] - t[i]); xs.push(val[j]) }
    return fn(xs, ts)
  })
  const mediana = (xs) => { const o = [...xs].sort((p, q) => p - q); return o[o.length >> 1] }
  const liscio = filtra(filtra(off, semiMed, mediana), semiMedia, cicli ? mediaSemplice : parabola)
  return m.map((v, i) => (v === null ? null : base[i] === null ? v : base[i] + liscio[i]))
}

const mediaSemplice = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length

// Valore in 0 della parabola che passa meglio tra i punti (ts relativi al punto): segue i cambi lenti
// (la camera che resta indietro e poi recupera) ma non l'oscillazione di ogni bracciata, più veloce.
// Con pochi punti, o punti tutti da una parte, si ripiega sulla media.
function parabola(xs, ts) {
  const n = xs.length
  if (n < 5) return mediaSemplice(xs)
  let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0, y0 = 0, y1 = 0, y2 = 0
  for (let k = 0; k < n; k++) {
    const u = ts[k], u2 = u * u
    s1 += u; s2 += u2; s3 += u2 * u; s4 += u2 * u2
    y0 += xs[k]; y1 += xs[k] * u; y2 += xs[k] * u2
  }
  // sistema 3×3 (Cramer) per a + b·u + c·u²; serve solo a
  const det = s0 * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2)
  if (Math.abs(det) < 1e-12) return mediaSemplice(xs)
  const da = y0 * (s2 * s4 - s3 * s3) - s1 * (y1 * s4 - s3 * y2) + s2 * (y1 * s3 - s2 * y2)
  return da / det
}

// Pendenza (m/s) e scarto della retta che passa meglio tra i punti
function retta(ts, ms) {
  const n = ts.length
  const mt = ts.reduce((s, x) => s + x, 0) / n
  const mm = ms.reduce((s, x) => s + x, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (ts[i] - mt) * (ms[i] - mm); den += (ts[i] - mt) ** 2 }
  const k = den > 0 ? num / den : 0
  let r = 0
  for (let i = 0; i < n; i++) r += (ms[i] - (mm + k * (ts[i] - mt))) ** 2
  return { k, rms: Math.sqrt(r / n) }
}

export function calcolaSerie(campioni, opts) {
  const n = campioni.length
  const statica = opts.camera === 'ferma' && opts.calib?.ok
  const m = ammorbidisci(campioni, posizioni(campioni, opts), opts, statica)
  const t = campioni.map((c) => c.t)
  const catena = campioni.map((c) => (statica ? 0 : c.catena))
  const dtMedio = n > 1 ? (t[n - 1] - t[0]) / (n - 1) : 1 / 30
  const cicli = aCicli(opts.stile)
  // finestra della velocità istantanea (s): nel crawl e nel dorso circa una bracciata
  const fin = cicli ? 0.3 : 1.0

  // velocità istantanea: pendenza della posizione in una finestra breve centrata
  const v = new Array(n).fill(null)
  const rms = new Array(n).fill(null)
  let j0 = 0, j1 = 0
  for (let i = 0; i < n; i++) {
    if (m[i] === null) continue
    while (t[j0] < t[i] - fin / 2) j0++
    while (j1 < n - 1 && t[j1 + 1] <= t[i] + fin / 2) j1++
    const ts = [], ms = []
    for (let j = j0; j <= j1; j++) if (m[j] !== null && catena[j] === catena[i]) { ts.push(t[j]); ms.push(m[j]) }
    const attesi = Math.max(4, Math.round(fin / dtMedio) + 1)
    if (ts.length < Math.max(4, attesi * 0.6)) continue
    const r = retta(ts, ms)
    const vel = Math.abs(r.k)
    if (vel > V_MAX) continue
    v[i] = vel
    rms[i] = r.rms
  }

  // Nel crawl e nel dorso la velocità di una bracciata non cambia di più di ~1,2 m/s in un secondo
  // (tuffo e virata a parte, che sono all'inizio dell'analisi). Un cambio più brusco è il riquadro che
  // ha sbagliato posto: lì la velocità istantanea non si mostra ("—"), la media resta.
  const impossibile = new Array(n).fill(false)
  if (!cicli) {
    for (let i = 0; i < n; i++) {
      if (v[i] === null) continue
      for (let j = i + 1; j < n && t[j] - t[i] <= 1.0; j++) {
        if (v[j] === null || catena[j] !== catena[i]) continue
        if (Math.abs(v[j] - v[i]) > ACC_MAX * Math.max(t[j] - t[i], 0.5)) {
          for (let k = i; k <= j; k++) impossibile[k] = true
        }
      }
    }
  }

  // media dall'inizio dell'analisi (stessa catena): distanza / tempo
  const media = new Array(n).fill(null)
  const primo = new Map()
  for (let i = 0; i < n; i++) {
    if (m[i] === null) continue
    if (!primo.has(catena[i])) primo.set(catena[i], i)
    const k = primo.get(catena[i])
    const dt = t[i] - t[k]
    if (dt >= 1) {
      const vm = Math.abs(m[i] - m[k]) / dt
      if (vm <= V_MAX) media[i] = vm
    }
  }

  // media per ciclo (delfino, rana): tra due minimi consecutivi della velocità
  const ciclo = new Array(n).fill(null)
  const limitiCicli = []
  if (cicli) {
    const minimi = []
    const primoV = v.findIndex((x) => x !== null)
    let ultimoV = -1
    for (let i = n - 1; i >= 0; i--) if (v[i] !== null) { ultimoV = i; break }
    for (let i = 1; i < n - 1; i++) {
      if (v[i] === null) continue
      // ai bordi dei dati un "minimo" non è sicuro
      if (t[i] - t[primoV] < 0.3 || t[ultimoV] - t[i] < 0.3) continue
      // minimo locale in ±0,3 s
      let eMinimo = true
      for (let j = i - 1; j >= 0 && t[j] >= t[i] - 0.3; j--) if (v[j] !== null && v[j] < v[i]) { eMinimo = false; break }
      if (eMinimo) for (let j = i + 1; j < n && t[j] <= t[i] + 0.3; j++) if (v[j] !== null && v[j] <= v[i]) { eMinimo = false; break }
      if (!eMinimo) continue
      if (minimi.length && t[i] - t[minimi[minimi.length - 1]] < 0.6) continue
      minimi.push(i)
    }
    // un minimo vero è ben più basso del picco che lo separa dal precedente (sennò è rumore)
    for (let k = minimi.length - 1; k >= 1; k--) {
      const a = minimi[k - 1], b = minimi[k]
      let picco = 0
      for (let j = a; j <= b; j++) if (v[j] !== null) picco = Math.max(picco, v[j])
      if (picco - Math.max(v[a], v[b]) < 0.12) minimi.splice(v[a] > v[b] ? k - 1 : k, 1)
    }
    for (let k = 1; k < minimi.length; k++) {
      const a = minimi[k - 1], b = minimi[k]
      if (catena[a] !== catena[b] || m[a] === null || m[b] === null) continue
      const dur = t[b] - t[a]
      if (dur > 3) continue
      const vc = Math.abs(m[b] - m[a]) / dur
      if (vc > V_MAX) continue
      limitiCicli.push({ da: t[a], a: t[b], v: vc })
      // il valore vale dal ciclo concluso fino alla fine del successivo
      const fine = k + 1 < minimi.length ? minimi[k + 1] : n
      for (let i = b; i < fine; i++) ciclo[i] = vc
    }
  }

  // fase: schiuma attorno al nuotatore (massimo in ±0,6 s: copre una bracciata)
  const S = campioni.map((c) => c.schiuma)
  const Smax = new Array(n).fill(null)
  for (let i = 0; i < n; i++) {
    let mx = null
    for (let j = i; j >= 0 && t[j] >= t[i] - 0.6; j--) if (S[j] !== null) mx = Math.max(mx ?? 0, S[j])
    for (let j = i + 1; j < n && t[j] <= t[i] + 0.6; j++) if (S[j] !== null) mx = Math.max(mx ?? 0, S[j])
    Smax[i] = mx
  }
  const validi = Smax.filter((x) => x !== null).sort((a, b) => a - b)
  const fase = new Array(n).fill(null)
  const fiduciaFase = new Array(n).fill(0)
  if (validi.length) {
    const lo = validi[Math.floor(validi.length * 0.05)], hi = validi[Math.floor(validi.length * 0.95)]
    const ampiezza = hi - lo
    // c'è contrasto tra tratti calmi e tratti con schizzi? Se no, non si può distinguere: si assume
    // superficie (la gran parte della nuotata) con fiducia zero
    const contrasto = hi > lo * 1.8 + 0.001
    const soglia = contrasto ? lo + 0.35 * ampiezza : -1
    const ist = contrasto ? ampiezza * 0.08 : 0
    let stato = null
    for (let i = 0; i < n; i++) {
      if (Smax[i] === null || !campioni[i].trovato) continue
      if (!contrasto) { fase[i] = 'superficie'; fiduciaFase[i] = 0; continue }
      if (stato === null) stato = Smax[i] > soglia ? 'superficie' : 'subacquea'
      else if (stato === 'superficie' && Smax[i] < soglia - ist) stato = 'subacquea'
      else if (stato === 'subacquea' && Smax[i] > soglia + ist) stato = 'superficie'
      fase[i] = stato
      fiduciaFase[i] = Math.min(1, Math.abs(Smax[i] - soglia) / Math.max(ist * 3, 1e-4))
    }
    // tratti più corti di 0,4 s sono rumore: prendono la fase dei vicini
    let i = 0
    while (i < n) {
      if (fase[i] === null) { i++; continue }
      let j = i
      while (j + 1 < n && fase[j + 1] === fase[i]) j++
      if (t[j] - t[i] < 0.4) {
        const prima = i > 0 ? fase[i - 1] : null
        const dopo = j + 1 < n ? fase[j + 1] : null
        const sost = prima || dopo
        if (sost && sost !== fase[i]) for (let k = i; k <= j; k++) fase[k] = sost
      }
      i = j + 1
    }
    // La subacquea c'è solo dopo il tuffo o la spinta dalla parete, cioè all'inizio di un tratto: una volta
    // in superficie non si torna sott'acqua (la virata fa partire una nuova analisi). Meno schiuma a metà
    // nuotata = bracciata coperta o riquadro sulla testa, non subacquea.
    {
      let visto = false
      for (let i = 0; i < n; i++) {
        if (fase[i] === 'superficie') visto = true
        else if (fase[i] === 'subacquea' && visto) fase[i] = 'superficie'
      }
    }
  }

  // affidabilità: la più bassa tra inseguimento, scala e regolarità della misura
  const livelloScala = { alta: 2, media: 1, bassa: 0 }[opts.qualitaScala] ?? 0
  const aff = new Array(n).fill(null)
  for (let i = 0; i < n; i++) {
    const c = campioni[i]
    if (!c.trovato || impossibile[i]) { aff[i] = 'bassa'; continue }
    const lt = c.conf >= 0.62 ? 2 : c.conf >= 0.45 ? 1 : 0
    // scorrimento previsto per un attimo (misura mancante): affidabile al massimo "media"
    const lc = statica ? 2 : c.previsto ? 1 : c.qualitaCorsia >= 0.6 ? 2 : c.qualitaCorsia >= 0.35 ? 1 : 0
    const lr = rms[i] === null ? 0 : rms[i] < 0.05 ? 2 : rms[i] < 0.12 ? 1 : 0
    let l = Math.min(lt, lc, livelloScala, v[i] === null ? 0 : lr)
    if (opts.camera === 'movimento') l = Math.min(l, 1)
    aff[i] = ['bassa', 'media', 'alta'][l]
  }

  // punti dubbi: tratti in cui il nuotatore è perso o la misura è poco affidabile
  const dubbi = []
  let k = 0
  while (k < n) {
    if (aff[k] !== 'bassa') { k++; continue }
    let j = k
    while (j + 1 < n && (aff[j + 1] === 'bassa' || t[j + 1] - t[j] < 0.0001)) j++
    const perso = campioni.slice(k, j + 1).some((c) => !c.trovato)
    const ultimo = dubbi[dubbi.length - 1]
    if (ultimo && t[k] - ultimo.a < 0.3) { ultimo.a = t[j]; ultimo.perso ||= perso }
    else dubbi.push({ da: t[k], a: t[j], perso })
    k = j + 1
  }
  const puntiDubbi = dubbi.filter((d) => d.a - d.da >= 0.2 || d.perso)
    .map((d) => ({ ...d, motivo: d.perso ? 'Nuotatore perso' : 'Misura incerta' }))

  // riepilogo per il controllo: distanza percorsa e tempo nella catena più lunga
  const perCatena = new Map()
  for (let i = 0; i < n; i++) {
    if (m[i] === null) continue
    const c = catena[i]
    if (!perCatena.has(c)) perCatena.set(c, { i0: i, i1: i })
    else perCatena.get(c).i1 = i
  }
  let riepilogo = null
  for (const { i0, i1 } of perCatena.values()) {
    const dur = t[i1] - t[i0]
    if (!riepilogo || dur > riepilogo.tempo) riepilogo = { distanza: Math.abs(m[i1] - m[i0]), tempo: dur, da: t[i0], a: t[i1] }
  }
  if (riepilogo) riepilogo.media = riepilogo.tempo > 0 ? riepilogo.distanza / riepilogo.tempo : null

  return { t, m, v, media, ciclo, limitiCicli, fase, fiduciaFase, aff, puntiDubbi, riepilogo }
}

// Valori da mostrare al tempo tt (il campione più vicino; fuori dall'analisi niente)
export function valoriAl(serie, tt, stile) {
  if (!serie || !serie.t.length) return { istantanea: null, media: null, ciclo: null, fase: null, affidabilita: null }
  const { t } = serie
  if (tt < t[0] - 0.1 || tt > t[t.length - 1] + 0.1) return { istantanea: null, media: null, ciclo: null, fase: null, affidabilita: null }
  let lo = 0, hi = t.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (t[mid] <= tt) lo = mid
    else hi = mid
  }
  const i = Math.abs(t[hi] - tt) < Math.abs(t[lo] - tt) ? hi : lo
  const aff = serie.aff[i]
  const ok = aff && aff !== 'bassa'
  return {
    istantanea: ok ? serie.v[i] : null,
    media: serie.media[i],
    ciclo: aCicli(stile) ? serie.ciclo[i] : undefined,
    fase: serie.fase[i],
    affidabilita: aff,
  }
}
