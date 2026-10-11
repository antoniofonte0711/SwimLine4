import { describe, expect, it, vi } from 'vitest'
import { piccoliDopoGrande } from './punti'

vi.mock('./supabaseClient', () => ({ supabase: {} }))

describe('piccoliDopoGrande', () => {
  it('conta tutti i premi se non ne è mai uscito uno grande', () => {
    expect(piccoliDopoGrande([])).toBe(0)
    expect(piccoliDopoGrande([{ grande: false }, { grande: false }])).toBe(2)
  })
  it("conta solo i piccoli dopo l'ultimo grande (lista dal più recente)", () => {
    expect(piccoliDopoGrande([{ grande: false }, { grande: true }, { grande: false }])).toBe(1)
    expect(piccoliDopoGrande([{ grande: true }, { grande: false }])).toBe(0)
  })
})
