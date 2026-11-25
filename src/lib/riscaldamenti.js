// Riscaldamenti gara (migrazione 49): logica senza database.
// Ogni salvataggio è una versione: per ogni gara l'ultima è quella in uso, le altre sono lo storico.

export const TUTTE = 'Tutte le gare'
export const garaDi = (distanza, stile) => `${Number(distanza)} ${stile}`

// lista di versioni (qualsiasi ordine) -> [{ gara, attuale, storico: [versioni più vecchie, dalla più recente] }]
// in ordine di gara: prima "Tutte le gare", poi per stile e distanza
export function perGara(lista = []) {
  const gruppi = new Map()
  ;[...lista].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).forEach((v) => {
    if (!gruppi.has(v.gara)) gruppi.set(v.gara, [])
    gruppi.get(v.gara).push(v)
  })
  return [...gruppi.entries()]
    .map(([gara, versioni]) => ({ gara, attuale: versioni[0], storico: versioni.slice(1) }))
    .sort((a, b) => ordineGara(a.gara) - ordineGara(b.gara) || a.gara.localeCompare(b.gara, 'it', { numeric: true }))
}
const ordineGara = (g) => (g === TUTTE ? 0 : 1)

// I riscaldamenti da mostrare in un giorno: quelli che l'atleta ha messo in quel giorno e, per ogni gara che ha
// quel giorno (dalla sezione Gare), il riscaldamento di quella gara o, se manca, quello per tutte le gare.
// gareDelGiorno: [{ distanza, stile }]. Ritorna i gruppi di perGara (senza doppioni).
export function riscaldamentiDelGiorno(lista = [], giorno, gareDelGiorno = []) {
  const gruppi = perGara(lista)
  const scelti = []
  const metti = (g) => { if (g && !scelti.includes(g)) scelti.push(g) }
  gareDelGiorno.forEach((x) => metti(gruppi.find((g) => g.gara === garaDi(x.distanza, x.stile)) || gruppi.find((g) => g.gara === TUTTE)))
  gruppi.filter((g) => (g.attuale.giorni || []).includes(giorno)).forEach(metti)
  return scelti
}

// Due versioni hanno gli stessi lavori e note? (per non salvare una versione uguale alla precedente)
const pulite = (righe = []) => JSON.stringify(righe.map(({ _id, ...r }) => r))
export const stessoRiscaldamento = (a, b) => pulite(a?.righe) === pulite(b?.righe) && (a?.note || '') === (b?.note || '')
