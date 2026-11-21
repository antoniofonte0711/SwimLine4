import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { cambiDiZona, posizioneInVasca, metroInVasca } from './zone'

// colori come li raccoglie il motore: Map(mezzo-dischetto → conteggi per classe) (0 rosso, 3 blu, 4 bianco)
function voti(disegno) {
  const m = new Map()
  disegno.forEach((c, i) => { const v = new Uint32Array(6); v[c] = 10; m.set(i, v) })
  return m
}
// centro vasca come quello di Stefano: bianco con un tratto rosso ogni 13 dischetti; zona 5 m blu/bianca
const centro = (i) => (i % 26 < 8 ? 0 : 4)
const zona = (i) => (i % 2 ? 3 : 4)

describe('zone di fine vasca', () => {
  it('trova i due cambi a 5 m e 20 m e ne ricava la scala esatta (15 m tra i due)', () => {
    const mpp = 0.12
    const halves = Math.round(25 / mpp * 2)
    const z = Math.round(5 / mpp * 2)
    const disegno = Array.from({ length: halves }, (_, i) => (i < z || i >= halves - z ? zona(i) : centro(i)))
    const v = voti(disegno)
    const cambi = cambiDiZona(v)
    expect(cambi.length).toBe(2) // i tratti rossi ogni ~1,5 m non sono cambi di zona
    expect(cambi[0].u).toBeCloseTo(z / 2, -0.5)
    // nuotatore da 3 m a 22 m (u cresce)
    const campioni = [3, 12, 22].map((d, k) => ({ t: k, catena: 0, u: d / mpp }))
    const pos = posizioneInVasca({ campioni, voti: [v], vasca: 25 })
    expect(pos.fonte).toBe('zone')
    expect(pos.mpp).toBeCloseTo(mpp, 2)
    expect(metroInVasca(pos, 12 / mpp)).toBeCloseTo(12, 0)
  })

  it('video vero (WhatsApp 19.01.32): un solo cambio, a 20 m; il tratto è dal metro ~10 al ~20', () => {
    const grezzo = JSON.parse(readFileSync(new URL('./fixture-wa1-voti.json', import.meta.url)))
    const v = new Map(grezzo[0].map(([k, c]) => [k, Uint32Array.from(c)]))
    const cambi = cambiDiZona(v)
    expect(cambi.length).toBe(1)
    // il nuotatore va verso u minori: da u=0 a u≈-70 (10,6 m a 0,15 m per dischetto)
    const campioni = [{ t: 0.5, catena: 0, u: 0 }, { t: 9.7, catena: 0, u: -70.5 }]
    const pos = posizioneInVasca({ campioni, voti: [v], vasca: 25 })
    expect(pos.fonte).toBe('stima')
    expect(pos.ancora.d).toBe(20)
    expect(metroInVasca(pos, 0)).toBeGreaterThan(9.5)
    expect(metroInVasca(pos, 0)).toBeLessThan(11)
    expect(metroInVasca(pos, -70.5)).toBeGreaterThan(19.5)
    expect(metroInVasca(pos, -70.5)).toBeLessThan(21.5)
  })

  it('stesso video letto dal browser: il tratto blu in mezzo al centro vasca NON è una zona', () => {
    const grezzo = JSON.parse(readFileSync(new URL('./fixture-wa1-voti-browser.json', import.meta.url)))
    const v = new Map(grezzo[0].map(([k, c]) => [k, Uint32Array.from(c)]))
    expect(cambiDiZona(v).length).toBe(2) // le finestre vedono due "cambi"...
    const pos = posizioneInVasca({ campioni: [{ t: 0.5, catena: 0, u: 0 }, { t: 9.7, catena: 0, u: -70.9 }], voti: [v], vasca: 25 })
    expect(pos.cambi.length).toBe(1) // ...ma solo quello dei 20 m è una zona vera
    expect(pos.fonte).toBe('stima')
    expect(metroInVasca(pos, 0)).toBeCloseTo(10.2, 0)
    expect(metroInVasca(pos, -70.9)).toBeCloseTo(20.8, 0)
  })

  it('senza cambi usa la vasca già misurata e non inventa la posizione', () => {
    const v = voti(Array.from({ length: 200 }, (_, i) => centro(i)))
    const pos = posizioneInVasca({ campioni: [{ t: 0, catena: 0, u: 0 }, { t: 5, catena: 0, u: 40 }], voti: [v], vasca: 25, mppNoto: 0.14 })
    expect(pos.fonte).toBe('vasca-nota')
    expect(pos.mpp).toBe(0.14)
    expect(pos.ancora).toBe(null)
  })
})
