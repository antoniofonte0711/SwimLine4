import { describe, expect, it } from 'vitest'
import { erroreAuth, eta } from './erroriAuth'

describe('erroreAuth', () => {
  it('traduce gli errori più comuni', () => {
    expect(erroreAuth({ message: 'User already registered' })).toMatch(/Esiste già un account/)
    expect(erroreAuth({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toMatch(/confermare l'email/)
    expect(erroreAuth({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('Email o password non corretti.')
    expect(erroreAuth({ message: 'Password should be at least 6 characters.' })).toMatch(/almeno 8/)
    expect(erroreAuth({ message: 'email rate limit exceeded' })).toMatch(/Troppi tentativi/)
  })
  it('un errore sconosciuto non mostra l\'inglese', () => {
    expect(erroreAuth({ message: 'Something weird happened' })).toBe('Qualcosa non ha funzionato: riprova tra poco.')
    expect(erroreAuth(null)).toBe('Qualcosa non ha funzionato: riprova tra poco.')
  })
})

describe('eta', () => {
  const oggi = new Date(2026, 9, 11) // 11 ottobre 2026
  it('conta gli anni compiuti', () => {
    expect(eta('2012-10-11', oggi)).toBe(14)
    expect(eta('2012-10-12', oggi)).toBe(13)
    expect(eta('2000-01-01', oggi)).toBe(26)
    expect(eta('', oggi)).toBe(null)
  })
})
