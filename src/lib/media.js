// Tempo medio di un lavoro: per quando l'atleta non ricorda i singoli tempi.
// Si salva nel testo "commento" del lavoro (come "Media 1'05"00"), così non conta come tempo vero
// nei record, nei progressi e nelle previsioni.
const PREFISSO = 'Media '

export const leggiMedia = (commento) => (typeof commento === 'string' && commento.startsWith(PREFISSO) ? commento.slice(PREFISSO.length) : '')
export const scriviMedia = (tempo) => (tempo ? PREFISSO + tempo : null)
