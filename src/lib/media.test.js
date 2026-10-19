import { describe, it, expect } from 'vitest'
import { leggiMedia, campiMedia } from './media'

describe('tempo medio', () => {
  it('si scrive in tempo_totale (conta come tempo vero) e si rilegge', () => {
    const campi = campiMedia(`1'05"00`)
    expect(campi).toEqual({ commento: 'Media', tempo_totale: `1'05"00` })
    expect(leggiMedia(campi)).toBe(`1'05"00`)
  })
  it('senza media o con tempi totali normali non c\'è nulla', () => {
    expect(campiMedia('')).toEqual({ commento: null, tempo_totale: null })
    expect(leggiMedia(null)).toBe('')
    expect(leggiMedia({ commento: null, tempo_totale: `1'05"00` })).toBe('')
  })
})
