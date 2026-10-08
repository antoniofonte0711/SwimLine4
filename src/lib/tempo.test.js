import { describe, it, expect } from 'vitest'
import {
  normalizzaTempo, normalizzaRipartenza, ripartenzaValida, passaggiCoerenti,
  tempoValido, tempoPlausibile, tempoInSecondi, secondiInTempo,
} from './tempo'

describe('normalizzaTempo', () => {
  it.each([
    ['59', '59"00'],
    ['5950', '59"50'],
    ['12234', `1'22"34`],
    ['59.5', '59"50'],
    ['59,50', '59"50'],
    ['1:22.34', `1'22"34`],
    [`1'22"34`, `1'22"34`],
    ['1’22”34', `1'22"34`],
    [` 1 ' 05 " 4 `, `1'05"40`],
    ['', ''],
  ])('%s -> %s', (dentro, fuori) => {
    expect(normalizzaTempo(dentro)).toBe(fuori)
  })

  it('lascia invariato quello che non capisce (poi la validazione lo rifiuta)', () => {
    expect(normalizzaTempo('6050')).toBe('6050') // 60 secondi
    expect(normalizzaTempo('abc')).toBe('abc')
    expect(tempoValido(normalizzaTempo('6050'))).toBe(false)
  })
})

describe('tempoValido', () => {
  it('accetta i due formati standard', () => {
    expect(tempoValido(`1'20"00`)).toBe(true)
    expect(tempoValido('59"00')).toBe(true)
  })
  it('rifiuta zero, secondi oltre 59 e formati vecchi', () => {
    expect(tempoValido('0"00')).toBe(false)
    expect(tempoValido(`1'60"00`)).toBe(false)
    expect(tempoValido('01:05.40')).toBe(false)
    expect(tempoValido('')).toBe(false)
  })
})

describe('tempoInSecondi / secondiInTempo', () => {
  it('converte avanti e indietro', () => {
    expect(tempoInSecondi(`1'20"50`)).toBeCloseTo(80.5)
    expect(tempoInSecondi('59"20')).toBeCloseTo(59.2)
    expect(tempoInSecondi('01:05.40')).toBeCloseTo(65.4) // dati vecchi
    expect(tempoInSecondi('boh')).toBeNull()
    expect(secondiInTempo(80.5)).toBe(`1'20"50`)
    expect(secondiInTempo(59.2)).toBe('59"20')
    expect(secondiInTempo(59.999)).toBe(`1'00"00`)
  })
  it('andata e ritorno non cambia il tempo', () => {
    for (const t of [`1'03"67`, '27"05', `10'00"00`]) expect(secondiInTempo(tempoInSecondi(t))).toBe(t)
  })
})

describe('tempoPlausibile', () => {
  it('blocca i tempi impossibili (meno di 9" ogni 25 m)', () => {
    expect(tempoPlausibile('3"67', 100)).toBe(false)
    expect(tempoPlausibile(`1'03"67`, 100)).toBe(true)
    expect(tempoPlausibile('36"00', 100)).toBe(true)
  })
  it('senza distanza o tempo non controlla', () => {
    expect(tempoPlausibile('3"67', null)).toBe(true)
    expect(tempoPlausibile('', 100)).toBe(true)
  })
})

describe('ripartenza', () => {
  it.each([
    ['130', `1'30"`],
    ['1:30', `1'30"`],
    ['1.30', `1'30"`],
    ['90', `1'30"`],
    ['45', '45"'],
    ['', ''],
  ])('%s -> %s', (dentro, fuori) => {
    expect(normalizzaRipartenza(dentro)).toBe(fuori)
    expect(ripartenzaValida(normalizzaRipartenza(dentro))).toBe(true)
  })
  it('rifiuta zero e secondi oltre 59', () => {
    expect(ripartenzaValida(normalizzaRipartenza('0'))).toBe(false)
    expect(ripartenzaValida(normalizzaRipartenza('1:75'))).toBe(false)
  })
})

describe('passaggiCoerenti', () => {
  it('va bene se i passaggi crescono e restano sotto il finale', () => {
    expect(passaggiCoerenti(['30"00', `1'02"00`], `1'35"00`)).toBeNull()
  })
  it('segnala un passaggio più veloce del precedente', () => {
    expect(passaggiCoerenti(['30"00', '29"00'], `1'00"00`)).toMatch(/passaggio 2/)
  })
  it("segnala l'ultimo passaggio oltre il finale", () => {
    expect(passaggiCoerenti(['30"00', `1'02"00`], '59"00')).toMatch(/ultimo passaggio/)
  })
  it('ignora i passaggi vuoti', () => {
    expect(passaggiCoerenti(['', '30"00'], '59"00')).toBeNull()
  })
})
