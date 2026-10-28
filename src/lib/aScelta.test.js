import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabaseClient', () => ({ supabase: {} }))
const { abbinaTempi, aScelta, conScelte, tempoDiRigaAScelta, STILI_PIANO, STILI_COACH } = await import('./pianoSquadra')

describe('lavori "A scelta"', () => {
  const righe = [
    { tipo_lavoro: 'C1', distanza: 100, ripetizioni: 4, stile: 'A scelta' },
    { tipo_lavoro: 'A2', distanza: 400, ripetizioni: 3, stile: 'Stile libero' },
  ]
  it('il coach lo trova tra gli stili, ma non diventa una categoria dei progressi', () => {
    expect(STILI_PIANO).toContain('A scelta')
    expect(STILI_COACH).not.toContain('A scelta')
  })
  it('la riga prende lo stile scelto dall\'atleta, le altre restano uguali', () => {
    const mie = conScelte(righe, { 0: 'Rana' })
    expect(mie[0].stile).toBe('Rana')
    expect(mie[1]).toBe(righe[1])
    expect(conScelte(righe, {})[0].stile).toBe('A scelta')
    expect(aScelta(righe[0])).toBe(true)
  })
  it('un tempo salvato in qualunque stile va con la riga "A scelta" di stesso tipo e distanza', () => {
    expect(tempoDiRigaAScelta({ tipo_lavoro: 'C1', distanza: 100, stile: 'Farfalla' }, righe[0])).toBe(true)
    expect(tempoDiRigaAScelta({ tipo_lavoro: 'C1', distanza: 50, stile: 'Farfalla' }, righe[0])).toBe(false)
    expect(tempoDiRigaAScelta({ tipo_lavoro: 'B1', distanza: 100, stile: 'Farfalla' }, righe[0])).toBe(false)
    const tempi = [{ atleta_id: 'a', tipo_lavoro: 'C1', distanza: 100, stile: 'Dorso' }, { atleta_id: 'a', tipo_lavoro: 'A2', distanza: 400, stile: 'Stile libero' }]
    const abb = abbinaTempi(righe, tempi).a
    expect(abb[0]).toBe(tempi[0])
    expect(abb[1]).toBe(tempi[1])
  })
})
