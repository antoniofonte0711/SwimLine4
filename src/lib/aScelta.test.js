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
  it('il tempo di un lavoro normale con stesso tipo e distanza non finisce nella riga "A scelta"', () => {
    const piano = [
      { tipo_lavoro: 'C1', distanza: 100, stile: 'A scelta' },
      { tipo_lavoro: 'C1', distanza: 100, stile: 'Rana' },
    ]
    const solo = [{ atleta_id: 'a', tipo_lavoro: 'C1', distanza: 100, stile: 'Rana' }]
    const abb = abbinaTempi(piano, solo).a
    expect(abb[0]).toBeUndefined()
    expect(abb[1]).toBe(solo[0])
  })
})

describe('"A scelta" in una serie a giri', () => {
  const serie = { id: 's1', giri: 2 }
  const base = [
    { tipo_lavoro: 'B1', distanza: 200, ripetizioni: 4, stile: 'Stile libero', serie },
    { tipo_lavoro: 'C1', distanza: 75, ripetizioni: 6, stile: 'A scelta', serie }, // 3×75 per giro
  ]
  it('ogni ripetizione tiene il suo stile, anche nei giri dopo il primo', async () => {
    const { ripetizioniDiRiga } = await import('./varianti')
    const stili = ['Dorso', 'Rana', 'Farfalla', 'Rana', 'Dorso', 'Stile libero']
    const r = conScelte(base, { 1: stili })[1]
    expect(ripetizioniDiRiga(r).map((v) => v.stile)).toEqual(stili)
  })
  it('gli stili del coach in una serie si ripetono a ogni giro', async () => {
    const { ripetizioniDiRiga } = await import('./varianti')
    const r = { ...base[1], stile: 'Stile libero', stili: ['Dorso', 'Rana', 'Farfalla'] }
    expect(ripetizioniDiRiga(r).map((v) => v.stile)).toEqual(['Dorso', 'Rana', 'Farfalla', 'Dorso', 'Rana', 'Farfalla'])
  })
})
