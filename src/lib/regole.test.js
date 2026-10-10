import { describe, expect, it, vi } from 'vitest'
import { creaPuo, percorsoAttivo } from './regole'

// i test provano solo le regole: niente database
vi.mock('./supabaseClient', () => ({ supabase: {} }))

describe('interruttori del pannello', () => {
  it('senza impostazioni vale tutto acceso, tranne i permessi speciali e le sezioni in arrivo', () => {
    const puo = creaPuo()
    expect(puo('a_tempi')).toBe(true)
    expect(puo('s_sola')).toBe(false)
    expect(puo('video')).toBe(false)
    expect(puo('n_record')).toBe(true)
  })

  it('stagione chiusa: nessuno scrive', () => {
    const puo = creaPuo({ squadra: { s_sola: true } })
    expect(puo('a_tempi')).toBe(false)
    expect(puo('c_pubblica')).toBe(false)
    expect(puo('a_record')).toBe(true)
  })

  it('una funzione spenta per tutti spegne anche i permessi collegati', () => {
    const puo = creaPuo({ funzioni: { punti: false, vasca: false } })
    expect(puo('a_punti')).toBe(false)
    expect(puo('a_vasca')).toBe(false)
  })

  it('le sezioni del menu seguono gli interruttori', () => {
    const puo = creaPuo({ squadra: { a_record: false } })
    expect(percorsoAttivo('/record', 'atleta', puo)).toBe(false)
    expect(percorsoAttivo('/record', 'coach', puo)).toBe(true)
    expect(percorsoAttivo('/storico', 'atleta', puo)).toBe(true)
  })
})
