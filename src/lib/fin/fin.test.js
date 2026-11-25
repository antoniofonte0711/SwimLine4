import { describe, expect, it } from 'vitest'
import { leggiComunicati, leggiLineeGuida, leggiProgramma, pulisci, tempoFin, unisciOrari } from './leggi'
import { cercaAtleti, stessoNome } from './abbina'

// pezzi di testo come li dà il PDF: una riga = stessa y
const riga = (y, ...celle) => celle.map(([x, str]) => ({ x, y, str, pagina: 1 }))

describe('comunicati FIN', () => {
  it('legge data, titolo, documento e programmi per città', () => {
    const html = `<div class="row datagara"><div class="col-xs-12">
      <span class="categoria">23/11/2026 - NUOTO</span>
      <div class="competizione">27-70 Linee Guida 1^ Prova Coppa Prova</div>
      <span class="corpo"><p>In linea la comunicazione in oggetto:</p><p><a href="https://www.finlombardia.net/Public/DATI/l037.pdf" target="_blank">27-70 Linee Guida</a></p><p>Programmi:</p><p><a href="https://www.finlombardia.net/Public/DATI/l038.pdf">Monza</a></p><p><a href="https://www.finlombardia.net/Public/DATI/l039.pdf">Lodi</a></p></span><br></div></div>`
    const [c] = leggiComunicati(html)
    expect(c.data).toBe('2026-11-23')
    expect(c.titolo).toBe('27-70 Linee Guida 1^ Prova Coppa Prova')
    expect(c.documento.url).toMatch(/l037\.pdf$/)
    expect(c.sezioni.Programmi.map((p) => p.nome)).toEqual(['Monza', 'Lodi'])
  })
})

describe('linee guida', () => {
  it('calendario di ogni città con data e ora delle gare', () => {
    const pezzi = [
      ...riga(700, [40, 'Lodi – Faustina (10 corsie)']),
      ...riga(690, [40, 'Data Ora Gara Sesso Categoria Iscritti Batterie Durata']),
      ...riga(680, [40, '28/11/2026'], [90, '15:45'], [130, 'Risc.'], [300, '60'], [400, 'Squadra Uno']),
      ...riga(670, [40, '29/11/2026'], [90, '11:45'], [130, 'FA50'], [170, 'M'], [190, 'Assoluti'], [250, '85'], [400, 'Squadra Due']),
      ...riga(660, [40, '29/11/2026'], [90, '16:53'], [130, 'SL100'], [170, 'M'], [190, 'Assoluti'], [250, '170']),
      ...riga(600, [40, 'Brescia – Lamarmora (10 corsie)']),
      ...riga(590, [40, '28/11/2026 15:00 MI100 F Assoluti 53 7 14']),
    ]
    const c = leggiLineeGuida(pezzi)
    expect(Object.keys(c)).toEqual(['Lodi', 'Brescia'])
    expect(c.Lodi.riscaldamenti).toEqual([{ data: '2026-11-28', ora: '15:45' }])
    expect(c.Lodi.gare).toEqual([
      { data: '2026-11-29', ora: '11:45', stile: 'Farfalla', distanza: 50, sesso: 'M', categoria: 'Assoluti' },
      { data: '2026-11-29', ora: '16:53', stile: 'Stile libero', distanza: 100, sesso: 'M', categoria: 'Assoluti' },
    ])
    expect(c.Brescia.gare[0]).toMatchObject({ distanza: 100, stile: 'Misti', sesso: 'F' })
  })
})

describe('programma', () => {
  const pezzi = [
    ...riga(700, [51, 'Ore: 09:00'], [228, '50m Farfalla Maschi Assoluti']),
    ...riga(680, [51, '1.'], [74, 'ROSSI MARIO'], [273, '2008'], [306, 'Squadra Uno ssd'], [510, '25.10']),
    // società lunga: le sue ultime lettere e le cifre del tempo arrivano mescolate
    ...riga(665, [51, '2.'], [74, 'VERDI LUCA'], [273, '2006'], [306, 'Polisportiva Società Cooperativa Sportiva'], [482, 'Dilettan'],
      [516, 't'], [516.6, '3'], [518.7, 'i'], [520.8, 's'], [522, '0'], [525.7, 't.'], [528.6, 'i8'], [530.5, 'c'], [535.6, 'a'], [535.7, '8']),
    ...riga(650, [51, '3.'], [74, 'BIANCHI ANNA MARIA'], [273, '2010'], [306, 'Nuoto Club'], [520, '---']),
    // numero attaccato al nome
    ...riga(635, [51, '101. NERI PAOLO'], [273, '2012'], [306, 'Squadra Due'], [510, '1.00.58']),
    ...riga(600, [228, '100m Stile Libero Maschi Assoluti']),
    ...riga(580, [51, '1.'], [74, 'VERDI LUCA'], [273, '2006'], [306, 'Altra Società'], [510, '58.00']),
  ]
  const gare = leggiProgramma(pezzi)

  it('gare con gli iscritti, anche con tempo e società mescolati', () => {
    expect(gare.map((g) => `${g.distanza} ${g.stile} ${g.sesso}`)).toEqual(['50 Farfalla M', '100 Stile libero M'])
    expect(gare[0].iscritti).toEqual([
      { pos: 1, nome: 'ROSSI MARIO', anno: 2008, societa: 'Squadra Uno ssd', tempo: '25"10' },
      { pos: 2, nome: 'VERDI LUCA', anno: 2006, societa: 'Polisportiva Società Cooperativa Sportiva Dilettantistica', tempo: '30"88' },
      { pos: 3, nome: 'BIANCHI ANNA MARIA', anno: 2010, societa: 'Nuoto Club', tempo: null },
      { pos: 101, nome: 'NERI PAOLO', anno: 2012, societa: 'Squadra Due', tempo: `1'00"58` },
    ])
  })

  it('ogni gara prende data e ora dal calendario della città', () => {
    const conOrari = unisciOrari(gare, { gare: [
      { data: '2026-11-29', ora: '11:45', stile: 'Farfalla', distanza: 50, sesso: 'M', categoria: 'Assoluti' },
      { data: '2026-11-29', ora: '16:53', stile: 'Stile libero', distanza: 100, sesso: 'M', categoria: 'Assoluti' },
    ] })
    expect(conOrari.map((g) => g.ora)).toEqual(['11:45', '16:53'])
  })

  it('nomi cercati senza badare a società, accenti e secondi nomi; omonimi con società diverse da confermare', () => {
    expect(stessoNome('BIANCHI ANNA MARIA', { nome: 'Anna', cognome: 'Bianchi' })).toBe(true)
    expect(stessoNome("D'AMICO NICOLO'", { nome: 'Nicolò', cognome: "D'Amico" })).toBe(true)
    expect(stessoNome('ROSSI MARIO', { nome: 'Mario', cognome: 'Rossini' })).toBe(false)
    const trovati = cercaAtleti(unisciOrari(gare), [
      { id: 'a', nome: 'Luca', cognome: 'Verdi' }, { id: 'b', nome: 'Mario', cognome: 'Rossi' }, { id: 'c', nome: 'Ugo', cognome: 'Neri' },
    ])
    expect(trovati.map((t) => [t.atleta.id, t.societa.length])).toEqual([['a', 2], ['b', 1]])
    expect(trovati[1].societa[0].gare[0]).toMatchObject({ distanza: 50, stile: 'Farfalla', tempo: '25"10' })
  })
})

describe('pulizia testi', () => {
  it('accenti rovinati e tempi in formato app', () => {
    expect(pulisci('Aicsport SocietÃ Cooperativa')).toBe('Aicsport Società Cooperativa')
    expect(tempoFin('1.00.58')).toBe(`1'00"58`)
    expect(tempoFin('30.88')).toBe('30"88')
  })
})
