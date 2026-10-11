import { describe, expect, it } from 'vitest'
import { casellaDi, pulisciCodice } from './posta'

describe('apri la posta', () => {
  it('riconosce le caselle più usate', () => {
    expect(casellaDi('mario@gmail.com').nome).toBe('Gmail')
    expect(casellaDi('Mario@Hotmail.IT').nome).toBe('Outlook')
    expect(casellaDi('a@libero.it').nome).toBe('Libero Mail')
    expect(casellaDi('a@icloud.com').nome).toBe('iCloud Mail')
  })
  it('per le altre niente pulsante', () => {
    expect(casellaDi('a@societa-nuoto.it')).toBe(null)
    expect(casellaDi('senza-chiocciola')).toBe(null)
  })
  it('il codice tiene solo le cifre', () => {
    expect(pulisciCodice(' 123 456 ')).toBe('123456')
    expect(pulisciCodice('12a34')).toBe('1234')
  })
})
