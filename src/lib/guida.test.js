import { describe, expect, it } from 'vitest'
import { GUIDA, RUOLI_GUIDA, guidaPagina, guidaPer } from './guida'
import { funzioniConsentite } from './permessi'

describe('guida', () => {
  const ruoli = RUOLI_GUIDA.map(([k]) => k)
  it('ogni scheda ha titolo, ruoli validi e almeno un tasto spiegato', () => {
    GUIDA.forEach((s) => {
      expect(s.titolo).toBeTruthy()
      expect(Array.isArray(s.pagine)).toBe(true)
      expect(s.passi.length).toBeGreaterThan(0)
      s.per.forEach((r) => expect(ruoli).toContain(r))
      s.passi.forEach(([tasto, cosa]) => { expect(tasto).toBeTruthy(); expect(cosa.length).toBeGreaterThan(10) })
    })
  })

  it('nessun tasto spiegato due volte nella stessa scheda (la pagina Guida li usa come chiave)', () => {
    GUIDA.forEach((s) => {
      const tasti = s.passi.map(([t]) => t)
      expect(tasti.filter((t, i) => tasti.indexOf(t) !== i), s.id).toEqual([])
    })
  })

  it('il "?" mostra la scheda della pagina giusta per ogni ruolo', () => {
    const ids = (p, r) => guidaPagina(p, r).map((s) => s.id)
    expect(ids('/allenamenti', 'atleta')).toEqual(['allenamenti'])
    expect(ids('/allenamenti', 'coach')).toEqual(['editor'])
    expect(ids('/dashboard', 'genitore')).toEqual(['oggi-genitore'])
    expect(ids('/dashboard', 'coach')).toEqual(['editor'])
    expect(ids('/gare', 'coach')).toEqual(['gare-coach'])
    expect(ids('/gare', 'genitore')).toEqual(['gare'])
    expect(ids('/squadra', 'admin')).toEqual(['squadra-coach'])
    expect(ids('/pagina-che-non-esiste', 'atleta')).toEqual(['menu'])
  })

  it('ogni sezione che un ruolo può aprire ha la sua scheda nella guida', () => {
    ruoli.filter((r) => r !== 'admin').forEach((r) => {
      funzioniConsentite(r).filter((p) => !['/archivio'].includes(p)).forEach((p) => {
        expect(guidaPagina(p, r)[0].id, `${r} ${p}`).not.toBe('menu')
      })
    })
  })

  it('ognuno vede le sue schede nella guida completa, l\'admin tutte', () => {
    const titoli = (r) => guidaPer(r).map((s) => s.id)
    expect(titoli('genitore')).toContain('oggi-genitore')
    expect(titoli('genitore')).not.toContain('editor')
    expect(titoli('atleta')).not.toContain('admin')
    expect(titoli('admin')).toHaveLength(GUIDA.length)
  })
})
