import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Prova del segnale di attività senza database né schermo: useEffect gira subito, document e supabase sono finti
const rpc = vi.fn(() => Promise.resolve({}))
let utente = { id: 'u1' }
vi.mock('./supabaseClient', () => ({ supabase: { rpc: (...a) => rpc(...a) } }))
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: utente }) }))
vi.mock('react', () => ({ useEffect: (fn) => { globalThis.__pulizia = fn() } }))

const { useSegnalaAttivita } = await import('./attivita')

let visibilita, ascoltatori
beforeEach(() => {
  vi.useFakeTimers()
  rpc.mockClear()
  utente = { id: 'u1' }
  visibilita = 'visible'
  ascoltatori = {}
  globalThis.document = {
    get visibilityState() { return visibilita },
    addEventListener: (n, f) => { ascoltatori[n] = f },
    removeEventListener: (n) => { delete ascoltatori[n] },
  }
})
afterEach(() => { globalThis.__pulizia?.(); vi.useRealTimers() })

describe('useSegnalaAttivita', () => {
  it('segna l\'apertura e poi un segnale al minuto', () => {
    useSegnalaAttivita()
    expect(rpc).toHaveBeenCalledWith('segnala_attivita', { p_apertura: true })
    vi.advanceTimersByTime(180_000)
    expect(rpc).toHaveBeenCalledTimes(4)
    expect(rpc).toHaveBeenLastCalledWith('segnala_attivita', { p_apertura: false })
  })
  it('app in background: niente segnali, al ritorno nuova apertura', () => {
    useSegnalaAttivita()
    visibilita = 'hidden'; ascoltatori.visibilitychange()
    rpc.mockClear()
    vi.advanceTimersByTime(300_000)
    expect(rpc).not.toHaveBeenCalled()
    visibilita = 'visible'; ascoltatori.visibilitychange()
    expect(rpc).toHaveBeenCalledWith('segnala_attivita', { p_apertura: true })
  })
  it('senza utente non segna niente', () => {
    utente = null
    useSegnalaAttivita()
    vi.advanceTimersByTime(120_000)
    expect(rpc).not.toHaveBeenCalled()
  })
})
