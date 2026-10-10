import { describe, expect, it } from 'vitest'
import { creaIcs } from './ics'

describe('file calendario (.ics)', () => {
  it('gara con orario e luogo', () => {
    const t = creaIcs({ id: 'x1', nome: "Trofeo d'Autunno", data: '2026-10-18', orario: '09:30', luogo: 'Piscina Comunale, Milano', note: 'Ritrovo 8:45', dettagli: '100 SL, 50 dorso' })
    expect(t).toContain('DTSTART:20261018T093000')
    expect(t).toContain('DTEND:20261018T123000')
    expect(t).toContain('LOCATION:Piscina Comunale\\, Milano')
    expect(t).toContain('UID:gara-x1@swimline4')
    expect(t.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
  })

  it('gara senza orario: tutto il giorno', () => {
    const t = creaIcs({ id: 'x2', nome: 'Gara', data: '2026-12-31' })
    expect(t).toContain('DTSTART;VALUE=DATE:20261231')
    expect(t).toContain('DTEND;VALUE=DATE:20270101')
    expect(t).not.toContain('LOCATION')
  })
})
