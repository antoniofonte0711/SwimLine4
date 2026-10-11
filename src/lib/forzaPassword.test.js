import { describe, expect, it } from 'vitest'
import { forzaPassword } from './forzaPassword'

describe('forza della password', () => {
  it('sotto gli 8 caratteri è troppo corta', () => {
    expect(forzaPassword('')).toBe(0)
    expect(forzaPassword('Ab1!xyz')).toBe(0)
  })
  it('le password facili restano deboli', () => {
    expect(forzaPassword('12345678')).toBe(1)
    expect(forzaPassword('aaaaaaaa')).toBe(1)
    expect(forzaPassword('Password1')).toBeLessThanOrEqual(2)
  })
  it('lunga e varia è ottima', () => {
    expect(forzaPassword('vasca-blu-Corsia7-delfino')).toBe(4)
    expect(forzaPassword('Tr0mbet7a')).toBeGreaterThanOrEqual(3)
  })
  it('più è lunga, più sale', () => {
    expect(forzaPassword('gattoverde')).toBeLessThan(forzaPassword('gattoverdecorre99'))
  })
})
