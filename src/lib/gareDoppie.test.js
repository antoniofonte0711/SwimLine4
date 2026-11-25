import { describe, it, expect } from 'vitest'
import { eDoppione, messaggioDoppione, primoDoppione } from './gareDoppie'

const g = (atleta_id, data_gara, distanza, stile) => ({ atleta_id, data_gara, distanza, stile })

describe('gare doppie', () => {
  it('trova la gara che esiste già', () => {
    const nuove = [g('a', '2026-11-29', 50, 'Farfalla'), g('a', '2026-11-29', 100, 'Rana')]
    expect(primoDoppione(nuove, [g('a', '2026-11-29', 100, 'Rana')])).toEqual(nuove[1])
  })
  it('trova la gara che si ripete nella lista', () => {
    const nuove = [g('a', '2026-11-29', 50, 'Farfalla'), g('a', '2026-11-29', '50', 'Farfalla')]
    expect(primoDoppione(nuove, [])).toEqual(nuove[1])
  })
  it('stessa gara in un altro giorno o per un altro atleta non è un doppione', () => {
    const nuove = [g('a', '2026-11-29', 50, 'Farfalla'), g('b', '2026-11-29', 50, 'Farfalla'), g('a', '2026-11-30', 50, 'Farfalla')]
    expect(primoDoppione(nuove, [])).toBeNull()
  })
  it('riconosce il rifiuto del database e scrive il messaggio', () => {
    expect(eDoppione({ code: '23505', message: 'duplicate key value violates unique constraint "gare_senza_doppioni"' })).toBe(true)
    expect(eDoppione({ code: '23505', message: 'altro vincolo' })).toBe(false)
    expect(messaggioDoppione(g('a', '2026-11-29', 50, 'Farfalla'), 'Mario')).toBe('Non si può: Mario ha già 50 Farfalla del 29/11/2026. Una gara non può esserci due volte.')
  })
})
