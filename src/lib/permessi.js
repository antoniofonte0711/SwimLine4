// Chi può vedere e fare cosa. Per cambiare i permessi basta modificare questo file.
// Ruoli: admin | coach | atleta | genitore | ospite
export const RUOLI_VISTA = [
  ['admin', 'Admin (io)'],
  ['coach', 'Coach'],
  ['atleta', 'Atleta'],
  ['genitore', 'Genitore'],
  ['ospite', 'Ospite'],
]

const TUTTE = [
  '/allenamenti', '/storico', '/gare', '/video', '/progressi',
  '/record', '/archivio', '/squadra', '/calendario', '/punti',
]
// Solo admin e coach (anche quando l'admin guarda l'app come coach)
const SOLO_COACH = ['/presenze', '/impostazioni']

const PERMESSI = {
  admin: [...TUTTE, ...SOLO_COACH],
  coach: [...TUTTE, ...SOLO_COACH],
  atleta: TUTTE,
  // Il genitore guarda soltanto: niente inserimento di lavori
  genitore: TUTTE.filter((p) => p !== '/allenamenti' && p !== '/punti'),
  // L'ospite vede solo le informazioni pubbliche della squadra
  ospite: ['/squadra', '/calendario'],
}

// Sezioni non ancora pronte: si vedono in sviluppo e nell'anteprima Vercel, non agli utenti veri
export const IN_ARRIVO = ['/video', '/archivio']
export const mostraInArrivo = import.meta.env.DEV || import.meta.env.VITE_VERCEL_ENV === 'preview'

export const nomeRuolo = (r) => RUOLI_VISTA.find(([k]) => k === r)?.[1] ?? r

// Chi può inserire o modificare dati (tempi, gare, video)
export const puoModificare = (ruolo) => ['admin', 'coach', 'atleta'].includes(ruolo)

export const funzioniConsentite = (ruolo) => PERMESSI[ruolo] || TUTTE

export function percorsoConsentito(ruolo, percorso) {
  if (percorso === '/riepilogo') return ruolo !== 'ospite'
  if (TUTTE.includes(percorso) || SOLO_COACH.includes(percorso)) return funzioniConsentite(ruolo).includes(percorso)
  return true // home, funzioni, profilo e simili sono per tutti
}
