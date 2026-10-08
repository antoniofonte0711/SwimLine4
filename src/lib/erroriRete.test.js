import { describe, it, expect, vi, afterEach } from 'vitest'
import { creaFetchControllato, ascoltaErrori } from './erroriRete'

const URL_DATI = 'https://x.supabase.co/rest/v1/allenamenti?select=*'
const risposta = (status) => ({ status })

let via
afterEach(() => via?.())

function prova(fetchFinto) {
  const visti = []
  via = ascoltaErrori((t) => visti.push(t))
  return { visti, f: creaFetchControllato(fetchFinto) }
}

describe('fetch controllato', () => {
  it('lettura riuscita: nessun avviso', async () => {
    const { visti, f } = prova(async () => risposta(200))
    await f(URL_DATI)
    expect(visti).toEqual([])
  })

  it('lettura rifiutata dal server: avviso "server"', async () => {
    const { visti, f } = prova(async () => risposta(500))
    await f(URL_DATI)
    expect(visti).toEqual(['server'])
  })

  it('niente rete: avviso "rete" e l\'errore arriva comunque al chiamante', async () => {
    const { visti, f } = prova(async () => { throw new TypeError('Failed to fetch') })
    await expect(f(URL_DATI)).rejects.toThrow('Failed to fetch')
    expect(visti).toEqual(['rete'])
  })

  it('ignora .single() vuoto (406), salvataggi e login', async () => {
    const fetchFinto = vi.fn(async (_u, init) => risposta(init?.status || 406))
    const { visti, f } = prova(fetchFinto)
    await f(URL_DATI)
    await f(URL_DATI, { method: 'POST', status: 400 })
    await f('https://x.supabase.co/auth/v1/token', { status: 400 })
    expect(visti).toEqual([])
  })
})
