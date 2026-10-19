import { describe, it, expect } from 'vitest'
import { leggiMedia, scriviMedia } from './media'

describe('tempo medio', () => {
  it('si scrive e si rilegge', () => {
    expect(scriviMedia(`1'05"00`)).toBe(`Media 1'05"00`)
    expect(leggiMedia(scriviMedia(`1'05"00`))).toBe(`1'05"00`)
  })
  it('senza media o con altri commenti non c\'è nulla', () => {
    expect(scriviMedia('')).toBe(null)
    expect(leggiMedia(null)).toBe('')
    expect(leggiMedia('Altro commento')).toBe('')
  })
})
