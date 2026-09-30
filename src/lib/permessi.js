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
  '/record', '/archivio', '/squadra', '/calendario', '/impostazioni',
]

const PERMESSI = {
  admin: [...TUTTE, '/presenze'],
  coach: [...TUTTE, '/presenze'],
  atleta: TUTTE,
  // Il genitore guarda soltanto: niente inserimento di lavori
  genitore: TUTTE.filter((p) => p !== '/allenamenti'),
  // L'ospite vede solo le informazioni pubbliche della squadra
  ospite: ['/squadra', '/calendario'],
}

export const nomeRuolo = (r) => (RUOLI_VISTA.find(([k]) => k === r) || [, r])[1]

// Chi può inserire o modificare dati (tempi, gare, video)
export const puoModificare = (ruolo) => ['admin', 'coach', 'atleta'].includes(ruolo)

export const funzioniConsentite = (ruolo) => PERMESSI[ruolo] || TUTTE

export function percorsoConsentito(ruolo, percorso) {
  if (percorso === '/riepilogo') return ruolo !== 'ospite'
  if (TUTTE.includes(percorso) || percorso === '/presenze') return funzioniConsentite(ruolo).includes(percorso)
  return true // home, funzioni, profilo e simili sono per tutti
}
