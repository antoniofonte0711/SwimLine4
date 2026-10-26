// Immagine da condividere di un allenamento (stile adesivo Strava), disegnata nel telefono: niente servizi a pagamento.
// formato 'card' = storia 1080×1920 con fondo blu; 'overlay' = stesse scritte su fondo trasparente, da mettere sopra una foto.
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

const BLU = '#0b4fd9'
const NOTTE = '#083a9e'
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

function blocchi(dati, scelti) {
  return scelti.filter((k) => dati[k]).map((k) => {
    if (k === 'km') return { etichetta: 'Distanza', valore: dati.km, unita: 'km' }
    if (k === 'difficolta') return { etichetta: 'Difficoltà', valore: dati.difficolta.voto, unita: '/10', sotto: dati.difficolta.nome }
    if (k === 'migliore') return { etichetta: 'Miglior tempo', valore: dati.migliore.tempo, sotto: dati.migliore.sotto }
    return { etichetta: 'Record battuti', valore: String(dati.record.n), sotto: dati.record.sotto }
  })
}

const rett = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r) }

function striscia(ctx, segmenti, x, y, w, h, fondo) {
  const tot = segmenti.reduce((a, s) => a + s.metri, 0)
  if (!tot) return
  ctx.save()
  // fondo bianco attorno ai pezzi: anche il blu di A2 si vede sul blu della card
  if (fondo) {
    ctx.fillStyle = fondo
    rett(ctx, x - 8, y - 8, w + 16, h + 16, (h + 16) / 2)
    ctx.fill()
  }
  rett(ctx, x, y, w, h, h / 2)
  ctx.clip()
  let cx = x
  const gap = 5
  segmenti.forEach((s) => {
    const sw = (s.metri / tot) * w
    ctx.fillStyle = s.colore
    ctx.fillRect(cx, y, Math.max(1, sw - gap), h)
    cx += sw
  })
  ctx.restore()
}

function onde(ctx, W, H) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.13)'
  ctx.lineWidth = 4
  for (let i = 0; i < 7; i++) {
    const y = 260 + i * 230
    ctx.beginPath()
    ctx.moveTo(-20, y)
    for (let x = -20; x <= W + 40; x += 60) ctx.lineTo(x, y + Math.sin((x + i * 90) / 120) * 22)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath(); ctx.arc(W - 80, 180, 260, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(60, H - 160, 320, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

const dataLunga = (g) => new Date(g + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

// Testo che non esce dalla larghezza: rimpicciolisce il carattere finché ci sta
function testo(ctx, t, x, y, maxW, peso, px, famiglia = '"Bricolage Grotesque", Figtree, sans-serif') {
  let size = px
  do { ctx.font = `${peso} ${size}px ${famiglia}`; size -= 4 } while (ctx.measureText(t).width > maxW && size > 20)
  ctx.fillText(t, x, y)
  return ctx.measureText(t).width
}

// Un numero: etichetta, valore grande (con unità) e riga sotto. Restituisce l'altezza usata.
function blocco(ctx, b, x, y, maxW, grande) {
  const et = Math.round(grande * 0.24)
  ctx.globalAlpha = 0.8
  testo(ctx, b.etichetta.toUpperCase(), x, y + et, maxW, 700, et, 'Figtree, sans-serif')
  ctx.globalAlpha = 1
  const base = y + et + grande * 0.95
  const w = testo(ctx, b.valore, x - grande * 0.03, base, maxW - (b.unita ? grande * 0.6 : 0), 800, grande)
  if (b.unita) testo(ctx, b.unita, x + w + grande * 0.06, base, grande, 700, Math.round(grande * 0.4))
  let h = et + grande * 1.05
  if (b.sotto) {
    ctx.globalAlpha = 0.85
    testo(ctx, b.sotto, x, base + grande * 0.32, maxW, 600, Math.round(grande * 0.27), 'Figtree, sans-serif')
    ctx.globalAlpha = 1
    h += grande * 0.32
  }
  return h
}

// Disegna e restituisce il canvas. logo = immagine già caricata (facoltativa)
export function disegnaReport(dati, { formato = 'card', scelti = NUMERI.map(([k]) => k), logo = null } = {}) {
  const W = 1080
  const H = 1920
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const card = formato === 'card'
  const lista = blocchi(dati, scelti)
  const X = 100
  const larga = W - X * 2

  if (card) {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, BLU)
    g.addColorStop(1, NOTTE)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    onde(ctx, W, H)
  } else {
    // sull'overlay un'ombra leggera tiene leggibili le scritte sopra qualsiasi foto
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 20
  }
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'

  // i numeri: uno o due in colonna, belli grandi; tre o quattro in una griglia 2×2
  const griglia = lista.length >= 3
  const grande = lista.length === 1 ? 300 : lista.length === 2 ? 220 : 150
  const altBlocco = (b) => Math.round(grande * 0.24) + grande * 1.05 + (b.sotto ? grande * 0.32 : 0)
  const righeGriglia = griglia ? [lista.slice(0, 2), lista.slice(2, 4)] : lista.map((b) => [b])
  const spazio = griglia ? 90 : 110
  const altNumeri = righeGriglia.reduce((a, r) => a + Math.max(...r.map(altBlocco)), 0) + spazio * (righeGriglia.length - 1)
  const altTesta = 170
  const altStriscia = 140
  const tot = altTesta + altNumeri + altStriscia + (card ? 0 : 90)
  let y = card ? Math.max(300, (H - tot) / 2 - 40) : (H - tot) / 2

  ctx.globalAlpha = 0.85
  testo(ctx, 'ALLENAMENTO DI NUOTO', X, y + 44, larga, 700, 44, 'Figtree, sans-serif')
  ctx.globalAlpha = 1
  const d = dataLunga(dati.giorno)
  testo(ctx, d.charAt(0).toUpperCase() + d.slice(1), X, y + 120, larga, 800, 64)
  y += altTesta

  righeGriglia.forEach((r) => {
    const colW = griglia ? (larga - 60) / 2 : larga
    const h = Math.max(...r.map((b, i) => blocco(ctx, b, X + i * (colW + 60), y, colW, grande)))
    y += h + spazio
  })
  y += 30 - spazio

  // la striscia: un pezzo per lavoro, largo quanto i metri, colorato per zona
  ctx.shadowColor = 'transparent'
  striscia(ctx, dati.striscia, X, y, larga, 40, 'rgba(255,255,255,0.92)')
  y += altStriscia

  // firma
  if (card) {
    const lx = X
    if (logo) {
      ctx.save()
      rett(ctx, lx, H - 236, 104, 104, 26)
      ctx.clip()
      ctx.drawImage(logo, lx, H - 236, 104, 104)
      ctx.restore()
    }
    testo(ctx, 'SwimLine4', lx + (logo ? 132 : 0), H - 160, larga, 800, 64)
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    testo(ctx, 'SwimLine4', X, y + 20, larga, 800, 58)
  }
  return c
}
export const caricaLogo = () => new Promise((ok) => {
  const img = new Image()
  img.onload = () => ok(img)
  img.onerror = () => ok(null)
  img.src = '/logo/swimline4-logo-680.jpg'
})

export const canvasInBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'))
