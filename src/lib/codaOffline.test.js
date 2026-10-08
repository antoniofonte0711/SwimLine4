import { describe, it, expect, beforeEach } from 'vitest'
import { aggiungiInCoda, leggiCoda, rimuoviDaCoda, sincronizza } from './codaOffline'

// localStorage finto, in memoria
beforeEach(() => {
  const mem = new Map()
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
  }
})

// Supabase finto: risponde con l'errore deciso per ogni id
const supabaseFinto = (errori = {}) => {
  const inseriti = []
  return {
    inseriti,
    from: () => ({ insert: async (r) => { inseriti.push(r.id); return { error: errori[r.id] || null } } }),
  }
}

describe('coda offline', () => {
  it('tiene separati i tempi di utenti diversi', () => {
    aggiungiInCoda('tempi', { id: 1, atleta_id: 'a' })
    aggiungiInCoda('tempi', { id: 2, atleta_id: 'b' })
    expect(leggiCoda('tempi', 'a').map((r) => r.id)).toEqual([1])
    rimuoviDaCoda('tempi', 1)
    expect(leggiCoda('tempi', 'a')).toEqual([])
    expect(leggiCoda('tempi', 'b').map((r) => r.id)).toEqual([2])
  })

  it('invia solo i miei e lascia in coda quelli falliti', async () => {
    aggiungiInCoda('tempi', { id: 1, atleta_id: 'a' })
    aggiungiInCoda('tempi', { id: 2, atleta_id: 'a' })
    aggiungiInCoda('tempi', { id: 3, atleta_id: 'b' })
    const sb = supabaseFinto({ 2: { code: '500', message: 'errore' } })
    expect(await sincronizza(sb, 'tempi', 'a')).toBe(1)
    expect(sb.inseriti).toEqual([1, 2])
    expect(leggiCoda('tempi', 'a').map((r) => r.id)).toEqual([2])
    expect(leggiCoda('tempi', 'b').map((r) => r.id)).toEqual([3])
  })

  it('un tempo già presente sul server (23505) conta come inviato: niente doppioni', async () => {
    aggiungiInCoda('tempi', { id: 1, atleta_id: 'a' })
    const sb = supabaseFinto({ 1: { code: '23505' } })
    expect(await sincronizza(sb, 'tempi', 'a')).toBe(1)
    expect(leggiCoda('tempi', 'a')).toEqual([])
  })

  it('localStorage rovinato non blocca l\'app', () => {
    localStorage.setItem('swimline4:coda:tempi', '{non json')
    expect(leggiCoda('tempi', 'a')).toEqual([])
  })
})
