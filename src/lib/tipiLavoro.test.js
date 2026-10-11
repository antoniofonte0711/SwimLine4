import { afterEach, describe, expect, it } from 'vitest'
import {
  POSIZIONI, RIFERIMENTI, elencoLavori, erroreNuovoLavoro, gruppoDaPeso, gruppoDaPosizione,
  impostaRegistro, infoLavoro, lavoriDaScegliere, posizioneDaPeso, votoEsempio,
} from './tipiLavoro'
import { difficoltaPiano, pesoRiga } from './difficolta'
import { coloreLavoro } from './lavori'

const A1 = { sigla: 'A1', gruppo: 'recupero', peso: 0.8, colore: 'menta', descrizione: '', soloCoach: false, origine: 'squadra' }
const EN3 = { sigla: 'EN3', gruppo: 'soglia', peso: 2.1, colore: 'ambra', descrizione: '', soloCoach: false, origine: 'generale' }

afterEach(() => impostaRegistro({}))

describe('tipi di lavoro per squadra', () => {
  it('i lavori di base ci sono sempre, gli aggiunti solo nel registro della squadra', () => {
    expect(infoLavoro('B1').peso).toBe(1.6)
    expect(infoLavoro('A1')).toBeNull()
    impostaRegistro({ extra: [A1] })
    expect(infoLavoro('A1').peso).toBe(0.8)
  })

  it('il lavoro aggiunto pesa nella difficoltà e ha il suo colore', () => {
    impostaRegistro({ extra: [A1] })
    expect(pesoRiga({ tipo_lavoro: 'A1', note: '' })).toBe(0.8)
    expect(difficoltaPiano([{ tipo_lavoro: 'A1', distanza: 100, ripetizioni: 10 }]).gruppi[0].id).toBe('recupero')
    expect(coloreLavoro('A1')).toContain('#c6f0dd')
  })

  it('spunte: base e della squadra accesi, generali aggiunti spenti finché non si spuntano', () => {
    impostaRegistro({ extra: [A1, EN3], spunte: { C3: false } })
    const l = lavoriDaScegliere()
    expect(l).toContain('A1')
    expect(l).not.toContain('EN3')
    expect(l).not.toContain('C3')
    impostaRegistro({ extra: [A1, EN3], spunte: { EN3: true } })
    expect(lavoriDaScegliere()).toContain('EN3')
    expect(elencoLavori().find((t) => t.sigla === 'EN3').attivo).toBe(true)
  })

  it('atleta senza riscaldamento & co., coach con tutto; il lavoro già scelto resta nel menu', () => {
    expect(lavoriDaScegliere()).not.toContain('Riscaldamento')
    expect(lavoriDaScegliere({ coach: true })).toContain('Riscaldamento')
    impostaRegistro({ spunte: { B2: false } })
    expect(lavoriDaScegliere({ tieni: 'B2' })).toContain('B2')
  })

  it('intensità a confronto: "come", "tra", più leggero e più duro', () => {
    const iA2 = RIFERIMENTI.findIndex((r) => r.nome === 'A2')
    expect(POSIZIONI.find((p) => p.id === `come:${iA2}`).peso).toBe(1)
    expect(POSIZIONI.find((p) => p.id === `tra:${iA2}`).peso).toBe(1.3) // tra A2 e B1
    expect(POSIZIONI[0].peso).toBeLessThan(RIFERIMENTI[0].peso)
    expect(POSIZIONI.at(-1).peso).toBeGreaterThan(4.5)
    expect(gruppoDaPosizione(`come:${iA2}`)).toBe('aerobico')
    expect(gruppoDaPeso(0.6)).toBe('recupero')
    expect(gruppoDaPeso(2.3)).toBe('soglia')
    expect(gruppoDaPeso(4)).toBe('lattacido')
    expect(posizioneDaPeso(1.3)).toBe(`tra:${iA2}`)
    expect(votoEsempio(1)).toBe(4)
  })

  it('niente sigle doppie (anche maiuscole/minuscole) né vuote', () => {
    expect(erroreNuovoLavoro('')).toMatch(/sigla/)
    expect(erroreNuovoLavoro('b1')).toMatch(/già/)
    expect(erroreNuovoLavoro(' a1 ', [A1])).toMatch(/già/)
    expect(erroreNuovoLavoro('A3', [A1])).toBe('')
  })
})
