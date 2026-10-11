import { describe, expect, it } from 'vitest'
import { dataDaScritta, erroreNascita, formattaDataScritta, scrittaDaData } from './dataScritta'

describe('data scritta a mano', () => {
  it('le barre arrivano da sole', () => {
    expect(formattaDataScritta('1')).toBe('1')
    expect(formattaDataScritta('110')).toBe('11/0')
    expect(formattaDataScritta('11102010')).toBe('11/10/2010')
    expect(formattaDataScritta('11/10/2010999')).toBe('11/10/2010')
    expect(formattaDataScritta('11-10-2010')).toBe('11/10/2010')
  })
  it('diventa una data vera solo se esiste', () => {
    expect(dataDaScritta('11/10/2010')).toBe('2010-10-11')
    expect(dataDaScritta('29/02/2012')).toBe('2012-02-29')
    expect(dataDaScritta('29/02/2013')).toBe(null)
    expect(dataDaScritta('31/04/2012')).toBe(null)
    expect(dataDaScritta('11/10/20')).toBe(null)
    expect(scrittaDaData('2010-10-11')).toBe('11/10/2010')
  })
  it('data di nascita: niente futuro, niente anni impossibili', () => {
    const oggi = new Date(2026, 9, 11, 12)
    expect(erroreNascita('05/03/2012', oggi)).toBe('')
    expect(erroreNascita('12/10/2026', oggi)).toMatch(/futuro/)
    expect(erroreNascita('05/03/1850', oggi)).toMatch(/anno/)
    expect(erroreNascita('05/03', oggi)).toMatch(/GG\/MM\/AAAA/)
    expect(erroreNascita('', oggi)).toMatch(/Scrivi/)
  })
})
