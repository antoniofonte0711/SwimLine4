import { describe, it, expect } from 'vitest'
import { percorsoConsentito, puoModificare, funzioniConsentite, nomeRuolo } from './permessi'

describe('percorsoConsentito', () => {
  it('presenze e impostazioni solo per coach e admin', () => {
    for (const p of ['/presenze', '/impostazioni']) {
      expect(percorsoConsentito('coach', p)).toBe(true)
      expect(percorsoConsentito('admin', p)).toBe(true)
      expect(percorsoConsentito('atleta', p)).toBe(false)
      expect(percorsoConsentito('genitore', p)).toBe(false)
      expect(percorsoConsentito('ospite', p)).toBe(false)
    }
  })
  it('il genitore non inserisce allenamenti né punti', () => {
    expect(percorsoConsentito('genitore', '/allenamenti')).toBe(false)
    expect(percorsoConsentito('genitore', '/punti')).toBe(false)
    expect(percorsoConsentito('genitore', '/gare')).toBe(true)
  })
  it("l'ospite vede solo squadra e calendario", () => {
    expect(funzioniConsentite('ospite')).toEqual(['/squadra', '/calendario'])
    expect(percorsoConsentito('ospite', '/riepilogo')).toBe(false)
    expect(percorsoConsentito('ospite', '/storico')).toBe(false)
  })
  it('home, funzioni e profilo sono per tutti', () => {
    for (const r of ['admin', 'coach', 'atleta', 'genitore', 'ospite']) {
      for (const p of ['/dashboard', '/funzioni', '/profilo']) expect(percorsoConsentito(r, p)).toBe(true)
    }
  })
})

describe('puoModificare', () => {
  it('solo admin, coach e atleta inseriscono dati', () => {
    expect(['admin', 'coach', 'atleta', 'genitore', 'ospite', undefined].map(puoModificare))
      .toEqual([true, true, true, false, false, false])
  })
})

describe('nomeRuolo', () => {
  it('nome leggibile, o il ruolo stesso se sconosciuto', () => {
    expect(nomeRuolo('admin')).toBe('Admin (io)')
    expect(nomeRuolo('coach_in_attesa')).toBe('coach_in_attesa')
  })
})
