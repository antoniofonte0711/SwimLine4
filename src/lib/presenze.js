// Allenamenti di squadra a settimana. In futuro diventerà una variabile in base all'età dell'atleta.
export const ALLENAMENTI_SETTIMANA = 5
// Giorni in cui si allena la squadra (0 = domenica ... 6 = sabato): qui lunedì-venerdì
export const GIORNI_ALLENAMENTO = [1, 2, 3, 4, 5]

export const STATI = {
  presente: 'Presente',
  assente: 'Assente',
  non_penale: 'Assenza non penale',
}

// Presenze su un elenco di righe { data, stato }.
// L'assenza non penale (festività) non conta né a favore né contro.
// I giorni non ancora segnati dal coach non contano.
export function riepilogoPresenze(righe) {
  const presenti = righe.filter((r) => r.stato === 'presente').length
  const assenti = righe.filter((r) => r.stato === 'assente').length
  const nonPenale = righe.filter((r) => r.stato === 'non_penale').length
  const totale = presenti + assenti
  return {
    presenti,
    assenti,
    nonPenale,
    percentuale: totale ? Math.round((presenti / totale) * 100) : null,
  }
}

// Lunedì della settimana di una data, come 2026-09-28
export function lunediDi(d = new Date()) {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
