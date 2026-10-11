import { describe, it, expect, beforeEach } from 'vitest'
import { aggiungiInCoda, leggiCoda, rimuoviDaCoda, sincronizza, svuotaCache } from './codaOffline'

// localStorage finto, in memoria (stessi metodi di quello vero)
beforeEach(() => {
  const mem = new Map()
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() { return mem.size },
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

  it('all\'uscita sparisce la copia offline ma non la coda da inviare', () => {
    localStorage.setItem('swimline4:cache:gare:u1', '[1]')
    localStorage.setItem('swimline4:coda:gare', '[2]')
    svuotaCache()
    expect(localStorage.getItem('swimline4:cache:gare:u1')).toBe(null)
    expect(localStorage.getItem('swimline4:coda:gare')).toBe('[2]')
  })

  it('localStorage rovinato non blocca l\'app', () => {
    localStorage.setItem('swimline4:coda:tempi', '{non json')
    expect(leggiCoda('tempi', 'a')).toEqual([])
  })
})
