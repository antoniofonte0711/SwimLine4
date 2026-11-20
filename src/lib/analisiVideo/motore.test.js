import { describe, expect, it } from 'vitest'
import { creaScena, PASSO_DISCHETTI } from './sintetico'
import { MotoreAnalisi } from './motore'
import { calcolaSerie, valoriAl } from './serie'
import { metriPerDischettoDaColori } from './marche'

// Analizza una scena finta a 30 fotogrammi al secondo e confronta con la verità
function analizza(scena, durata, { stile = 'crawl', camera = 'movimento', fps = 30, mpp = PASSO_DISCHETTI, vasca = 25 } = {}) {
  const m = new MotoreAnalisi({ w: scena.w, h: scena.h, camera })
  const x0 = scena.colonnaNuotatore(0) + 15 // dove sta il nuotatore (il dito non è preciso: 15 px di errore)
  const esito = m.inizia(scena.fotogramma(0), 0, { x: x0, y: scena.yNuotatore })
  for (let i = 1; i <= durata * fps; i++) m.passo(scena.fotogramma(i / fps), i / fps)
  const daColori = metriPerDischettoDaColori(m.voti[0], vasca)
  const serie = calcolaSerie(m.campioni, { mpp, qualitaScala: 'alta', camera, stile, fattore: 1 })
  return { m, esito, serie, daColori }
}

const errori = (scena, serie) => {
  const e = []
  serie.t.forEach((t, i) => { if (serie.v[i] !== null) e.push(Math.abs(serie.v[i] - scena.velocita(t))) })
  e.sort((a, b) => a - b)
  return { mediana: e[e.length >> 1], p90: e[Math.floor(e.length * 0.9)], copertura: e.length / serie.t.length }
}

describe('motore — camera ferma, crawl 1,6 m/s', { timeout: 60000 }, () => {
  const scena = creaScena({ camera: 'ferma', velocita: () => 1.6 })
  const { esito, serie, m } = analizza(scena, 4, { camera: 'ferma' })
  it('trova le due file della corsia e il passo dei dischetti', () => {
    expect(esito.corsieTrovate).toBe(true)
    expect(esito.passoTrovato).toBe(true)
  })
  it('non perde il nuotatore', () => {
    const persi = m.campioni.filter((c) => !c.trovato).length
    expect(persi / m.campioni.length).toBeLessThan(0.05)
  })
  it('velocità istantanea e media vicine al vero', () => {
    const e = errori(scena, serie)
    console.log('ferma crawl', e, 'media', serie.riepilogo)
    expect(e.copertura).toBeGreaterThan(0.8)
    expect(e.mediana).toBeLessThan(0.08)
    expect(Math.abs(serie.riepilogo.media - 1.6)).toBeLessThan(0.05)
  })
})

describe('motore — camera che segue (velocità diversa dal nuotatore)', { timeout: 60000 }, () => {
  const scena = creaScena({ camera: 'segue', velocita: () => 1.5, seme: 5 })
  const { serie, m } = analizza(scena, 5)
  it('velocità vera = scorrimento della vasca + spostamento nell\'inquadratura', () => {
    const e = errori(scena, serie)
    console.log('segue', e, 'media', serie.riepilogo)
    expect(m.campioni.filter((c) => !c.trovato).length / m.campioni.length).toBeLessThan(0.05)
    expect(e.copertura).toBeGreaterThan(0.8)
    expect(e.mediana).toBeLessThan(0.1)
    expect(Math.abs(serie.riepilogo.media - 1.5)).toBeLessThan(0.06)
  })
  it('in movimento l\'affidabilità non arriva mai ad "alta"', () => {
    expect(serie.aff.includes('alta')).toBe(false)
  })
})

describe('motore — rana a scatti: media per ciclo', { timeout: 60000 }, () => {
  const periodo = 1.3
  const vel = (t) => 1.1 + 0.45 * Math.sin((2 * Math.PI * t) / periodo)
  const scena = creaScena({ camera: 'ferma', velocita: vel, seme: 9 })
  const { serie } = analizza(scena, 5, { stile: 'rana', camera: 'ferma' })
  it('trova i cicli e la media di ogni ciclo è vicina a 1,1 m/s', () => {
    console.log('cicli', serie.limitiCicli.map((c) => [c.a - c.da, c.v].map((x) => x.toFixed(2))))
    expect(serie.limitiCicli.length).toBeGreaterThanOrEqual(2)
    for (const c of serie.limitiCicli) {
      expect(Math.abs(c.a - c.da - periodo)).toBeLessThan(0.25)
      expect(Math.abs(c.v - 1.1)).toBeLessThan(0.12)
    }
  })
  it('la velocità istantanea segue gli scatti (picchi sopra 1,3, minimi sotto 0,9)', () => {
    const vv = serie.v.filter((x) => x !== null)
    expect(Math.max(...vv)).toBeGreaterThan(1.3)
    expect(Math.min(...vv)).toBeLessThan(0.9)
  })
})

describe('motore — nuotatore coperto dagli schizzi per 0,6 s', { timeout: 60000 }, () => {
  const scena = creaScena({ camera: 'ferma', velocita: () => 1.6, nascostoDa: 1.5, nascostoA: 2.1, seme: 3 })
  const { serie, m } = analizza(scena, 4, { camera: 'ferma' })
  it('lascia un buco (nessun numero inventato), poi lo ritrova e lo segnala tra i punti dubbi', () => {
    const nelBuco = m.campioni.filter((c) => c.t > 1.7 && c.t < 1.95)
    console.log('buco: trovati', nelBuco.filter((c) => c.trovato).length, 'su', nelBuco.length, 'dubbi', serie.puntiDubbi)
    expect(nelBuco.filter((c) => c.trovato).length).toBeLessThan(nelBuco.length * 0.5)
    const dopo = m.campioni.filter((c) => c.t > 2.6)
    expect(dopo.filter((c) => c.trovato).length / dopo.length).toBeGreaterThan(0.9)
    expect(serie.puntiDubbi.some((d) => d.da <= 1.95 && d.a >= 1.7)).toBe(true)
    // dopo il buco la velocità torna giusta
    const e = []
    serie.t.forEach((t, i) => { if (t > 2.8 && serie.v[i] !== null) e.push(Math.abs(serie.v[i] - 1.6)) })
    expect(e.length).toBeGreaterThan(10)
    expect(e.sort((a, b) => a - b)[e.length >> 1]).toBeLessThan(0.1)
  })
  it('valoriAl nel buco non dà numeri', () => {
    expect(valoriAl(serie, 1.85, 'crawl').istantanea).toBeNull()
  })
})

describe('motore — fase subacquea all\'inizio', { timeout: 60000 }, () => {
  const scena = creaScena({ camera: 'ferma', velocita: () => 1.8, subacqueaFino: 1.5, seme: 21 })
  const { serie } = analizza(scena, 4, { camera: 'ferma' })
  it('riconosce subacquea prima e superficie dopo', () => {
    const fasi = serie.t.map((t, i) => [t, serie.fase[i]])
    const prima = fasi.filter(([t, f]) => t < 1.0 && f)
    const dopo = fasi.filter(([t, f]) => t > 2.3 && f)
    const quota = (arr, f) => arr.filter(([, x]) => x === f).length / Math.max(1, arr.length)
    console.log('subacquea prima', quota(prima, 'subacquea'), 'superficie dopo', quota(dopo, 'superficie'))
    expect(quota(prima, 'subacquea')).toBeGreaterThan(0.8)
    expect(quota(dopo, 'superficie')).toBeGreaterThan(0.8)
  })
})

describe('marche — cambi di colore per la scala automatica', { timeout: 60000 }, () => {
  // camera che segue per 7 s: passa davanti a più cambi di colore (5, 10, 15 m)
  const scena = creaScena({ camera: 'segue', velocita: () => 1.7, partenza: 2, seme: 13 })
  const { daColori } = analizza(scena, 7)
  it('ricava i metri di un dischetto entro il 10%', () => {
    console.log('da colori', daColori && { mpp: daColori.mpp, qualita: daColori.qualita, cambi: daColori.cambi.map((c) => c.u.toFixed(1)) })
    expect(daColori).not.toBeNull()
    expect(Math.abs(daColori.mpp - PASSO_DISCHETTI) / PASSO_DISCHETTI).toBeLessThan(0.1)
  })
})

describe('motore — fotogrammi persi (uno ogni 5) con camera che segue', { timeout: 60000 }, () => {
  const scena = creaScena({ camera: 'segue', velocita: () => 1.5, seme: 5 })
  const m = new MotoreAnalisi({ w: scena.w, h: scena.h, camera: 'movimento' })
  m.inizia(scena.fotogramma(0), 0, { x: scena.colonnaNuotatore(0) + 15, y: scena.yNuotatore })
  for (let i = 1; i <= 150; i++) if (i % 5 !== 0) m.passo(scena.fotogramma(i / 30), i / 30)
  const serie = calcolaSerie(m.campioni, { mpp: PASSO_DISCHETTI, qualitaScala: 'alta', camera: 'movimento', stile: 'crawl', fattore: 1 })
  it('la media resta giusta (la previsione segue il tempo vero, non il numero di fotogrammi)', () => {
    console.log('persi', serie.riepilogo)
    expect(Math.abs(serie.riepilogo.media - 1.5)).toBeLessThan(0.06)
  })
})

describe('cronometro del coach — la media torna esatta anche con la scala sbagliata', { timeout: 60000 }, () => {
  const scena = creaScena({ camera: 'segue', velocita: () => 1.5, seme: 5 })
  // scala sbagliata del 20% (come una stima dai galleggianti che non torna)
  const { m } = analizza(scena, 5, { mpp: PASSO_DISCHETTI * 0.8 })
  const cron = { a: { t: 1, d: scena.posizione(1) }, b: { t: 4, d: scena.posizione(4) } }
  const opts = { mpp: PASSO_DISCHETTI * 0.8, qualitaScala: 'media', camera: 'movimento', stile: 'crawl', fattore: 1 }
  const senza = calcolaSerie(m.campioni, opts)
  const con = calcolaSerie(m.campioni, { ...opts, cronometro: cron })
  it('senza cronometro la scala sbagliata sbaglia la media', () => {
    expect(Math.abs(senza.riepilogo.media - 1.5)).toBeGreaterThan(0.2)
  })
  it('con il cronometro media e istantanea tornano vicine al vero', () => {
    expect(con.cronometro.ok).toBe(true)
    expect(con.cronometro.media).toBeCloseTo(1.5, 5)
    expect(con.cronometro.erroreScala).toBeGreaterThan(0.15) // la scala di prima era corta del ~25%
    const e = errori(scena, con)
    expect(e.mediana).toBeLessThan(0.1)
    expect(Math.abs(con.riepilogo.media - 1.5)).toBeLessThan(0.06)
  })
  it('funziona anche senza nessuna scala', () => {
    const s = calcolaSerie(m.campioni, { ...opts, mpp: null, qualitaScala: 'bassa', cronometro: cron })
    expect(s.cronometro.ok).toBe(true)
    expect(Math.abs(s.riepilogo.media - 1.5)).toBeLessThan(0.06)
    expect(s.aff.some((a) => a === 'media')).toBe(true)
  })
  it('rifiuta momenti impossibili con un motivo chiaro', () => {
    const vicini = calcolaSerie(m.campioni, { ...opts, cronometro: { a: { t: 1, d: 5 }, b: { t: 1.5, d: 6 } } })
    expect(vicini.cronometro.ok).toBe(false)
    expect(vicini.cronometro.motivo).toMatch(/troppo vicini/)
    const fuori = calcolaSerie(m.campioni, { ...opts, cronometro: { a: { t: 1, d: 5 }, b: { t: 9, d: 15 } } })
    expect(fuori.cronometro.ok).toBe(false)
    const veloce = calcolaSerie(m.campioni, { ...opts, cronometro: { a: { t: 1, d: 0 }, b: { t: 2, d: 25 } } })
    expect(veloce.cronometro.motivo).toMatch(/impossibile/)
  })
})
