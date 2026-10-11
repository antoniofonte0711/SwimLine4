import { describe, expect, it } from 'vitest'
import { prevedi, scorciatoie, serieTempi, stagione, MIGLIORAMENTO_TIPICO } from './previsioni'

describe('stagione e scorciatoie', () => {
  it('la stagione va da settembre a luglio', () => {
    expect(stagione('2026-10-11')).toEqual({ inizio: '2026-09-01', fine: '2027-07-31' })
    expect(stagione('2027-03-05')).toEqual({ inizio: '2026-09-01', fine: '2027-07-31' })
  })
  it('fine gennaio e fine aprile sono le prossime dopo oggi', () => {
    const s = Object.fromEntries(scorciatoie('2026-10-11'))
    expect(s['Fine gennaio']).toBe('2027-01-31')
    expect(s['Fine aprile']).toBe('2027-04-30')
    expect(s['Tra 4 anni']).toBe('2030-10-11')
  })
})

describe('serieTempi', () => {
  it('un punto per giorno col tempo migliore, gare e lavori separati', () => {
    const s = serieTempi(
      [{ tipo_lavoro: 'A2', distanza: 100, stile: 'Stile libero', passaggi: ['1\'10"00', '1\'08"00'], data_allenamento: '2026-10-01' },
        { tipo_lavoro: 'A2', distanza: 100, stile: 'Stile libero', passaggi: ['1\'09"00'], data_allenamento: '2026-10-01' }],
      [{ distanza: 100, stile: 'Stile libero', tempo: '1\'02"00', data_gara: '2026-10-02' }, { distanza: 100, stile: 'Stile libero', tempo: null, data_gara: '2026-11-01' }],
    )
    expect(s).toHaveLength(2)
    expect(s.find((x) => x.fonte === 'allenamento').punti).toEqual([{ data: '2026-10-01', sec: 68 }])
    expect(s.find((x) => x.fonte === 'gara').punti).toEqual([{ data: '2026-10-02', sec: 62 }])
  })
})

describe('prevedi', () => {
  const oggi = '2026-10-11'
  it('con un solo tempo usa il miglioramento tipico', () => {
    const p = prevedi([{ data: '2026-10-01', sec: 60 }], { oggi, dal: '2026-09-01', fino: '2027-10-11' })
    expect(p.affidabilita).toBe('bassa')
    expect(p.annuo).toBeCloseTo(MIGLIORAMENTO_TIPICO * 100)
    expect(p.previsto).toBeLessThan(60)
    expect(p.previsto).toBeGreaterThan(58)
  })
  it('non prevede mai un peggioramento', () => {
    const punti = Array.from({ length: 10 }, (_, i) => ({ data: `2026-0${1 + Math.floor(i / 2)}-1${i % 2}`, sec: 60 + i }))
    const p = prevedi(punti, { oggi, dal: '2026-01-01', fino: '2030-10-11' })
    expect(p.previsto).toBeLessThanOrEqual(p.attuale)
  })
  it('il miglioramento rallenta: 4 anni danno meno di 4 volte 1 anno', () => {
    const punti = [{ data: '2026-10-01', sec: 60 }]
    const uno = prevedi(punti, { oggi, fino: '2027-10-11' }).percentuale
    const quattro = prevedi(punti, { oggi, fino: '2030-10-11' }).percentuale
    expect(quattro).toBeGreaterThan(uno)
    expect(quattro).toBeLessThan(uno * 4)
  })
  it('se nel periodo scelto non ci sono tempi usa tutto lo storico', () => {
    const p = prevedi([{ data: '2025-05-01', sec: 70 }], { oggi, dal: '2026-09-01', fino: '2027-07-31' })
    expect(p.tuttoLoStorico).toBe(true)
    expect(p.attuale).toBe(70)
  })
  it('con una tendenza chiara e tanti dati la segue (entro il massimo)', () => {
    const punti = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2026, 3, 1 + i * 15, 12)
      return { data: d.toISOString().slice(0, 10), sec: 70 * (1 - 0.0001 * i * 15) }
    })
    const p = prevedi(punti, { oggi, dal: '2026-01-01', fino: '2027-10-11' })
    expect(p.affidabilita).toBe('alta')
    expect(p.annuo).toBeGreaterThan(3.3)
    expect(p.annuo).toBeLessThanOrEqual(8)
  })
})
