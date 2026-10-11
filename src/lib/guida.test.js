import { describe, expect, it } from 'vitest'
import { GUIDA, RUOLI_GUIDA, guidaPer } from './guida'

describe('guida', () => {
  const ruoli = RUOLI_GUIDA.map(([k]) => k)
  it('ogni sezione ha titolo, ruoli validi e almeno un tasto spiegato', () => {
    GUIDA.forEach((s) => {
      expect(s.titolo).toBeTruthy()
      expect(s.passi.length).toBeGreaterThan(0)
      s.per.forEach((r) => expect(ruoli).toContain(r))
      s.passi.forEach(([tasto, cosa]) => { expect(tasto).toBeTruthy(); expect(cosa.length).toBeGreaterThan(10) })
    })
  })
  it('ognuno vede le sue sezioni, l\'admin tutte', () => {
    const titoli = (r) => guidaPer(r).map((s) => s.id)
    expect(titoli('genitore')).toContain('genitore')
    expect(titoli('genitore')).not.toContain('coach-oggi')
    expect(titoli('atleta')).not.toContain('admin')
    expect(titoli('coach')).toContain('coach-squadra')
    expect(titoli('admin')).toHaveLength(GUIDA.length)
  })
})
