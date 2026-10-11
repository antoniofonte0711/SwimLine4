import { describe, expect, it } from 'vitest'
import { categoriaFin } from './categorie'

// Stagione 2025/26 (finisce nel 2026): tabella del Regolamento FIN
const STAGIONE_25_26 = new Date(2026, 2, 15, 12)

describe('categorie FIN', () => {
  it('maschi come nel regolamento 2025/26', () => {
    expect(categoriaFin('2015-05-01', 'M', STAGIONE_25_26)).toBe('Esordienti B')
    expect(categoriaFin('2013-05-01', 'M', STAGIONE_25_26)).toBe('Esordienti A')
    expect(categoriaFin('2010-05-01', 'M', STAGIONE_25_26)).toBe('Ragazzi')
    expect(categoriaFin('2008-05-01', 'M', STAGIONE_25_26)).toBe('Juniores')
    expect(categoriaFin('2006-05-01', 'M', STAGIONE_25_26)).toBe('Cadetti')
    expect(categoriaFin('2005-05-01', 'M', STAGIONE_25_26)).toBe('Seniores')
  })
  it('femmine come nel regolamento 2025/26', () => {
    expect(categoriaFin('2017-05-01', 'F', STAGIONE_25_26)).toBe('Esordienti B')
    expect(categoriaFin('2014-05-01', 'F', STAGIONE_25_26)).toBe('Esordienti A')
    expect(categoriaFin('2012-05-01', 'F', STAGIONE_25_26)).toBe('Ragazzi')
    expect(categoriaFin('2010-05-01', 'F', STAGIONE_25_26)).toBe('Juniores')
    expect(categoriaFin('2008-05-01', 'F', STAGIONE_25_26)).toBe('Cadetti')
    expect(categoriaFin('2007-05-01', 'F', STAGIONE_25_26)).toBe('Seniores')
  })
  it('da ottobre conta la stagione nuova', () => {
    expect(categoriaFin('2012-05-01', 'M', new Date(2026, 8, 30, 12))).toBe('Ragazzi') // 14 anni nella 2025/26
    expect(categoriaFin('2013-05-01', 'M', new Date(2026, 9, 1, 12))).toBe('Ragazzi') // 14 anni nella 2026/27
  })
  it('senza sesso: una sola categoria se coincide, altrimenti tutte e due', () => {
    expect(categoriaFin('2000-01-01', null, STAGIONE_25_26)).toBe('Seniores')
    expect(categoriaFin('2012-05-01', null, STAGIONE_25_26)).toBe('Ragazzi')
    expect(categoriaFin('2010-05-01', null, STAGIONE_25_26)).toBe('Ragazzi o Juniores')
  })
  it('senza data niente categoria', () => {
    expect(categoriaFin(null, 'M')).toBe(null)
  })
})
