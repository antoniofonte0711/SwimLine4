// Dati inventati, con la forma di quelli del sito nuoto.ficr.it
import { describe, expect, it } from 'vitest'
import { candidate, cercaRisultati, giorniDi, ripara, stessoNome, tempoApp } from '../../supabase/functions/risultati/ficr'

const LODI = { Year: 2026, TeamCode: 67, ID: 1, Place: 'Lodi,  Dal 28/11/2026 al 29/11/2026' }
const ALTRA = { Year: 2026, TeamCode: 67, ID: 2, Place: 'Monza,  Dal 28/11/2026 al 29/11/2026' }
const riga = (Metri, Tempo, x = {}) => ({ DescrGara: '100m Farfalla', DescrCat: 'Unica Femmine', Categoria: 'AAF', TipoGara: 8, TipoTurno: 7, Batteria: 4, Pos: 3, Staffetta: false, Metri, Tempo, ...x })
const classif = (Numero, x = {}) => ({ Numero, Sex: 'F', EsisteTempo: 1, Causa: null, ...x })

function sito({ voce = { Nome: 'ANNA', Cognome: 'PROVA' }, anno = 2012, uff = 'Ufficializzato', sotto = [], lista = [classif(1), classif(7), classif(9, { EsisteTempo: 0 })], altra = false } = {}) {
  const dati = {
    'mpcache-30/get/schedule/2026/*/*': altra ? [LODI, ALTRA] : [LODI],
    'mpcache-30/get/allathletes/2026/67/1': { entrylist: [{ ...voce, Numero: 7 }] },
    'mpcache-30/get/atleta/2026/67/1/7': { atleta: { ...voce, Anno: anno, Soc: 'QUALSIASI' }, tempi: [riga(50, '32.38'), riga(100, "1'09.58")] },
    'mpcache-30/get/program/2026/67/1': [{ Categoria: 'AAF', TipoGara: 8, Turno: 7, Data: '28/11/2026', Uff: uff }],
    'mpcache-30/get/sottocategorie/2026/67/1/AAF/8': sotto,
    'mpcache-10/get/result/2026/67/1/AAF/8/*/*/*': { results: lista },
    'mpcache-10/get/result/2026/67/1/AAF/8/*/*/RAG': { results: [classif(7), classif(1)] },
  }
  return async (p) => {
    if (!(p in dati)) throw new Error('non previsto: ' + p)
    return dati[p]
  }
}
const gara = (x = {}) => ({ id: 'g1', data_gara: '2026-11-28', distanza: 100, stile: 'Farfalla', luogo: 'Lodi · Piscina', tempo: null, passaggi: [], atleta: { nome: 'Anna ', cognome: 'Prova', data_nascita: '2012-03-01' }, ...x })

describe('riconoscere atleti e tempi', () => {
  it('cognome e nome, anche con la sola iniziale o il primo nome', () => {
    const a = { nome: 'Anna', cognome: 'De Prova' }
    expect(stessoNome(a, { Nome: 'A.', Cognome: 'DE PROVA' })).toBe(true)
    expect(stessoNome(a, { Nome: 'ANNA MARIA', Cognome: 'DEPROVA' })).toBe(true)
    expect(stessoNome(a, { Nome: 'ALICE', Cognome: 'DE PROVA' })).toBe(false)
    expect(stessoNome(a, { Nome: 'ANNA', Cognome: 'PROVA' })).toBe(false)
  })
  it('accenti rovinati e formato dei tempi', () => {
    expect(ripara('SocietÃ ')).toBe('Società')
    expect(tempoApp("1'05.99")).toBe('1\'05"99')
    expect(tempoApp('35.59')).toBe('35"59')
    expect(tempoApp('')).toBe(null)
  })
  it('solo le manifestazioni del giorno e, se c\'è, della città', () => {
    expect(giorniDi(LODI)).toEqual(['2026-11-28', '2026-11-29'])
    expect(candidate([LODI, ALTRA], gara())).toEqual([LODI])
    expect(candidate([LODI, ALTRA], gara({ luogo: null }))).toEqual([LODI, ALTRA])
    expect(candidate([LODI], gara({ data_gara: '2026-12-05' }))).toEqual([])
  })
})

describe('cosa si scrive', () => {
  it('tempo, passaggi, batteria e posto in classifica (chi non ha il tempo non conta)', async () => {
    const r = await cercaRisultati([gara()], sito())
    expect(r.scrivere[0].cambi).toEqual({
      tempo: '1\'09"58', passaggi: ['32"38'], da_confermare: false,
      piazzamento: { batteria: 4, posto_batteria: 3, categoria: 'Unica Femmine', posizione: 2, classificati: 2 },
    })
  })
  it('con le categorie d\'età vale la classifica di categoria', async () => {
    const r = await cercaRisultati([gara()], sito({ sotto: [{ ct_Categoria: 'RAG', ct_Descrizione: 'Ragazze' }] }))
    expect(r.scrivere[0].cambi.piazzamento).toMatchObject({ categoria: 'Ragazze', posizione: 1, classificati: 2 })
  })
  it('anno diverso, non ufficializzato o non in classifica: niente', async () => {
    for (const s of [sito({ anno: 2011 }), sito({ uff: 'Non Ufficializzato' }), sito({ lista: [classif(7, { Causa: 'SQ' })] })]) {
      expect((await cercaRisultati([gara()], s)).scrivere).toEqual([])
    }
  })
  it('non sovrascrive un tempo diverso; con lo stesso tempo aggiunge solo il piazzamento', async () => {
    expect((await cercaRisultati([gara({ tempo: '1\'10"00' })], sito())).scrivere).toEqual([])
    const r = await cercaRisultati([gara({ tempo: '1\'09"58', passaggi: ['32"00'] })], sito())
    expect(Object.keys(r.scrivere[0].cambi).sort()).toEqual(['da_confermare', 'piazzamento'])
  })
  it('senza data di nascita non indovina', async () => {
    const r = await cercaRisultati([gara({ atleta: { nome: 'Anna', cognome: 'Prova' } })], sito())
    expect(r.saltate[0].motivo).toBe('manca la data di nascita')
  })
})
