// Tempo medio di un lavoro: per quando l'atleta non ricorda i singoli tempi.
// Conta come un tempo normale (record, progressi, previsioni): sta in "tempo_totale", che quelle schermate già leggono.
// Il marcatore "Media" nel commento serve solo a riconoscerlo e a mostrarlo come media.
const MARCATORE = 'Media'

// (le medie salvate nella prima versione, "Media 1'05\"00" nel commento, si rileggono e si sistemano al prossimo salvataggio)
export const leggiMedia = (riga) => (riga?.commento === MARCATORE ? riga.tempo_totale || ''
  : typeof riga?.commento === 'string' && riga.commento.startsWith(MARCATORE + ' ') ? riga.commento.slice(MARCATORE.length + 1) : '')
// campi da salvare nel lavoro
export const campiMedia = (tempo) => (tempo ? { commento: MARCATORE, tempo_totale: tempo } : { commento: null, tempo_totale: null })
