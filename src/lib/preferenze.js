import { useEffect, useState } from 'react'

// Preferenze personali salvate su questo telefono (non sul database): valgono solo qui
const CHIAVE = 'swimline4:preferenze'
export const PREFERENZE_BASE = {
  tema: 'chiaro', // 'chiaro' | 'scuro' | 'sistema'
  testoGrande: false,
  stile: 'Stile libero', // stile già scelto quando registri i tempi
  tipoLavoro: 'C1', // tipo di lavoro già scelto quando registri i tempi
  schermoAcceso: true, // In vasca: lo schermo non si spegne
  vibrazione: true, // In vasca: vibra quando premi "Fatto"
}

export function leggiPreferenze() {
  try {
    return { ...PREFERENZE_BASE, ...JSON.parse(localStorage.getItem(CHIAVE) || '{}') }
  } catch {
    return { ...PREFERENZE_BASE }
  }
}

const ascoltatori = new Set()

export function salvaPreferenze(cambi) {
  const nuove = { ...leggiPreferenze(), ...cambi }
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(nuove))
  } catch {
    // telefono senza spazio o navigazione privata: valgono finché la pagina resta aperta
  }
  applicaAspetto(nuove)
  ascoltatori.forEach((f) => f(nuove))
  return nuove
}

// Tema scuro e testo grande sono classi sull'elemento <html> (le regole stanno in index.css)
const scuroSistema = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches
export function applicaAspetto(p = leggiPreferenze()) {
  const html = document.documentElement
  html.classList.toggle('scuro', p.tema === 'scuro' || (p.tema === 'sistema' && scuroSistema()))
  html.classList.toggle('testo-grande', !!p.testoGrande)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', html.classList.contains('scuro') ? '#0a1626' : '#f2f6f9')
}

// All'avvio, e quando il telefono passa da chiaro a scuro (solo se il tema è "come il telefono")
export function avviaAspetto() {
  applicaAspetto()
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applicaAspetto())
}

export function usePreferenze() {
  const [p, setP] = useState(leggiPreferenze)
  useEffect(() => {
    ascoltatori.add(setP)
    return () => ascoltatori.delete(setP)
  }, [])
  return [p, salvaPreferenze]
}
