import { describe, it, expect } from 'vitest'
import { difficoltaPiano, pesoRiga, formattaVoto } from './difficolta'

const riga = (tipo_lavoro, distanza, ripetizioni = 1, note = '') => ({ tipo_lavoro, distanza, ripetizioni, note, stile: 'Stile libero' })

describe('difficoltà', () => {
  it('5 km tutti in A2 valgono 5 su 10', () => {
    const d = difficoltaPiano([riga('A2', 500, 10)])
    expect(d.voto).toBe(5)
    expect(d.livello.nome).toBe('Moderato')
    expect(d.metri).toBe(5000)
  })
  it('le zone intense pesano di più a parità di metri', () => {
    const a2 = difficoltaPiano([riga('A2', 100, 10)]).carico
    expect(difficoltaPiano([riga('B2', 100, 10)]).carico).toBeGreaterThan(a2)
    expect(difficoltaPiano([riga('C1', 100, 10)]).carico).toBeGreaterThan(difficoltaPiano([riga('B2', 100, 10)]).carico)
  })
  it('"forte" nelle note alza un lavoro aerobico, non uno già intenso', () => {
    expect(pesoRiga(riga('A2', 300, 1, 'Ogni 4ª vasca forte'))).toBeCloseTo(1.15)
    expect(pesoRiga(riga('C1', 75, 1, 'forte'))).toBe(3.5)
    expect(pesoRiga(riga('A2', 300, 1, 'fortemente piano'))).toBe(1)
  })
  it('passo gara conta come lattacido; piano vuoto = nessun voto', () => {
    const d = difficoltaPiano([riga('Passo gara 100', 100, 4)])
    expect(d.gruppi[0].id).toBe('lattacido')
    expect(difficoltaPiano([])).toBeNull()
  })
  it('il voto resta tra 1 e 10 e le quote sommano a 1', () => {
    expect(difficoltaPiano([riga('Sciolto', 50)]).voto).toBe(1)
    const d = difficoltaPiano([riga('C2', 100, 40), riga('B2', 400, 10)])
    expect(d.voto).toBe(10)
    expect(d.gruppi.reduce((s, g) => s + g.quota, 0)).toBeCloseTo(1)
    expect(formattaVoto(6.1)).toBe('6,1')
  })
})
