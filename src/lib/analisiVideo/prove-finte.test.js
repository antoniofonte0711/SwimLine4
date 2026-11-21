// Prove con video FINTI (verità nota) sul codice vero dell'app (creaAnalizzatore): una parte delle 10 prove
// di strumenti/analisi-video/prove-finte.js, quelle che hanno trovato bug il 21/11/2026.
import { describe, expect, it, beforeAll } from 'vitest'
import { creaScena } from './sintetico'
import { creaScenaTestata, percorsi, velocitaVera, PASSO_COPPIA } from './sinteticoTestata'
import { creaAnalizzatore } from './analisi'

function analizza(s, tap, durata, fattoreScena = 1) {
  const an = creaAnalizzatore({ tInizio: 0, tFine: durata, tap, camera: 'movimento', stile: 'crawl', vasca: 25 })
  for (let i = 0; i <= durata * 30; i++) an.aggiungi(s.fotogramma(i / 30), i / 30, fattoreScena)
  return an.concludi()
}
const mediaVera = (vero, rie) => { let st = 0; for (let t = rie.da; t < rie.da + rie.tempo; t += 0.01) st += vero(t) * 0.01; return st / rie.tempo }
const conPasso = (p) => { globalThis.localStorage = { getItem: () => (p === null ? null : String(p)), setItem: () => {} } }

describe('video finti di lato', { timeout: 120000 }, () => {
  beforeAll(() => conPasso(null))
  it('vasca intera: riconosce le DUE zone dei 5 m (prima venivano scartate) e la media sta entro il 7%', () => {
    const s = creaScena({ disegno: 'stefano', w: 854, h: 480, camera: 'segue', velocita: () => 1.5, partenza: 3 })
    const st = analizza(s, { x: s.colonnaNuotatore(0) + 10, y: s.yNuotatore }, 12)
    expect(st.scala.fonte).toBe('zone')
    expect(Math.abs(st.serie.riepilogo.media - 1.5) / 1.5).toBeLessThan(0.07)
  })
  it('una zona sola: il tratto della vasca è giusto entro mezzo metro (prima +1,5 m)', () => {
    const s = creaScena({ disegno: 'stefano', w: 854, h: 480, camera: 'segue', velocita: () => 1.4, partenza: 9 })
    const st = analizza(s, { x: s.colonnaNuotatore(0) + 10, y: s.yNuotatore }, 7)
    expect(Math.abs(st.tratto.da - s.posizione(st.tratto.tDa))).toBeLessThan(0.5)
    expect(Math.abs(st.tratto.a - s.posizione(st.tratto.tA))).toBeLessThan(0.5)
  })
})

describe('video finti dalla testata (metà risoluzione)', { timeout: 120000 }, () => {
  beforeAll(() => conPasso(PASSO_COPPIA))
  const scena = (o) => creaScenaTestata({ w: 240, h: 427, f: 335, ...o })
  it('nuotatore vicinissimo alla camera all\'inizio: riconosce lo stesso la ripresa dalla testata', () => {
    const s = scena({ posizione: percorsi.spinta(2.2, 1.3) })
    const st = analizza(s, s.puntoNuotatore(0), 3.5)
    expect(st.testata).toBe(true)
    const vero = (t) => velocitaVera(s.posizione, t)
    expect(Math.abs(st.serie.riepilogo.media - mediaVera(vero, st.serie.riepilogo)) / 1.6).toBeLessThan(0.06)
  })
  it('virata con la camera che trema: media entro il 6%, istantanea tipica entro 0,15 m/s', () => {
    const s = scena({ posizione: percorsi.virata(7, 1.1), tremolio: 1.5, seme: 3 })
    const st = analizza(s, s.puntoNuotatore(0), 9)
    const vero = (t) => velocitaVera(s.posizione, t)
    const rie = st.serie.riepilogo
    expect(Math.abs(rie.media - mediaVera(vero, rie)) / mediaVera(vero, rie)).toBeLessThan(0.06)
    const err = []
    st.serie.t.forEach((t, i) => { if (st.serie.v[i] !== null && st.serie.aff[i] !== 'bassa') err.push(Math.abs(st.serie.v[i] - vero(t))) })
    err.sort((a, b) => a - b)
    expect(err[err.length >> 1]).toBeLessThan(0.15)
  })
})
