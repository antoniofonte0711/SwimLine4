import { describe, it, expect } from 'vitest'
import { haVarianti, ripetizioniDiRiga, riassuntoVarianti } from './varianti'

describe('stile e nota per ripetizione', () => {
  const r = { ripetizioni: 4, stile: 'Stile libero', stili: ['', 'Proprio stile', '', 'Proprio stile'], note_rip: ['forte', 'piano', 'forte', 'piano'] }
  it('senza varianti non cambia nulla', () => {
    expect(haVarianti({ ripetizioni: 4, stile: 'Dorso' })).toBe(false)
    expect(haVarianti({ ripetizioni: 4, stili: [], note_rip: ['', ''] })).toBe(false)
    expect(riassuntoVarianti({ ripetizioni: 4, stile: 'Dorso' })).toBe('')
  })
  it('ogni ripetizione ha il suo stile e la sua nota (vuoto = stile generale)', () => {
    expect(ripetizioniDiRiga(r)).toEqual([
      { stile: 'Stile libero', nota: 'forte' }, { stile: 'Proprio stile', nota: 'piano' },
      { stile: 'Stile libero', nota: 'forte' }, { stile: 'Proprio stile', nota: 'piano' },
    ])
    expect(riassuntoVarianti(r)).toBe('Stile libero forte · Proprio stile piano · Stile libero forte · Proprio stile piano')
  })
})

import { gruppiPerStile, distribuisci, raccogli } from './varianti'

describe('tempi per stile', () => {
  const r = { ripetizioni: 4, stile: 'Stile libero', stili: ['', 'Proprio stile', '', 'Proprio stile'] }
  const g = gruppiPerStile(r)
  it('raggruppa le ripetizioni per stile reale', () => {
    expect(g).toEqual([{ stile: 'Stile libero', reps: [0, 2] }, { stile: 'Proprio stile', reps: [1, 3] }])
    expect(gruppiPerStile({ ripetizioni: 3, stile: 'Dorso' })).toEqual([{ stile: 'Dorso', reps: [0, 1, 2] }])
  })
  it('ogni tempo va nel gruppo del suo stile e torna al suo posto', () => {
    const tempi = ['1\'00"00', '1\'10"00', '1\'01"00', '']
    expect(raccogli(g[0], tempi)).toEqual(['1\'00"00', '1\'01"00'])
    expect(raccogli(g[1], tempi)).toEqual(['1\'10"00'])
    expect(distribuisci(g, [['1\'00"00', '1\'01"00'], ['1\'10"00']])).toEqual(['1\'00"00', '1\'10"00', '1\'01"00'])
  })
})

describe('serie a giri', () => {
  // 3 giri da 2 ripetizioni: lo schema (stile, proprio stile) si ripete a ogni giro
  const r = { ripetizioni: 6, stile: 'Stile libero', stili: ['', 'Proprio stile'], serie: { id: 'a', giri: 3 } }
  it('lo schema di stili vale per ogni giro', () => {
    expect(ripetizioniDiRiga(r).map((v) => v.stile)).toEqual(['Stile libero', 'Proprio stile', 'Stile libero', 'Proprio stile', 'Stile libero', 'Proprio stile'])
    expect(gruppiPerStile(r)).toEqual([{ stile: 'Stile libero', reps: [0, 2, 4] }, { stile: 'Proprio stile', reps: [1, 3, 5] }])
    expect(riassuntoVarianti(r)).toBe('Stile libero · Proprio stile')
  })
})
