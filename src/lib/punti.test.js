import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabaseClient', () => ({ supabase: {} }))
const { costoDi, costoMinimo } = await import('./punti')

describe('costo dei premi', () => {
  it('sta tra il 90% e il 100% della soglia', () => {
    expect(costoMinimo(1000)).toBe(900)
    expect(costoDi({ costo: 950 }, 1000)).toBe(950)
    expect(costoDi({ costo: 500 }, 1000)).toBe(900)
    expect(costoDi({ costo: 2000 }, 1000)).toBe(1000)
  })
  it('senza costo vale la soglia', () => {
    expect(costoDi({}, 1000)).toBe(1000)
  })
})
