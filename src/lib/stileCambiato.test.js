import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabaseClient', () => ({ supabase: {} }))
const { conScelte, inPosizione, tempiAScelta, sceltaDaTempi, tempiDaTogliere, tempiPerRiga, stileCambiato } = await import('./pianoSquadra')
const { gruppiPerStile } = await import('./varianti')

describe('"A scelta" con uno stile per passaggio', () => {
  const r = { tipo_lavoro: 'C2', distanza: 25, ripetizioni: 4, stile: 'A scelta' }
  it('ogni stile scelto diventa un gruppo; i passaggi senza stile restano "A scelta"', () => {
    const riga = conScelte([r], [['Stile libero', 'Dorso', 'Stile libero', '']])[0]
    expect(gruppiPerStile(riga).map((g) => [g.stile, g.reps])).toEqual([['Stile libero', [0, 2]], ['Dorso', [1]], ['A scelta', [3]]])
  })
  it('i tempi si salvano nel loro passaggio e si rileggono con lo stile di ognuno', () => {
    const tempi = ['20"00', '25"00', '21"00', '26"00']
    const riga = conScelte([r], [['Stile libero', 'Dorso', 'Stile libero', 'Dorso']])[0]
    const [sl, ds] = gruppiPerStile(riga)
    const salvati = [
      { id: 1, tipo_lavoro: 'C2', distanza: 25, stile: 'Stile libero', passaggi: inPosizione(sl, tempi) },
      { id: 2, tipo_lavoro: 'C2', distanza: 25, stile: 'Dorso', passaggi: inPosizione(ds, tempi) },
    ]
    expect(salvati[0].passaggi).toEqual(['20"00', '', '21"00'])
    expect(salvati[1].passaggi).toEqual(['', '25"00', '', '26"00'])
    const presi = tempiAScelta(r, salvati)
    expect(sceltaDaTempi(presi)).toEqual({ scelta: ['Stile libero', 'Dorso', 'Stile libero', 'Dorso'], valori: tempi })
  })
  it('uno stile solo resta una scelta per tutto il lavoro', () => {
    const presi = tempiAScelta(r, [{ id: 1, tipo_lavoro: 'C2', distanza: 25, stile: 'Rana', passaggi: ['30"00', '31"00'] }])
    expect(sceltaDaTempi(presi).scelta).toBe('Rana')
  })
  it('due righe "A scelta" uguali non si prendono i tempi a vicenda', () => {
    const lista = [
      { id: 1, tipo_lavoro: 'C2', distanza: 25, stile: 'Rana', passaggi: ['30"00', '31"00'] },
      { id: 2, tipo_lavoro: 'C2', distanza: 25, stile: 'Dorso', passaggi: ['28"00', '29"00'] },
    ]
    const usati = new Set()
    expect(tempiAScelta(r, lista, usati).map((e) => e.id)).toEqual([1])
    expect(tempiAScelta(r, lista, usati).map((e) => e.id)).toEqual([2])
  })
})

describe('il coach cambia lo stile di un lavoro che ha già dei tempi', () => {
  const sl = { tipo_lavoro: 'C1', distanza: 50, ripetizioni: 6, stile: 'Stile libero' }
  const tempo = { id: 'x', atleta_id: 'a', tipo_lavoro: 'C1', distanza: 50, stile: 'Stile libero', passaggi: ['30"00'] }
  it('senza cambi di stile non si toglie niente (anche cambiando le ripetizioni)', () => {
    expect(stileCambiato(sl, { ...sl, ripetizioni: 8 })).toBe(false)
    expect(tempiDaTogliere(sl, { ...sl, ripetizioni: 8 }, [tempo])).toEqual([])
  })
  it('da Stile libero a Proprio stile i tempi di stile libero si tolgono', () => {
    expect(tempiDaTogliere(sl, { ...sl, stile: 'Proprio stile' }, [tempo])).toEqual([tempo])
  })
  it('da Stile libero a stili diversi per ripetizione i tempi si tolgono (finirebbero nei passaggi sbagliati)', () => {
    const misto = { ...sl, stili: ['Stile libero', 'Proprio stile'] }
    expect(stileCambiato(sl, misto)).toBe(true)
    expect(tempiDaTogliere(sl, misto, [tempo])).toEqual([tempo])
  })
  it('da Proprio stile a Dorso restano i tempi di chi fa dorso', () => {
    const ps = { ...sl, stile: 'Proprio stile' }
    const dorso = { ...tempo, stile: 'Dorso' }
    const rana = { ...tempo, id: 'y', stile: 'Rana' }
    expect(tempiDaTogliere(ps, { ...sl, stile: 'Dorso' }, [dorso, rana])).toEqual([rana])
  })
  it('se il lavoro diventa "A scelta" i tempi restano', () => {
    expect(tempiDaTogliere(sl, { ...sl, stile: 'A scelta' }, [tempo])).toEqual([])
  })
  it('trova tutti i tempi di ogni riga, anche uno per stile', () => {
    const misto = { ...sl, stili: ['Stile libero', 'Dorso'] }
    const ds = { ...tempo, id: 'z', stile: 'Dorso' }
    expect(tempiPerRiga([misto], [tempo, ds]).a[0]).toEqual([tempo, ds])
  })
})
