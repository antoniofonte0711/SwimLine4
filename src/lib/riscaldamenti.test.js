import { describe, expect, it } from 'vitest'
import { TUTTE, garaDi, perGara, riscaldamentiDelGiorno, stessoRiscaldamento } from './riscaldamenti'

const v = (gara, created_at, extra = {}) => ({ id: gara + created_at, gara, created_at, righe: [], giorni: [], ...extra })

describe('riscaldamenti gara', () => {
  it('garaDi unisce distanza e stile', () => {
    expect(garaDi('100', 'Stile libero')).toBe('100 Stile libero')
  })

  it("perGara: l'ultima versione è quella in uso, le altre sono lo storico", () => {
    const g = perGara([v('100 Rana', '2026-11-01'), v('100 Rana', '2026-11-20'), v(TUTTE, '2026-10-01'), v('50 Rana', '2026-11-02')])
    expect(g.map((x) => x.gara)).toEqual([TUTTE, '50 Rana', '100 Rana'])
    const rana = g.find((x) => x.gara === '100 Rana')
    expect(rana.attuale.created_at).toBe('2026-11-20')
    expect(rana.storico.map((x) => x.created_at)).toEqual(['2026-11-01'])
  })

  it('nel giorno: quelli messi in quel giorno e quello della gara (o per tutte le gare)', () => {
    const lista = [
      v(TUTTE, '2026-11-10'),
      v('100 Stile libero', '2026-11-10'),
      v('200 Misti', '2026-11-10', { giorni: ['2026-11-28'] }),
    ]
    expect(riscaldamentiDelGiorno(lista, '2026-11-28', []).map((g) => g.gara)).toEqual(['200 Misti'])
    expect(riscaldamentiDelGiorno(lista, '2026-11-29', [{ distanza: 100, stile: 'Stile libero' }]).map((g) => g.gara)).toEqual(['100 Stile libero'])
    expect(riscaldamentiDelGiorno(lista, '2026-11-29', [{ distanza: 50, stile: 'Dorso' }, { distanza: 100, stile: 'Dorso' }]).map((g) => g.gara)).toEqual([TUTTE])
    expect(riscaldamentiDelGiorno(lista, '2026-11-30', [])).toEqual([])
  })

  it('una versione uguale alla precedente non conta come nuova', () => {
    expect(stessoRiscaldamento({ righe: [{ _id: 'a', distanza: 200 }] }, { righe: [{ distanza: 200 }], note: '' })).toBe(true)
    expect(stessoRiscaldamento({ righe: [{ distanza: 200 }] }, { righe: [{ distanza: 100 }] })).toBe(false)
  })
})
