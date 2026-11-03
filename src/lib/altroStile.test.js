import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabaseClient', () => ({ supabase: {} }))
const { abbinaTempiAtleta, conScelte, inPosizione, letturaRiga, stileCambiabile } = await import('./pianoSquadra')
const { gruppiPerStile, raccogli } = await import('./varianti')

// 6×50 C2 uno stile e uno proprio (per un atleta che fa dorso)
const riga = { tipo_lavoro: 'C2', distanza: 50, ripetizioni: 6, stile: 'Stile libero', stili: ['Stile libero', 'Dorso', 'Stile libero', 'Dorso', 'Stile libero', 'Dorso'] }
const tempi = ['30"00', '38"00', '30"50', '38"50', '31"00', '39"00']
// salva come l'app: per stile, oppure per passaggio se l'atleta ha cambiato stile
const salva = (r, valori, perPassaggio) => gruppiPerStile(r).map((g, k) => ({
  id: `${g.stile}-${k}`, tipo_lavoro: r.tipo_lavoro, distanza: g.distanza, stile: g.stile, ripetizioni: g.reps.length,
  passaggi: perPassaggio ? inPosizione(g, valori, 6) : raccogli(g, valori),
}))

describe('l\'atleta ha fatto un altro stile', () => {
  it('si può nei lavori normali, non nelle serie a giri, con le vasche scelte o negli "A scelta"', () => {
    expect(stileCambiabile(riga)).toBe(true)
    expect(stileCambiabile({ ...riga, serie: { id: 's', giri: 2 } })).toBe(false)
    expect(stileCambiabile({ ...riga, stile: 'A scelta', stili: null })).toBe(false)
    expect(stileCambiabile({ ...riga, tratti: { vasca: 25, scelte: [[0]] } })).toBe(false)
  })
  it('senza cambi i tempi si rileggono come prima', () => {
    const salvati = salva(riga, tempi, false)
    const abb = abbinaTempiAtleta([riga], salvati)
    expect(abb[0].posizionali).toEqual([])
    expect(letturaRiga(riga, abb[0])).toEqual({ scelta: undefined, valori: tempi })
  })
  it('con la 4ª fatta a rana: i tempi tornano al loro posto con lo stile di ognuno', () => {
    const scelta = ['Stile libero', 'Dorso', 'Stile libero', 'Rana', 'Stile libero', 'Dorso']
    const mia = conScelte([riga], [scelta])[0]
    const salvati = salva(mia, tempi, true)
    expect(salvati.map((e) => e.stile)).toEqual(['Stile libero', 'Dorso', 'Rana'])
    const abb = abbinaTempiAtleta([riga], salvati)
    expect(letturaRiga(riga, abb[0])).toEqual({ scelta, valori: tempi })
  })
  it('tutto a stile libero in un lavoro alternato: il tempo per passaggio non viene letto per stile', () => {
    const scelta = Array(6).fill('Stile libero')
    const salvati = salva(conScelte([riga], [scelta])[0], tempi, true)
    expect(salvati).toHaveLength(1)
    const abb = abbinaTempiAtleta([riga], salvati)
    expect(abb[0].esatti).toEqual([null, null])
    expect(letturaRiga(riga, abb[0])).toEqual({ scelta, valori: tempi })
  })
  it('un altro lavoro uguale più avanti tiene i suoi tempi', () => {
    const tre = { tipo_lavoro: 'C2', distanza: 50, ripetizioni: 3, stile: 'Stile libero', stili: ['Stile libero', 'Dorso', 'Stile libero'] }
    const mia = conScelte([riga], [Array(6).fill('Rana')])[0]
    const salvati = [...salva(mia, tempi, true), ...salva(tre, ['29"00', '37"00', '29"50'], false).map((e) => ({ ...e, id: 'tre-' + e.id }))]
    const abb = abbinaTempiAtleta([riga, tre], salvati)
    expect(letturaRiga(tre, abb[1]).valori).toEqual(['29"00', '37"00', '29"50'])
    expect(letturaRiga(riga, abb[0]).scelta).toEqual(Array(6).fill('Rana'))
  })
})
