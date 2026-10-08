import { describe, it, expect, vi } from 'vitest'
import { distanzaDaTipo, coloreLavoro, dataLocale } from './lavori'

// punti.js importa il client Supabase: nei test non serve una connessione vera
vi.mock('./supabaseClient', () => ({ supabase: {} }))
const { livelloDi } = await import('./punti')

describe('lavori', () => {
  it('distanza dal tipo di lavoro', () => {
    expect(distanzaDaTipo('Passo gara 200')).toBe(200)
    expect(distanzaDaTipo('B1')).toBeNull()
    expect(distanzaDaTipo()).toBeNull()
  })
  it('colore di riserva per i tipi sconosciuti', () => {
    expect(coloreLavoro('Passo gara 50')).toContain('#0a1a2f')
    expect(coloreLavoro('???')).toContain('#d9efff')
  })
  it('dataLocale formatta AAAA-MM-GG', () => {
    expect(dataLocale(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})

describe('livelloDi', () => {
  it('soglie bronzo / argento / oro', () => {
    expect(livelloDi(0).nome).toBe('Bronzo')
    expect(livelloDi(499).nome).toBe('Bronzo')
    expect(livelloDi(500).nome).toBe('Argento')
    expect(livelloDi(1500).nome).toBe('Oro')
    expect(livelloDi(-10).nome).toBe('Bronzo')
  })
})
