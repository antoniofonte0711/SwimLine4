import { describe, expect, it } from 'vitest'
import { rettangoloVideo, scriviVelocita } from './overlay'
import { nomeSchermata } from './schermata'

describe('scriviVelocita', () => {
  it('scrive due decimali con la virgola', () => {
    expect(scriviVelocita(1.6234)).toBe('1,62')
    expect(scriviVelocita(0)).toBe('0,00')
  })
  it('senza un numero valido mostra il trattino, mai un valore inventato', () => {
    expect(scriviVelocita(null)).toBe('—')
    expect(scriviVelocita(undefined)).toBe('—')
    expect(scriviVelocita(NaN)).toBe('—')
    expect(scriviVelocita(Infinity)).toBe('—')
    expect(scriviVelocita(-0.5)).toBe('—')
  })
})

describe('rettangoloVideo', () => {
  it('video orizzontale su schermo verticale: bande sopra e sotto', () => {
    expect(rettangoloVideo(400, 800, 1920, 1080)).toEqual({ x: 0, y: 287.5, w: 400, h: 225 })
  })
  it('video verticale su schermo orizzontale: bande ai lati', () => {
    expect(rettangoloVideo(1600, 900, 1080, 1920)).toEqual({ x: 546.875, y: 0, w: 506.25, h: 900 })
  })
  it('senza dimensioni del video usa tutto il contenitore', () => {
    expect(rettangoloVideo(300, 200, 0, 0)).toEqual({ x: 0, y: 0, w: 300, h: 200 })
  })
})

describe('nomeSchermata', () => {
  it('contiene il secondo del fotogramma', () => {
    expect(nomeSchermata(12.34)).toMatch(/^swimline4-analisi-\d{4}-\d{2}-\d{2}-12,3s\.png$/)
  })
})
