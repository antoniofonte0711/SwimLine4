import { describe, expect, it } from 'vitest'
import { recordPersonali, riepilogoOrgoglio, risultati } from './orgoglio'

const gare = [
  { id: 1, nome_gara: 'A', distanza: 100, stile: 'Stile libero', tempo: `1'05"00`, data_gara: '2026-09-10' },
  { id: 2, nome_gara: 'B', distanza: 100, stile: 'Stile libero', tempo: `1'03"00`, data_gara: '2026-10-02' },
  { id: 3, nome_gara: 'C', distanza: 100, stile: 'Stile libero', tempo: `1'04"00`, data_gara: '2026-10-05' },
]
const allenamenti = [
  { id: 9, tipo_lavoro: 'C1', distanza: 100, stile: 'Stile libero', passaggi: [`1'10"00`, `1'09"50`], data_allenamento: '2026-10-03' },
]
const presenze = [
  { data: '2026-10-01', stato: 'presente' }, { data: '2026-10-02', stato: 'assente' }, { data: '2026-09-30', stato: 'presente' },
]

describe('vista Orgoglio', () => {
  it('trova i record solo quando battono un tempo precedente', () => {
    const r = recordPersonali(risultati(allenamenti, gare))
    expect(r.map((x) => x.rif)).toEqual(['gara:2'])
    expect(r[0].meglio).toBe(2)
  })

  it('riassume il mese', () => {
    const s = riepilogoOrgoglio({ allenamenti, gare, presenze, oggi: new Date('2026-10-10T12:00:00') })
    expect(s.allenamentiMese).toBe(1)
    expect(s.recordMese).toBe(1)
    expect(s.miglioramento).toMatchObject({ testo: `2"00`, etichetta: '100 stile libero', gara: true })
    expect(s.grafico).toHaveLength(3)
    expect(s.ultimi[0]).toMatchObject({ rif: 'gara:3', tempo: `1'04"00`, record: false })
  })

  it('senza dati non si rompe', () => {
    const s = riepilogoOrgoglio({ allenamenti: [], gare: [], presenze: [] })
    expect(s).toMatchObject({ allenamentiMese: 0, recordMese: 0, miglioramento: null, grafico: [], ultimi: [] })
  })
})
