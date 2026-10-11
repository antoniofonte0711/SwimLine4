import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('./supabaseClient', () => ({ supabase: {} }))

// Le date si controllano con l'ora italiana, come sui telefoni degli atleti
let tzPrima
beforeAll(() => { tzPrima = process.env.TZ; process.env.TZ = 'Europe/Rome' })
afterAll(() => { process.env.TZ = tzPrima })

const { dataLocale, formattaGiorno } = await import('./lavori')
const { addGiorni, settimanaDi } = await import('./pianoSquadra')
const { lunediDi } = await import('./presenze')

describe('date e fusi orari (Italia)', () => {
  it('poco dopo mezzanotte è già il giorno nuovo (in UTC sarebbe ancora ieri)', () => {
    expect(dataLocale(new Date('2026-10-11T22:30:00Z'))).toBe('2026-10-12') // 00:30 in Italia, ora legale
    expect(dataLocale(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16') // 00:30 in Italia, ora solare
    expect(dataLocale(new Date('2026-10-11T21:59:00Z'))).toBe('2026-10-11') // 23:59 in Italia
  })

  it('cambio dell\'ora: i giorni non saltano né si ripetono', () => {
    expect(addGiorni('2026-10-24', 1)).toBe('2026-10-25') // fine ora legale
    expect(addGiorni('2026-10-25', 1)).toBe('2026-10-26')
    expect(addGiorni('2026-03-28', 1)).toBe('2026-03-29') // inizio ora legale
    expect(addGiorni('2026-03-29', 1)).toBe('2026-03-30')
    expect(settimanaDi('2026-10-25')).toEqual(['2026-10-19', '2026-10-25'])
    expect(settimanaDi('2026-10-26')).toEqual(['2026-10-26', '2026-11-01'])
  })

  it('29 febbraio, fine mese e fine anno', () => {
    expect(addGiorni('2028-02-28', 1)).toBe('2028-02-29')
    expect(addGiorni('2028-02-29', 1)).toBe('2028-03-01')
    expect(addGiorni('2027-02-28', 1)).toBe('2027-03-01')
    expect(addGiorni('2026-12-31', 1)).toBe('2027-01-01')
    expect(settimanaDi('2027-01-01')).toEqual(['2026-12-28', '2027-01-03'])
  })

  it('lunedì della settimana anche alle 00:30 e la domenica', () => {
    expect(lunediDi(new Date(2026, 9, 25, 0, 30))).toBe('2026-10-19') // domenica del cambio ora
    expect(lunediDi(new Date(2026, 9, 26, 0, 30))).toBe('2026-10-26')
  })

  it('il nome del giorno è quello giusto', () => {
    expect(formattaGiorno('2028-02-29')).toMatch(/^martedì 29 febbraio$/)
  })
})
