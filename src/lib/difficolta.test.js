import { describe, it, expect } from 'vitest'
import { difficoltaPiano, pesoRiga, formattaVoto } from './difficolta'

// Allenamento vero del 9 ottobre 2026, calcolato a mano (11/10):
// RIS 300+200 ×0,5 = 250 · TEC 800 ×0,7 = 560 · C3 200 ×3 = 600 · A2 2000 ×1 = 2000 · Sciolto 4×50 ×0,4 = 80
// Ipossia 200 ×1,2 = 240 · B2 400 ×2,6 = 1040 ("Forte" non conta: B2 è già duro) → 4770 su 4300 m → 4,8 Moderato
const R = (tipo_lavoro, distanza, ripetizioni = 1, note = '') => ({ tipo_lavoro, distanza, ripetizioni, note })
const NOVE_OTTOBRE = [
  R('Riscaldamento', 300), R('Riscaldamento', 50, 4, 'Cambio stile ogni 25'), R('Tecnica', 50, 16), R('C3', 25, 8, 'Attivazione'),
  R('A2', 2000, 1, 'Lavoro centrale, di cui almeno: 400 gambe, 400 pull (pull buoy), 400 boccaglio + 100 PS'),
  R('Sciolto', 50), R('Ipossia', 25, 8), R('Sciolto', 50), R('Sciolto', 50), R('B2', 400, 1, 'Forte'), R('Sciolto', 50),
]
describe('controllo a mano su un allenamento vero', () => {
  it('9 ottobre: 4,8/10 Moderato, fatica divisa come nel calcolo a mano', () => {
    const d = difficoltaPiano(NOVE_OTTOBRE)
    expect(d.metri).toBe(4300)
    expect(d.carico).toBe(4770)
    expect(d.voto).toBe(4.8)
    expect(d.livello.nome).toBe('Moderato')
    expect(Object.fromEntries(d.gruppi.map((g) => [g.id, g.carico]))).toEqual({ recupero: 1130, aerobico: 2000, soglia: 1040, velocita: 600 })
  })
})

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
