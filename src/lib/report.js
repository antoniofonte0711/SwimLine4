// I numeri di un allenamento da condividere. Il disegno delle immagini è in grafiche.js.
import { coloreLavoro } from './lavori'
import { metriPiano } from './pianoSquadra'
import { difficoltaPiano, formattaVoto } from './difficolta'
import { recordPersonali, risultati } from './orgoglio'
import { secondiInTempo, tempoInSecondi } from './tempo'

export const NUMERI = [
  ['km', 'Km'],
  ['difficolta', 'Difficoltà'],
  ['migliore', 'Miglior tempo'],
  ['record', 'Record battuti'],
]

const hexDi = (tipo) => coloreLavoro(tipo).match(/bg-\[(#[0-9a-fA-F]{3,8})\]/)?.[1] || '#7cc4ff'

// I numeri dell'allenamento. allenamenti/gare = tutti quelli dell'atleta (per i record), null per coach e genitori
export function datiReport({ piano, giorno, allenamenti = null, gare = [] }) {
  const righe = piano?.righe || []
  const diff = difficoltaPiano(righe)
  const dati = {
    giorno,
    km: (metriPiano(righe) / 1000).toFixed(1).replace('.', ','),
    difficolta: diff ? { voto: formattaVoto(diff.voto), nome: diff.livello.nome } : null,
    striscia: righe.map((r) => ({ metri: (Number(r.distanza) || 0) * (Number(r.ripetizioni) || 1), colore: hexDi(r.tipo_lavoro || '') })).filter((s) => s.metri > 0),
    migliore: null,
    record: null,
  }
  if (allenamenti) {
    // miglior passaggio del giorno: il più veloce in proporzione alla distanza
    let meglio = null
    allenamenti.filter((a) => a.data_allenamento === giorno).forEach((a) => {
      ;(a.passaggi || []).forEach((p) => {
        const sec = tempoInSecondi(p)
        if (sec === null || !a.distanza) return
        if (!meglio || sec / a.distanza < meglio.sec / meglio.distanza) meglio = { sec, distanza: a.distanza, stile: a.stile }
      })
    })
    // per l'atleta ci sono sempre tutti e 4 i numeri, anche senza tempi o record quel giorno
    dati.migliore = meglio
      ? { tempo: secondiInTempo(meglio.sec), sotto: `${meglio.distanza} m ${String(meglio.stile || '').toLowerCase()}` }
      : { tempo: '—', sotto: 'nessun tempo scritto' }
    const battuti = recordPersonali(risultati(allenamenti, gare)).filter((r) => r.data === giorno)
    dati.record = { n: battuti.length, sotto: battuti[0] ? `${battuti[0].etichetta} −${secondiInTempo(battuti[0].meglio)}` : 'nessuno oggi' }
  }
  return dati
}

// Quali numeri ci sono davvero (il coach non ha tempi né record)
export const numeriDisponibili = (dati) => NUMERI.map(([k]) => k).filter((k) => dati[k])

export function blocchi(dati, scelti) {
  return scelti.filter((k) => dati[k]).map((k) => {
    if (k === 'km') return { etichetta: 'Distanza', valore: dati.km, unita: 'km' }
    if (k === 'difficolta') return { etichetta: 'Difficoltà', valore: dati.difficolta.voto, unita: '/10', sotto: dati.difficolta.nome }
    if (k === 'migliore') return { etichetta: 'Miglior tempo', valore: dati.migliore.tempo, sotto: dati.migliore.sotto }
    return { etichetta: 'Record battuti', valore: String(dati.record.n), sotto: dati.record.sotto }
  })
}

// Legge la foto scelta dal telefono; null se non è un'immagine leggibile
export const caricaFoto = (file) => new Promise((ok) => {
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => { URL.revokeObjectURL(url); ok(img) }
  img.onerror = () => { URL.revokeObjectURL(url); ok(null) }
  img.src = url
})

export const caricaLogo = () => new Promise((ok) => {
  const img = new Image()
  img.onload = () => ok(img)
  img.onerror = () => ok(null)
  img.src = '/logo/swimline4-logo-680.jpg'
})

export const canvasInBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'))
