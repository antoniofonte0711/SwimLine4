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
  const r = { ripetizioni: 4, distanza: 100, stile: 'Stile libero', stili: ['', 'Proprio stile', '', 'Proprio stile'] }
  const g = gruppiPerStile(r)
  it('raggruppa le ripetizioni per stile reale', () => {
    expect(g).toEqual([{ stile: 'Stile libero', distanza: 100, reps: [0, 2] }, { stile: 'Proprio stile', distanza: 100, reps: [1, 3] }])
    expect(gruppiPerStile({ ripetizioni: 3, distanza: 100, stile: 'Dorso' })).toEqual([{ stile: 'Dorso', distanza: 100, reps: [0, 1, 2] }])
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
  const r = { ripetizioni: 6, distanza: 100, stile: 'Stile libero', stili: ['', 'Proprio stile'], serie: { id: 'a', giri: 3 } }
  it('lo schema di stili vale per ogni giro', () => {
    expect(ripetizioniDiRiga(r).map((v) => v.stile)).toEqual(['Stile libero', 'Proprio stile', 'Stile libero', 'Proprio stile', 'Stile libero', 'Proprio stile'])
    expect(gruppiPerStile(r)).toEqual([{ stile: 'Stile libero', distanza: 100, reps: [0, 2, 4] }, { stile: 'Proprio stile', distanza: 100, reps: [1, 3, 5] }])
    expect(riassuntoVarianti(r)).toBe('Stile libero · Proprio stile')
  })
})

import { caselleDiRiga, pezziDiRiga, trattiPuliti } from './varianti'

describe('vasche da cronometrare', () => {
  it('nel misto i pezzi sono i 4 stili in ordine di gara', () => {
    expect(pezziDiRiga({ distanza: 200, stile: 'Misti' }).map((p) => [p.stile, p.distanza])).toEqual([['Farfalla', 50], ['Dorso', 50], ['Rana', 50], ['Stile libero', 50]])
    expect(pezziDiRiga({ distanza: 400, stile: 'Misti' })[0].distanza).toBe(100)
    expect(pezziDiRiga({ distanza: 100, stile: 'Misti' })[0].distanza).toBe(25)
    expect(pezziDiRiga({ distanza: 50, stile: 'Misti' })).toEqual([]) // 12,5 m per stile: mai
  })
  it('4×200 misto, un 50 diverso per ripetuta: ogni tempo nel suo stile', () => {
    const r = { ripetizioni: 4, distanza: 200, stile: 'Misti', tratti: { vasca: 25, scelte: [[0], [1], [2], [3]] } }
    expect(caselleDiRiga(r).map((c) => [c.stile, c.distanza])).toEqual([['Farfalla', 50], ['Dorso', 50], ['Rana', 50], ['Stile libero', 50]])
    expect(gruppiPerStile(r)).toEqual([
      { stile: 'Farfalla', distanza: 50, reps: [0] }, { stile: 'Dorso', distanza: 50, reps: [1] },
      { stile: 'Rana', distanza: 50, reps: [2] }, { stile: 'Stile libero', distanza: 50, reps: [3] },
    ])
  })
  it('negli altri stili le vasche di fila fanno un tratto solo', () => {
    const r = { ripetizioni: 2, distanza: 200, stile: 'Stile libero', tratti: { vasca: 25, scelte: [[6, 7], [0, 7]] } }
    expect(caselleDiRiga(r).map((c) => [c.distanza, c.etichetta])).toEqual([[50, '1ª · 50 m vasche 7-8'], [25, '2ª · 25 m vasca 1'], [25, '2ª · 25 m vasca 8']])
    expect(pezziDiRiga({ distanza: 200, stile: 'Dorso', tratti: { vasca: 50 } })).toHaveLength(4)
  })
  it('al salvataggio restano solo i pezzi che esistono ancora', () => {
    expect(trattiPuliti({ ripetizioni: 2, distanza: 100, stile: 'Misti', tratti: { scelte: [[0, 5], [3], [1]] } })).toEqual({ vasca: 25, scelte: [[0], [3]] })
    expect(trattiPuliti({ ripetizioni: 2, distanza: 50, stile: 'Misti', tratti: { scelte: [[0]] } })).toBe(null)
  })
})
