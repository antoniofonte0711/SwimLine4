// Immagine da condividere di un allenamento (stile adesivo Strava), disegnata nel telefono: niente servizi a pagamento.
// formato 'card' = storia 1080×1920 con fondo blu; 'overlay' = adesivo trasparente centrato, ritagliato sul contenuto, da mettere sopra una foto.
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
export function disegnaReport(dati, { formato = 'card', scelti = NUMERI.map(([k]) => k), logo = null, foto = null, stile = 'corsia' } = {}) {
  const lista = blocchi(dati, scelti)
  if (formato !== 'card') {
    const disegna = { tabellone: adesivoTabellone, zone: adesivoZone, onda: adesivoOnda }[stile] || adesivoCorsia
    const adesivo = disegna(dati, lista, logo)
    return foto ? suFoto(adesivo, foto) : adesivo
  }
  const W = 1080
  const H = 1920
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const X = 100
  const larga = W - X * 2

  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, BLU)
  g.addColorStop(1, NOTTE)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  onde(ctx, W, H)
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
  const tot = altTesta + altNumeri + altStriscia
  let y = Math.max(300, (H - tot) / 2 - 40)

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
  striscia(ctx, dati.striscia, X, y, larga, 40, 'rgba(255,255,255,0.92)')

  // firma
  if (logo) {
    ctx.save()
    rett(ctx, X, H - 236, 104, 104, 26)
    ctx.clip()
    ctx.drawImage(logo, X, H - 236, 104, 104)
    ctx.restore()
  }
  testo(ctx, 'SwimLine4', X + (logo ? 132 : 0), H - 160, larga, 800, 64)
  return c
}

const DISPLAY = '"Bricolage Grotesque", Figtree, sans-serif'
const CORPO = 'Figtree, sans-serif'

// Imposta il carattere più grande (fino a px) che fa stare t in maxW; restituisce la larghezza
function adatta(ctx, t, maxW, peso, px, famiglia, spaziatura = 0) {
  let size = px
  do {
    ctx.font = `${peso} ${size}px ${famiglia}`
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(size * spaziatura)}px`
    size -= 2
  } while (ctx.measureText(t).width > maxW && size > 16)
  return ctx.measureText(t).width
}

// Overlay: adesivo trasparente centrato e ritagliato sul contenuto, da appoggiare su una foto (stile Strava).
function disegnaOverlay(dati, lista, logo) {
  const W = 1080
  const M = 70 // margine: spazio per l'ombra
  const larga = W - M * 2
  const n = lista.length
  const g = n === 1 ? 280 : n === 2 ? 210 : 170 // altezza dei numeri
  const et = Math.round(g * 0.2)
  const sot = Math.round(g * 0.19)
  const altBlocco = (b) => et + g * 0.98 + (b.sotto ? sot * 1.9 : 0)
  const spazio = Math.round(g * 0.34)
  const altTesta = 150
  const altStriscia = 30
  const altFirma = 90
  const H = Math.round(M + altTesta + lista.reduce((a, b) => a + altBlocco(b), 0) + spazio * (n - 1) + 80 + altStriscia + 80 + altFirma + M)

  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const cx = W / 2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#fff'
  const ombra = (forte) => {
    ctx.shadowColor = `rgba(0,0,0,${forte ? 0.45 : 0.35})`
    ctx.shadowBlur = forte ? 28 : 18
    ctx.shadowOffsetY = forte ? 4 : 2
  }
  const spazi = (v) => { if ('letterSpacing' in ctx) ctx.letterSpacing = v }

  // testa: tipo e data
  let y = M
  ombra(false)
  ctx.globalAlpha = 0.9
  adatta(ctx, 'ALLENAMENTO DI NUOTO', larga, 700, 34, CORPO, 0.22)
  ctx.fillText('ALLENAMENTO DI NUOTO', cx, y + 34)
  ctx.globalAlpha = 1
  const d = dataLunga(dati.giorno)
  const data = d.charAt(0).toUpperCase() + d.slice(1)
  adatta(ctx, data, larga, 700, 56, DISPLAY)
  ctx.fillText(data, cx, y + 104)
  spazi('0px')
  y += altTesta

  // i numeri, uno sotto l'altro e centrati
  lista.forEach((b, i) => {
    ombra(false)
    ctx.globalAlpha = 0.85
    adatta(ctx, b.etichetta.toUpperCase(), larga, 700, et, CORPO, 0.18)
    ctx.fillText(b.etichetta.toUpperCase(), cx, y + et)
    spazi('0px')
    ctx.globalAlpha = 1

    // valore grande + unità piccola, centrati insieme
    const base = y + et + g * 0.9
    ombra(true)
    const ug = Math.round(g * 0.36)
    ctx.font = `700 ${ug}px ${DISPLAY}`
    const wu = b.unita ? ctx.measureText(b.unita).width + g * 0.06 : 0
    const wv = adatta(ctx, b.valore, larga - wu, 800, g, DISPLAY)
    const x0 = cx - (wv + wu) / 2
    ctx.textAlign = 'left'
    ctx.fillText(b.valore, x0, base)
    if (b.unita) {
      ctx.font = `700 ${ug}px ${DISPLAY}`
      ctx.globalAlpha = 0.9
      ctx.fillText(b.unita, x0 + wv + g * 0.06, base)
      ctx.globalAlpha = 1
    }
    ctx.textAlign = 'center'
    if (b.sotto) {
      ombra(false)
      ctx.globalAlpha = 0.85
      adatta(ctx, b.sotto, larga, 600, sot, CORPO)
      ctx.fillText(b.sotto, cx, base + sot * 1.75)
      ctx.globalAlpha = 1
    }
    y += altBlocco(b) + (i < n - 1 ? spazio : 0)
  })
  y += 80

  // la striscia dei lavori, più sottile e senza cornice bianca piena
  const sw = Math.min(larga, 720)
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 14
  ctx.shadowOffsetY = 2
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  rett(ctx, cx - sw / 2 - 6, y - 6, sw + 12, altStriscia + 12, (altStriscia + 12) / 2)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  striscia(ctx, dati.striscia, cx - sw / 2, y, sw, altStriscia, null)
  y += altStriscia + 80

  // firma: logo + nome, centrati
  ctx.fillStyle = '#fff'
  ombra(false)
  const lg = logo ? 76 : 0
  ctx.font = `800 52px ${DISPLAY}`
  const wn = ctx.measureText('SwimLine4').width
  const xl = cx - (lg + (logo ? 22 : 0) + wn) / 2
  if (logo) {
    ctx.save()
    rett(ctx, xl, y, lg, lg, 20)
    ctx.fill() // base per l'ombra
    ctx.clip()
    ctx.shadowColor = 'transparent'
    ctx.drawImage(logo, xl, y, lg, lg)
    ctx.restore()
  }
  ctx.textAlign = 'left'
  ctx.fillText('SwimLine4', xl + lg + (logo ? 22 : 0), y + lg / 2 + 19)
  return c
}
// Gli stili dell'adesivo trasparente: tutti con elementi della piscina, per avere un aspetto nostro
export const STILI = [
  ['corsia', 'Corsia'],
  ['tabellone', 'Tabellone'],
  ['zone', 'Zone'],
  ['onda', 'Onda'],
]

const GIALLO = '#ffd23f'
const AZZURRO = '#2b6cf0'

function tela(W, H) {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 2
  return [c, ctx]
}

// logo + "SwimLine4" che partono da x (o centrati su x se centro=true)
function firma(ctx, logo, x, y, px, centro = false) {
  const lg = logo ? Math.round(px * 1.45) : 0
  const gap = logo ? Math.round(px * 0.4) : 0
  ctx.font = `800 ${px}px ${DISPLAY}`
  const wn = ctx.measureText('SwimLine4').width
  const x0 = centro ? x - (lg + gap + wn) / 2 : x
  if (logo) {
    ctx.save()
    rett(ctx, x0, y, lg, lg, lg * 0.26)
    ctx.fill()
    ctx.clip()
    ctx.shadowColor = 'transparent'
    ctx.drawImage(logo, x0, y, lg, lg)
    ctx.restore()
  }
  ctx.textAlign = 'left'
  ctx.fillText('SwimLine4', x0 + lg + gap, y + (lg || px) / 2 + px * 0.36)
}

const valoreIntero = (b) => (b.unita ? `${b.valore} ${b.unita}` : b.valore)
const dataBreve = (g) => new Date(g + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
const senzaSpazi = (ctx) => { if ('letterSpacing' in ctx) ctx.letterSpacing = '0px' }

// valore grande + unità piccola, centrati insieme su cx
function numeroGrande(ctx, b, cx, base, g, maxW) {
  const ug = Math.round(g * 0.34)
  ctx.font = `700 ${ug}px ${DISPLAY}`
  const wu = b.unita ? ctx.measureText(b.unita).width + g * 0.06 : 0
  const wv = adatta(ctx, b.valore, maxW - wu, 800, g, DISPLAY)
  const x0 = cx - (wv + wu) / 2
  ctx.textAlign = 'left'
  ctx.fillText(b.valore, x0, base)
  if (b.unita) { ctx.font = `700 ${ug}px ${DISPLAY}`; ctx.fillText(b.unita, x0 + wv + g * 0.06, base) }
  ctx.textAlign = 'center'
}

// Galleggiante di corsia verticale: palline bianche e azzurre alternate
function galleggiante(ctx, x, y0, y1, r) {
  let i = 0
  for (let y = y0 + r; y <= y1 - r; y += r * 2.3) {
    ctx.fillStyle = i % 2 ? AZZURRO : '#fff'
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r, 0, 0, Math.PI * 2); ctx.fill()
    i++
  }
  ctx.fillStyle = '#fff'
}

// Corsia: i numeri centrati, tra due galleggianti come in vasca
function adesivoCorsia(dati, lista, logo) {
  const dentro = disegnaOverlay(dati, lista, logo)
  const W = 1080
  const k = 0.84
  const H = Math.round(dentro.height * k)
  const [c, ctx] = tela(W, H)
  ctx.shadowBlur = 10
  galleggiante(ctx, 52, 20, H - 20, 17)
  galleggiante(ctx, W - 52, 20, H - 20, 17)
  ctx.shadowColor = 'transparent'
  ctx.drawImage(dentro, (W - W * k) / 2, 0, W * k, H)
  return c
}

// Tabellone: come il tabellone dei tempi in piscina, pannello scuro e cifre gialle
function adesivoTabellone(dati, lista, logo) {
  const W = 1080
  const M = 40
  const P = 56
  const riga = 124
  const testa = 120
  const H = M * 2 + P + testa + lista.length * riga + 36 + 20 + P
  const [c, ctx] = tela(W, H)
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 6
  ctx.fillStyle = 'rgba(8,22,48,0.9)'
  rett(ctx, M, M, W - M * 2, H - M * 2, 44)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 3
  ctx.stroke()
  const x0 = M + P
  const x1 = W - M - P
  let y = M + P
  ctx.fillStyle = '#fff'
  firma(ctx, logo, x0, y, 44)
  ctx.textAlign = 'right'
  ctx.fillStyle = GIALLO
  ctx.font = `700 40px ${CORPO}`
  ctx.fillText(dataBreve(dati.giorno).toUpperCase(), x1, y + 46)
  y += testa
  lista.forEach((b) => {
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    ctx.fillRect(x0, y, x1 - x0, 2)
    const base = y + riga / 2 + 24
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    adatta(ctx, b.etichetta.toUpperCase(), 420, 700, 36, CORPO, 0.12)
    ctx.fillText(b.etichetta.toUpperCase(), x0, base - 8)
    senzaSpazi(ctx)
    ctx.textAlign = 'right'
    ctx.fillStyle = GIALLO
    adatta(ctx, valoreIntero(b), x1 - x0 - 440, 800, 76, DISPLAY)
    ctx.fillText(valoreIntero(b), x1, base)
    y += riga
  })
  y += 36
  striscia(ctx, dati.striscia, x0, y, x1 - x0, 20, null)
  return c
}

// Zone: i km grandi e la striscia delle intensità in evidenza, gli altri numeri piccoli sotto
function adesivoZone(dati, lista, logo) {
  const W = 1080
  const M = 70
  const capo = lista.find((b) => b.unita === 'km') || lista[0]
  const altri = lista.filter((b) => b !== capo)
  const g = 250
  const H = M + 46 + 24 + g + 50 + 64 + (altri.length ? 70 + 130 : 0) + 70 + 70 + M
  const [c, ctx] = tela(W, H)
  const cx = W / 2
  let y = M
  ctx.textAlign = 'center'
  ctx.globalAlpha = 0.9
  const t = `${capo.etichetta.toUpperCase()} · ${dataBreve(dati.giorno).toUpperCase()}`
  adatta(ctx, t, W - M * 2, 700, 38, CORPO, 0.16)
  ctx.fillText(t, cx, y + 38)
  senzaSpazi(ctx)
  ctx.globalAlpha = 1
  y += 46 + 24
  ctx.shadowBlur = 28
  numeroGrande(ctx, capo, cx, y + g * 0.8, g, W - M * 2)
  ctx.shadowBlur = 18
  y += g + 50
  // striscia spessa con binario chiaro
  const sw = W - M * 2
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  rett(ctx, M - 8, y - 8, sw + 16, 64 + 16, 40)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  striscia(ctx, dati.striscia, M, y, sw, 64, null)
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.fillStyle = '#fff'
  y += 64
  if (altri.length) {
    y += 70
    const col = sw / altri.length
    altri.forEach((b, i) => {
      const x = M + col * i + col / 2
      ctx.textAlign = 'center'
      adatta(ctx, valoreIntero(b), col - 20, 800, 70, DISPLAY)
      ctx.fillText(valoreIntero(b), x, y + 64)
      ctx.globalAlpha = 0.85
      adatta(ctx, b.etichetta, col - 20, 600, 32, CORPO)
      ctx.fillText(b.etichetta, x, y + 112)
      ctx.globalAlpha = 1
    })
    y += 130
  }
  y += 70
  firma(ctx, logo, cx, y - 20, 44, true)
  return c
}

// Onda: un solo numero grande (il primo scelto) con un'onda sotto
function adesivoOnda(dati, lista, logo) {
  const W = 1080
  const M = 70
  const b = lista[0]
  const g = 300
  const H = M + 50 + 30 + g + 90 + (b.sotto ? 70 : 0) + 50 + 70 + M
  const [c, ctx] = tela(W, H)
  const cx = W / 2
  let y = M
  ctx.textAlign = 'center'
  ctx.globalAlpha = 0.9
  adatta(ctx, b.etichetta.toUpperCase(), W - M * 2, 700, 40, CORPO, 0.2)
  ctx.fillText(b.etichetta.toUpperCase(), cx, y + 40)
  senzaSpazi(ctx)
  ctx.globalAlpha = 1
  y += 50 + 30
  ctx.shadowBlur = 28
  numeroGrande(ctx, b, cx, y + g * 0.82, g, W - M * 2)
  ctx.shadowBlur = 18
  y += g + 40
  // l'onda
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 10
  ctx.lineCap = 'round'
  ctx.beginPath()
  const ow = 560
  for (let x = 0; x <= ow; x += 6) {
    const yy = y + Math.sin((x / ow) * Math.PI * 4) * 16
    if (x === 0) ctx.moveTo(cx - ow / 2 + x, yy)
    else ctx.lineTo(cx - ow / 2 + x, yy)
  }
  ctx.stroke()
  y += 50
  ctx.textAlign = 'center'
  if (b.sotto) { ctx.font = `600 44px ${CORPO}`; ctx.globalAlpha = 0.9; ctx.fillText(b.sotto, cx, y + 40); ctx.globalAlpha = 1; y += 70 }
  y += 50
  firma(ctx, logo, cx, y - 20, 46, true)
  return c
}

// La foto scelta dall'atleta come sfondo della storia (1080×1920, riempita e centrata) con l'adesivo sopra.
// Tutto nel telefono: la foto non viene caricata da nessuna parte.
function suFoto(adesivo, foto) {
  const W = 1080
  const H = 1920
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const k = Math.max(W / foto.width, H / foto.height)
  ctx.drawImage(foto, (W - foto.width * k) / 2, (H - foto.height * k) / 2, foto.width * k, foto.height * k)
  // velo scuro leggero dove stanno i numeri: si leggono anche su una foto chiara
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'rgba(0,0,0,0.05)')
  g.addColorStop(0.5, 'rgba(0,0,0,0.3)')
  g.addColorStop(1, 'rgba(0,0,0,0.15)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const s = Math.min(1, (H * 0.82) / adesivo.height)
  const w = adesivo.width * s
  const h = adesivo.height * s
  ctx.drawImage(adesivo, (W - w) / 2, (H - h) / 2, w, h)
  return c
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
