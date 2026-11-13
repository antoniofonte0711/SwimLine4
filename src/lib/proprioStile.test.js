import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabaseClient', () => ({ supabase: {} }))
const { abbinaTempi, conProprioStile } = await import('./pianoSquadra')
const { gruppiPerStile } = await import('./varianti')

describe('conProprioStile', () => {
  it('"Proprio stile" diventa lo stile dell\'atleta, anche nelle ripetizioni', () => {
    const righe = [
      { tipo_lavoro: 'A2', distanza: 100, ripetizioni: 4, stile: 'Proprio stile' },
      { tipo_lavoro: 'B1', distanza: 50, ripetizioni: 4, stile: 'Stile libero', stili: ['', 'Proprio stile'] },
      { tipo_lavoro: 'C1', distanza: 75, ripetizioni: 2, stile: 'Stile libero' },
    ]
    const mie = conProprioStile(righe, 'Dorso')
    expect(mie[0].stile).toBe('Dorso')
    expect(mie[1].stili).toEqual(['', 'Dorso'])
    expect(mie[2]).toBe(righe[2])
    expect(gruppiPerStile(mie[1]).map((g) => g.stile)).toEqual(['Stile libero', 'Dorso'])
  })
  it('senza stile scelto le righe restano come sono', () => {
    const righe = [{ stile: 'Proprio stile' }]
    expect(conProprioStile(righe, null)).toBe(righe)
  })
})

describe('abbinaTempi con il proprio stile', () => {
  it('un tempo salvato in Rana va con la riga "Proprio stile" del piano', () => {
    const righe = [{ tipo_lavoro: 'A2', distanza: 100, stile: 'Proprio stile' }]
    const tempi = [{ atleta_id: 'a', tipo_lavoro: 'A2', distanza: 100, stile: 'Rana', passaggi: ['1\'20"00'] }]
    expect(abbinaTempi(righe, tempi).a[0]).toBe(tempi[0])
  })
  it('ma non un tempo a stile libero', () => {
    const righe = [{ tipo_lavoro: 'A2', distanza: 100, stile: 'Proprio stile' }]
    const tempi = [{ atleta_id: 'a', tipo_lavoro: 'A2', distanza: 100, stile: 'Stile libero', passaggi: [] }]
    expect(abbinaTempi(righe, tempi).a[0]).toBeUndefined()
  })
})

describe('serve chiedere il proprio stile?', () => {
  it('sì se un lavoro, una ripetizione o una serie è in Proprio stile; no altrimenti', async () => {
    const { pianoConProprioStile } = await import('./pianoSquadra')
    expect(pianoConProprioStile([{ tipo_lavoro: 'A2', stile: 'Proprio stile' }])).toBe(true)
    expect(pianoConProprioStile([{ tipo_lavoro: 'C1', stile: 'Stile libero', stili: ['Stile libero', 'Proprio stile'] }])).toBe(true)
    expect(pianoConProprioStile([{ serie: [{ tipo_lavoro: 'B1', stile: 'Proprio stile' }] }])).toBe(true)
    expect(pianoConProprioStile([{ tipo_lavoro: 'A2', stile: 'Stile libero', note: 'proprio stile piano' }])).toBe(false)
    expect(pianoConProprioStile(null)).toBe(false)
  })
})
