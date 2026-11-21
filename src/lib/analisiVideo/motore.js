// Motore dell'analisi: un fotogramma alla volta (in ordine), produce un campione per fotogramma.
//
// Coordinata "u" = posizione lungo la corsia misurata in dischetti dei galleggianti.
//  - R è la coordinata u del disegno dei galleggianti alla colonna dell'immagine `a` (l'àncora).
//  - Se la camera si muove, il disegno scorre di s pixel: R diminuisce di s / P (P = passo in pixel).
//  - Il nuotatore in colonna x è a u = R + (x − a) / P.
// Quindi la velocità vera = scorrimento della vasca + spostamento del nuotatore nell'inquadratura,
// e la scala (P) si ricalcola a ogni fotogramma proprio vicino al nuotatore.
// I metri arrivano moltiplicando u per i metri di un dischetto (dalla scala toccata o dai cambi di colore).
import { coloreAcqua, diversitaAcqua, mappaBin, mappaCaldo, classeGalleggiante, N_CLASSI } from './immagine'
import { trovaCorsie, adattaLinea, profilo, periodo, spostamento, spostamentoGrossolano, yLinea } from './corsie'
import { iniziaNuotatore, cercaNuotatore, applicaPasso, schiumaRiquadro } from './nuotatore'

const copiaLinea = (l) => (l ? { xc: l.xc, a: l.a, b: l.b } : null)

const BUCO_SCALA = 0.3 // s senza misura dello scorrimento prima di far ripartire le distanze

export class MotoreAnalisi {
  // w, h: dimensioni del fotogramma di analisi
  // camera: 'ferma' | 'movimento' (con la camera ferma lo scorrimento della vasca resta vicino a zero:
  // si misura lo stesso, per compensare la mano che trema, ma non può "scappare" di un dischetto)
  constructor({ w, h, camera = 'movimento' }) {
    this.w = w
    this.h = h
    this.camera = camera
    this.campioni = []
    this.voti = [] // per catena: Map(mezzo-dischetto → conteggi per classe di colore)
  }

  canali(img) {
    const acqua = coloreAcqua(img)
    return { w: img.w, h: img.h, img, acqua, div: diversitaAcqua(img, acqua), bin: mappaBin(img), caldo: mappaCaldo(img, acqua) }
  }

  // Metà della zona dei galleggianti da ignorare attorno al nuotatore (braccia e schizzi che li coprono).
  // NON dipende dalla lunghezza della sagoma: il nuotatore sta tra le file e le copre solo dove escono
  // braccia e schizzi. Con onde e riflessi la sagoma può sembrare lunga mezza immagine: legata a lei, la
  // maschera cancellava quasi tutto il disegno dei galleggianti e lo scorrimento della camera non si misurava più.
  mezzaMaschera() {
    return Math.min(this.n.bw * 0.7, this.w * 0.08)
  }

  rangeAttorno(x) {
    const m = Math.round(this.w * 0.3)
    return [Math.max(3, Math.round(x - m)), Math.min(this.w - 4, Math.round(x + m))]
  }

  profili(ctx, range) {
    const out = {}
    for (const k of ['sopra', 'sotto']) {
      const l = this.corsie[k]
      out[k] = l ? profilo(ctx.div, this.w, this.h, l, range[0], range[1]) : null
    }
    return out
  }

  // passo dei dischetti in pixel attorno alla colonna x, media delle due file (la corsia sta in mezzo)
  // Se vicino al nuotatore gli schizzi coprono il disegno, si riprova su una finestra più larga
  // (il passo cambia poco lungo la fila: meglio un passo un po' meno locale che nessun passo).
  periodoLocale(ctx, x) {
    return this.periodoFinestra(ctx, x, Math.max(40, Math.round(this.w * 0.12)))
      || this.periodoFinestra(ctx, x, Math.round(this.w * 0.3))
  }

  periodoFinestra(ctx, x, m) {
    const x0 = Math.max(3, Math.round(x - m)), x1 = Math.min(this.w - 4, Math.round(x + m))
    const misure = []
    this.Pfile ||= {}
    for (const lato of ['sopra', 'sotto']) {
      const l = this.corsie[lato]
      if (!l) continue
      const r = periodo(profilo(ctx.div, this.w, this.h, l, x0, x1), 3, 40)
      if (r && r.forza > 0.35) {
        misure.push(r)
        // passo di ogni fila (le file lontane hanno dischetti più piccoli): serve a cercare lo scorrimento
        const prima = this.Pfile[lato]
        this.Pfile[lato] = prima && Math.abs(r.P - prima) / prima < 0.35 ? 0.85 * prima + 0.15 * r.P : prima || r.P
      }
    }
    if (!misure.length) return null
    // Rapporto di scala tra le file già noto dagli scorrimenti: il passo della fila lontana si ricava da
    // quello della fila vicina (i dischetti lontani, piccoli e sfocati, fanno spesso leggere il doppio)
    const vic = this.filaVicina()
    if (vic && this.Pfile[vic]) {
      const forza = Math.max(...misure.map((r) => r.forza))
      return { P: (this.passoFila('sopra') + this.passoFila('sotto')) / 2, forza }
    }
    if (misure.length === 2) {
      const [p, q] = misure
      // le due file sono vicine: passi molto diversi = una misura sbagliata, si tiene la più netta
      if (Math.abs(p.P - q.P) / Math.min(p.P, q.P) > 0.4) return p.forza >= q.forza ? p : q
      return { P: (p.P * p.forza + q.P * q.forza) / (p.forza + q.forza), forza: Math.max(p.forza, q.forza) }
    }
    return misure[0]
  }

  // Rapporto di scala tra le due file (pixel per metro della fila "sopra" / della fila "sotto"), misurato
  // da quanto scorrono quando la camera si muove: non dipende dal passo dei dischetti letto sull'immagine.
  // null finché non ci sono abbastanza misure (o con la camera ferma, dove non scorre niente).
  rapportoFile() {
    const r = this.scorrimenti
    if (!r || r.n < 8 || r.sotto < 3 * (this.P || 20)) return null
    return r.sopra / r.sotto
  }

  // fila più vicina alla camera (scorre di più pixel): il suo passo dei dischetti si legge meglio
  filaVicina() {
    const k = this.rapportoFile()
    return k === null ? null : k < 1 ? 'sotto' : 'sopra'
  }

  // passo dei dischetti di una fila, coerente con la prospettiva quando il rapporto è noto
  passoFila(lato) {
    const k = this.rapportoFile()
    const vic = this.filaVicina()
    if (!vic || !this.Pfile?.[vic]) return this.Pfile?.[lato] || this.P
    if (lato === vic) return this.Pfile[vic]
    return lato === 'sopra' ? this.Pfile[vic] * k : this.Pfile[vic] / k
  }

  // tap = { x, y } in pixel di analisi
  inizia(img, t, tap) {
    const ctx = this.canali(img)
    this.corsie = trovaCorsie(ctx.div, this.w, this.h, tap.x, tap.y)
    this.n = iniziaNuotatore(ctx, tap.x, tap.y, this.corsie)
    this.catena = 0
    this.R = 0
    this.Rcam = 0 // solo la parte dovuta allo scorrimento della vasca (camera): liscia e precisa
    this.a = this.n.x
    this.prevS = 0
    this.vCam = 0 // velocità dello scorrimento della vasca nell'immagine (px/s): la previsione segue il tempo vero
    const p = this.periodoLocale(ctx, this.a)
    this.P = p?.P || null
    this.range = this.rangeAttorno(this.a)
    this.prof = this.profili(ctx, this.range)
    this.tPrec = t
    this.registra(ctx, t, { trovato: true, conf: 1, qualitaCorsia: p ? Math.min(1, p.forza + 0.3) : 0, s: 0, scalaOk: !!this.P })
    return {
      corsieTrovate: !!(this.corsie.sopra && this.corsie.sotto),
      passoTrovato: !!this.P,
    }
  }

  // Correzione di un punto dubbio: si riparte dal campione `c` (stessa vasca: file, R, àncora, passo)
  // con il nuotatore indicato da un nuovo tocco. Le distanze restano nella stessa catena.
  riprendiDa(c, img, t, tap) {
    const ctx = this.canali(img)
    this.corsie = { sopra: c.sopra ? { ...c.sopra } : null, sotto: c.sotto ? { ...c.sotto } : null }
    this.R = c.R
    this.Rcam = c.Rcam ?? c.R
    this.a = c.a
    this.P = c.P
    this.catena = c.catena
    this.prevS = c.s || 0
    this.vCam = 0
    this.storiaCam = []
    this.n = iniziaNuotatore(ctx, tap.x, tap.y, this.corsie)
    if (this.P) {
      this.R += (this.n.x - this.a) / this.P
      this.a = this.n.x
    }
    this.range = this.rangeAttorno(this.a)
    this.prof = this.profili(ctx, this.range)
    this.tPrec = t
    this.registra(ctx, t, { trovato: true, conf: 1, qualitaCorsia: c.qualitaCorsia, s: this.prevS, scalaOk: c.scalaOk })
  }

  passo(img, t) {
    const ctx = this.canali(img)
    const dt = Math.max(1e-3, t - this.tPrec)
    this.tPrec = t
    // scorrimento previsto per questo intervallo (se un fotogramma manca, dt raddoppia e la previsione pure)
    const sPrevisto = this.vCam * dt

    // 1. file di galleggianti nel nuovo fotogramma (vicino a dove erano)
    // (la fila si muove poco da un fotogramma all'altro; il nuotatore non deve "attirarla"; il disegno
    // dei dischetti deve restare regolare, sennò si tiene la linea di prima)
    const mezza = Math.round(this.w * 0.3)
    const xn = this.n.x + sPrevisto + this.n.v * dt
    const escludi = [xn - this.mezzaMaschera() * 1.15, xn + this.mezzaMaschera() * 1.15]
    for (const k of ['sopra', 'sotto']) {
      const l = this.corsie[k]
      if (!l) continue
      const nuova = adattaLinea(ctx.div, this.w, this.h, this.a, mezza, (x) => yLinea(l, x), 6, 8, escludi)
      if (!nuova) continue
      const dy = yLinea(nuova, this.a) - yLinea(l, this.a)
      if (Math.abs(dy) > 4) continue
      const lim = (q) => Math.max(-2, Math.min(2, q))
      const prova = { xc: this.a, a: yLinea(l, this.a) + lim(dy), b: l.b + Math.max(-0.01, Math.min(0.01, nuova.b - l.b)) }
      const x0 = Math.max(3, Math.round(this.a - mezza)), x1 = Math.min(this.w - 4, Math.round(this.a + mezza))
      const reg = periodo(profilo(ctx.div, this.w, this.h, prova, x0, x1), 3, 40)
      if (reg && reg.forza > 0.3) this.corsie[k] = prova
    }

    // 2. di quanto è scorso il disegno dei galleggianti (movimento della camera sul piano dell'acqua)
    const curr = this.profili(ctx, this.range)
    const maschera = (p) => {
      if (!p) return p
      const q = Float32Array.from(p)
      const xs = this.n.x + sPrevisto + this.n.v * dt
      const mm = this.mezzaMaschera()
      const da = Math.round(xs - mm) - this.range[0], a = Math.round(xs + mm) - this.range[0]
      for (let i = Math.max(0, da); i <= Math.min(q.length - 1, a); i++) q[i] = NaN
      return q
    }
    const misS = []
    if (this.P) {
      const dati = []
      for (const k of ['sopra', 'sotto']) {
        if (!this.prof[k] || !curr[k]) continue
        const Pk = this.passoFila(k)
        const pa = maschera(this.prof[k]), pb = maschera(curr[k])
        const g = this.camera !== 'ferma' ? spostamentoGrossolano(pa, pb, Pk, Math.round(Math.max(25, Pk * 3))) : null
        dati.push({ lato: k, Pk, pa, pb, g: g && g.qualita > 0.6 && g.unicita > 0.12 ? g : null })
      }
      // La stima grossolana (senza l'ambiguità dei dischetti) corregge la previsione se la camera ha
      // accelerato, ma solo se le due file dicono la stessa cosa (in dischetti): un video compresso o
      // pieno di schizzi può dare picchi falsi. Correzione massima: 3 dischetti (serve anche a sganciarsi
      // da un aggancio sbagliato, non solo all'inizio quando la velocità della camera è ignota).
      let correzione = null
      const gg = dati.filter((d) => d.g)
      if (gg.length === 2 && Math.abs(gg[0].g.s / gg[0].Pk - gg[1].g.s / gg[1].Pk) < 0.3) {
        correzione = (gg[0].g.s / gg[0].Pk + gg[1].g.s / gg[1].Pk) / 2
      }
      for (const d of dati) {
        // previsione nei pixel di QUESTA fila (la lontana scorre di meno pixel)
        const sPrevFila = (sPrevisto / this.P) * d.Pk
        let centro = sPrevFila
        if (correzione !== null) {
          const sg = correzione * d.Pk
          const maxCorr = d.Pk * 3
          const diff = Math.abs(sg - sPrevFila)
          if (diff > d.Pk * 0.4 && diff < maxCorr) centro = sg
        }
        // finestra di ricerca ±0,6 dischetti DI QUELLA FILA (le file lontane hanno dischetti più piccoli)
        const r = this.camera === 'ferma'
          ? spostamento(d.pa, d.pb, 0, d.Pk * 0.5)
          : spostamento(d.pa, d.pb, centro, d.Pk)
        if (r && r.qualita > 0.3) misS.push({ ...r, Pk: d.Pk, lato: d.lato })
      }
      // rapporto di scala tra le file: somma degli scorrimenti in pixel misurati insieme sulle due file
      const so = misS.find((r) => r.lato === 'sopra'), st = misS.find((r) => r.lato === 'sotto')
      if (so && st && Math.sign(so.s) === Math.sign(st.s) && Math.abs(so.s) > 0.5 && Math.abs(st.s) > 0.5) {
        const sc = (this.scorrimenti ||= { sopra: 0, sotto: 0, n: 0 })
        sc.sopra += Math.abs(so.s)
        sc.sotto += Math.abs(st.s)
        sc.n++
      }
    }
    // Le due file si confrontano IN DISCHETTI, non in pixel: la fila lontana scorre di meno pixel
    // (prospettiva) ma dello stesso numero di dischetti. Mediare i pixel sottostimava la velocità.
    // Due file in disaccordo (una ha "saltato" un dischetto): si tiene quella più vicina alla previsione.
    const inDischetti = (r) => r.s / r.Pk
    const dPrev = this.P ? sPrevisto / this.P : 0
    if (misS.length === 2 && Math.abs(inDischetti(misS[0]) - inDischetti(misS[1])) > 0.35) {
      misS.sort((p, q) => Math.abs(inDischetti(p) - dPrev) - Math.abs(inDischetti(q) - dPrev))
      misS.pop()
    }
    let dTot = 0, qTot = 0, qMax = 0
    for (const r of misS) { dTot += inDischetti(r) * r.qualita; qTot += r.qualita; qMax = Math.max(qMax, r.qualita) }
    const scalaOk = qTot > 0
    // Un fotogramma senza misura (schizzo, fotogramma doppio che raddoppia lo scorrimento) non deve far
    // ripartire le distanze da zero: la camera si muove in modo regolare, per un attimo si va avanti con lo
    // scorrimento previsto. Solo se la misura manca per più di BUCO_SCALA secondi la catena si spezza.
    if (scalaOk) this.tSenzaScala = 0
    else if (this.P && this.vCam !== 0) this.tSenzaScala = (this.tSenzaScala || 0) + dt
    const previsto = !scalaOk && this.P && this.vCam !== 0 && this.tSenzaScala <= BUCO_SCALA
    const avanti = scalaOk || previsto
    // scorrimento in pixel all'altezza del nuotatore (a metà corsia, dove vale il passo medio P)
    const s = scalaOk ? (dTot / qTot) * this.P : sPrevisto
    this.prevS = s
    // velocità della camera = scorrimento degli ultimi fotogrammi / tempo: un solo tempo stimato male
    // (lettura a salti, fotogramma doppio) non deve cambiare la previsione
    if (scalaOk) {
      // mediana delle ultime 3 velocità: segue le accelerazioni, ignora un valore sballato
      this.storiaCam = [...(this.storiaCam || []).slice(-2), s / dt]
      const ord = [...this.storiaCam].sort((p, q) => p - q)
      this.vCam = this.camera === 'ferma' ? 0 : ord[ord.length >> 1]
    } else this.storiaCam = []

    // 3. passo locale dei dischetti (scala che cambia con la prospettiva)
    const p = this.periodoLocale(ctx, this.a)
    if (p && this.P) {
      // un salto enorme del passo è un errore di misura, non prospettiva
      if (Math.abs(p.P - this.P) / this.P < 0.35) this.P = 0.85 * this.P + 0.15 * p.P
    } else if (p && !this.P) this.P = p.P

    if (avanti) { this.R -= s / this.P; this.Rcam -= s / this.P }

    // 4. nuotatore
    // Con la camera che segue, all'inizio la velocità del nuotatore nella vasca non si conosce ancora:
    // partire da zero vuol dire prevederlo FERMO nella vasca, cioè dove resta la sua scia, e il riquadro si
    // attacca alla scia. Si parte invece dall'ipotesi giusta per una camera che segue: resta nell'inquadratura
    // (velocità nella vasca = scorrimento della camera), finché la velocità della camera non è stabile.
    if (this.camera !== 'ferma' && !this.n.vNota) {
      if (scalaOk && (this.storiaCam?.length || 0) >= 3 && Math.abs(this.vCam) > 0) {
        this.n.v = -this.vCam
        this.n.vRif = -this.vCam
        this.n.vNota = true
      }
      else this.n.v = -s / dt
    }
    const r = cercaNuotatore(ctx, this.n, dt, s)
    applicaPasso(ctx, this.n, r, dt, s, this.corsie)

    if (!avanti && r.trovato) {
      // la vasca non si è potuta seguire: da qui le distanze ripartono (nuova catena)
      this.catena++
      this.R = 0
      this.Rcam = 0
      this.a = this.n.x
    }
    if (r.trovato && this.P) {
      this.R = this.R + (this.n.x - this.a) / this.P
      this.a = this.n.x
    }
    this.range = this.rangeAttorno(this.a)
    this.prof = this.profili(ctx, this.range)
    this.registra(ctx, t, { trovato: r.trovato, conf: r.conf, qualitaCorsia: qMax, s, scalaOk, previsto })
  }

  registra(ctx, t, { trovato, conf, qualitaCorsia, s, scalaOk, previsto = false }) {
    const n = this.n
    if (trovato && scalaOk) this.votaColori(ctx)
    this.campioni.push({
      t,
      trovato,
      conf,
      x: trovato ? n.x : null,
      y: trovato ? n.y : null,
      xPrevisto: n.x,
      bw: n.bw,
      u: trovato && (scalaOk || previsto) && this.P ? this.R : null,
      // u = ucam (scorrimento della vasca) + spostamento del nuotatore nell'inquadratura
      ucam: trovato && (scalaOk || previsto) && this.P ? this.Rcam : null,
      Rcam: this.Rcam,
      R: this.R, a: this.a, P: this.P,
      catena: this.catena,
      scalaOk,
      previsto, // scorrimento della vasca stimato (misura mancante per un attimo)
      qualitaCorsia,
      s,
      schiuma: trovato ? schiumaRiquadro(ctx.img, n) : null,
      sopra: copiaLinea(this.corsie.sopra),
      sotto: copiaLinea(this.corsie.sotto),
    })
  }

  // Colori dei galleggianti lungo la corsia, in coordinata u (per riconoscere i cambi di colore: 5 m, 15 m…)
  votaColori(ctx) {
    if (!this.P) return
    const mappa = (this.voti[this.catena] ||= new Map())
    const { img } = ctx
    // solo vicino al nuotatore (±12% della larghezza): lì il passo dei dischetti è quello misurato e i colori
    // finiscono nella stessa "u" del nuotatore. Più lontano la prospettiva li spostava (zone sbagliate del 3–5%).
    const m = Math.round(this.w * 0.12)
    const x0 = Math.max(3, Math.round(this.a - m)), x1 = Math.min(this.w - 4, Math.round(this.a + m))
    const libero = (x) => Math.abs(x - this.n.x) > this.mezzaMaschera() * 1.15
    for (const k of ['sopra', 'sotto']) {
      const l = this.corsie[k]
      if (!l) continue
      for (let x = x0; x <= x1; x++) {
        if (!libero(x)) continue
        const y = Math.round(yLinea(l, x))
        if (y < 0 || y >= this.h) continue
        const i = (y * this.w + x) * 4
        const c = classeGalleggiante(img.data[i], img.data[i + 1], img.data[i + 2])
        if (c === 5) continue
        const u = this.R + (x - this.a) / this.P
        const chiave = Math.round(u * 2)
        let v = mappa.get(chiave)
        if (!v) { v = new Uint32Array(N_CLASSI); mappa.set(chiave, v) }
        v[c]++
      }
    }
  }
}

// Metri di un dischetto dalla scala toccata a mano (passo 2) sul fotogramma dove è stata impostata.
// calib.metri lavora in pixel del video: fattore = pixel del video per pixel di analisi.
export function metriPerDischettoDaCalibrazione(img, tap, calib, fattore) {
  const m = new MotoreAnalisi({ w: img.w, h: img.h })
  const ctx = m.canali(img)
  m.corsie = trovaCorsie(ctx.div, img.w, img.h, tap.x, tap.y)
  if (!m.corsie.sopra && !m.corsie.sotto) return null
  const p = m.periodoLocale(ctx, tap.x)
  if (!p) return null
  const yMezzo = m.corsie.sopra && m.corsie.sotto
    ? (yLinea(m.corsie.sopra, tap.x) + yLinea(m.corsie.sotto, tap.x)) / 2
    : yLinea(m.corsie.sopra || m.corsie.sotto, tap.x)
  const d1 = calib.metri((tap.x - p.P / 2) * fattore, yMezzo * fattore)
  const d2 = calib.metri((tap.x + p.P / 2) * fattore, yMezzo * fattore)
  const mpp = Math.abs(d2 - d1)
  return Number.isFinite(mpp) && mpp > 0.02 && mpp < 2 ? mpp : null
}
