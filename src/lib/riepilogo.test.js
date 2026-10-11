import { describe, expect, it, vi } from 'vitest'
import { riepilogoPeriodo } from './riepilogo'

// i test provano solo i calcoli: niente database
vi.mock('./supabaseClient', () => ({ supabase: {} }))

const riga = (tipo, distanza, ripetizioni = 1) => ({ tipo_lavoro: tipo, distanza, ripetizioni })
const piani = [
  { data: '2026-10-05', righe: [riga('A2', 1000, 3)] },
  { data: '2026-10-07', righe: [riga('A2', 500, 4), riga('C1', 100, 6)] },
  { data: '2026-10-09', righe: [riga('A2', 4000)] },
]
const presenze = [
  { data: '2026-10-05', stato: 'presente' }, { data: '2026-10-07', stato: 'presente' }, { data: '2026-10-09', stato: 'assente' },
  { data: '2026-09-30', stato: 'presente' },
]
const gare = [
  { id: 1, distanza: 100, stile: 'Stile libero', tempo: `1'05"00`, data_gara: '2026-09-20' },
  { id: 2, distanza: 100, stile: 'Stile libero', tempo: `1'04"10`, data_gara: '2026-10-11' },
]

describe('riepilogo della settimana', () => {
  it('conta km fatti, presenze, gare e record della settimana', () => {
    const r = riepilogoPeriodo({ piani, presenze, gare, punti: [{ data: '2026-10-05', punti: 10 }, { data: '2026-10-01', punti: 5 }], da: '2026-10-05', a: '2026-10-11' })
    expect(r.giorni).toHaveLength(7)
    expect(r.giorni[0]).toMatchObject({ sigla: 'Lun', numero: 5, stato: 'presente', metri: 3000 })
    expect(r.metriFatti).toBe(5600)
    expect(r.metriProgramma).toBe(9600)
    expect(r).toMatchObject({ allenamentiProgramma: 3, presenti: 2, assenti: 1, gare: 1, punti: 10 })
    expect(r.record).toHaveLength(1)
    expect(r.piuDuro.data).toBe('2026-10-07')
  })

  it('gli allenamenti fuori piano accettati si aggiungono ai km fatti', () => {
    const r = riepilogoPeriodo({ piani, presenze, extra: [{ data: '2026-10-11', metri: 2500 }, { data: '2026-10-20', metri: 9000 }], da: '2026-10-05', a: '2026-10-11' })
    expect(r.metriFatti).toBe(5600 + 2500)
    expect(r.metriExtra).toBe(2500)
    expect(r.giorni[6].extra).toBe(2500)
    expect(r.metriProgramma).toBe(9600) // il programma del coach non cambia
  })

  it('una settimana vuota non si rompe', () => {
    const r = riepilogoPeriodo({ da: '2026-10-12', a: '2026-10-18' })
    expect(r).toMatchObject({ metriFatti: 0, presenti: 0, record: [], piuDuro: null })
  })
})
