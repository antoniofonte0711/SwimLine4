import { supabase } from './supabaseClient'
import { version } from '../../package.json'

// Gli errori dell'app arrivano all'admin (Pannello › Segnalazioni › Errori dell'app), senza servizi esterni.
// Mai più di 10 per sessione e mai lo stesso due volte; il registro non deve mai far fallire l'app.

// Rumore che non è un difetto dell'app: rete assente, estensioni del browser, ricarica dopo un rilascio
const IGNORA = /Failed to fetch|NetworkError|Load failed|network error|ResizeObserver loop|dynamically imported module|Importing a module script failed|AbortError|chrome-extension|moz-extension/i

const inviati = new Set()
let conta = 0

export function registraErrore(err, extra = '') {
  try {
    const messaggio = String(err?.message || err || 'Errore sconosciuto').slice(0, 500)
    const chiave = messaggio + location.pathname
    if (IGNORA.test(messaggio + extra) || !navigator.onLine || inviati.has(chiave) || conta >= 10) return
    inviati.add(chiave)
    conta++
    if (import.meta.env.DEV) return console.warn('[registro errori]', messaggio)
    supabase.rpc('registra_errore', {
      p_messaggio: messaggio,
      p_dettagli: [extra, err?.stack].filter(Boolean).join('\n').slice(0, 4000),
      p_pagina: location.pathname,
      p_dispositivo: navigator.userAgent.slice(0, 300),
      p_versione: version,
    }).then(() => {}, () => {})
  } catch { /* niente: il registro non deve mai rompere l'app */ }
}

export function avviaRegistroErrori() {
  window.addEventListener('error', (e) => registraErrore(e.error || e.message, e.filename ? `${e.filename}:${e.lineno}` : ''))
  window.addEventListener('unhandledrejection', (e) => registraErrore(e.reason))
}
