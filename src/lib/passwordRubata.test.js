import { describe, expect, it } from 'vitest'
import { impronta, volteRubata } from './passwordRubata'

// Risposta finta del servizio: la riga giusta ha il resto dell'impronta e quante volte è stata vista
const servizio = (righe, ok = true) => async (url) => ({ ok, url, text: async () => righe.join('\r\n') })

describe('password rubate', () => {
  it('impronta SHA-1 come la usa il servizio', async () => {
    expect(await impronta('password')).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8')
  })

  it('manda solo i primi 5 caratteri e trova la password nella risposta', async () => {
    let chiesto = ''
    const chiedi = async (url) => { chiesto = url; return servizio(['1E4C9B93F3F0682250B6CF8331B7EE68FD8:9659365', 'AAAA:0'])(url) }
    expect(await volteRubata('password', chiedi)).toBe(9659365)
    expect(chiesto).toBe('https://api.pwnedpasswords.com/range/5BAA6')
  })

  it('password mai vista, righe di riempimento a 0 e servizio irraggiungibile: non blocca', async () => {
    expect(await volteRubata('password', servizio(['0000000000000000000000000000000000A:3']))).toBe(0)
    expect(await volteRubata('password', servizio(['1E4C9B93F3F0682250B6CF8331B7EE68FD8:0']))).toBe(0)
    expect(await volteRubata('password', servizio([], false))).toBe(0)
    expect(await volteRubata('password', async () => { throw new Error('offline') })).toBe(0)
  })
})
