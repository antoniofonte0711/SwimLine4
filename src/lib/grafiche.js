// Le tre grafiche da condividere (storia Instagram 1080×1920), disegnate nel telefono: niente servizi esterni.
// Funzionano per un allenamento e per una gara: ricevono un "contenuto" già pronto (vedi contenutoAllenamento
// e contenutoGara) e lo disegnano in tre stili nati dalla piscina, per non sembrare Strava:
//   vasca   = fondo della vasca, la riga nera della corsia fatta a pezzi colorati
//   lavagna = la lavagna del coach a bordo vasca, scritta a pennarello
//   acqua   = vista da sott'acqua, il numero ondeggia e gli altri salgono come bolle
// Ognuna in due modi: con il suo sfondo, oppure sopra una foto dell'atleta (o adesivo trasparente da incollare).
import { secondiInTempo, tempoInSecondi } from './tempo'
import { passoGara } from './fin/app'

export const STILI = [
  ['vasca', 'Fondo vasca'],
  ['lavagna', 'Lavagna'],
  ['acqua', "Sott'acqua"],
]

const W = 1080
const H = 1920
const BLU_NOTTE = '#10295f'
const COLORI_ALTRI = ['#ffd23f', '#e0393e', '#1fd17a']
const CONDENSATO = '"Big Shoulders Display", "Bricolage Grotesque", sans-serif'
const PENNARELLO = '"Permanent Marker", "Bricolage Grotesque", cursive'
const MANO = 'Kalam, Figtree, cursive'
const TONDO = 'Unbounded, "Bricolage Grotesque", sans-serif'
const CORPO = 'Figtree, sans-serif'

// I caratteri delle grafiche si scaricano solo quando si apre la finestra Condividi
const CARATTERI = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Permanent+Marker&family=Kalam:wght@700&family=Unbounded:wght@400;700;900&display=swap'
export async function caricaCaratteri() {
  if (!document.querySelector('link[data-grafiche]')) {
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = CARATTERI
    l.dataset.grafiche = '1'
    document.head.appendChild(l)
    await new Promise((ok) => { l.onload = ok; l.onerror = ok; setTimeout(ok, 4000) })
  }
  await Promise.all(['900 100px "Big Shoulders Display"', '800 100px "Big Shoulders Display"', '100px "Permanent Marker"', '700 100px Kalam',
    '900 100px Unbounded', '700 100px Unbounded', '400 100px Unbounded'].map((f) => document.fonts?.load(f).catch(() => null)))
}

// ---------- i contenuti ----------
const dataLunga = (g) => { const d = new Date(g + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }); return d.charAt(0).toUpperCase() + d.slice(1) }
const dataLavagna = (g) => { const d = new Date(g + 'T12:00:00'); return `${d.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3)} ${d.getDate()}/${d.getMonth() + 1}` }
const STILE_BREVE = { 'stile libero': 'SL', dorso: 'dorso', rana: 'rana', farfalla: 'farfalla', misti: 'misti' }
const breve = (s) => STILE_BREVE[String(s || '').toLowerCase()] ?? String(s || '').toLowerCase()

// Allenamento: i blocchi scelti (km, difficoltà, miglior tempo, record) e le righe del piano
export function contenutoAllenamento(dati, lista, righePiano = []) {
  const grande = lista.find((b) => b.unita === 'km') || lista[0]
  // il miglior tempo per primo: è quello che si mette in evidenza
  const ordine = ['Miglior tempo', 'Difficoltà', 'Record battuti']
  const altri = lista.filter((b) => b !== grande).sort((x, y) => ordine.indexOf(x.etichetta) - ordine.indexOf(y.etichetta)).map((b) => ({ valore: b.valore, unita: b.unita === 'km' ? '' : b.unita, etichetta: b.etichetta, dettaglio: b.sotto || '' }))
  return {
    giorno: dati.giorno,
    testa: dataLunga(dati.giorno),
    grande: grande ? { valore: grande.valore, sotto: grande.unita === 'km' ? 'chilometri' : grande.etichetta.toLowerCase(), cerchio: grande.unita === 'km' ? 'km fatti' : grande.etichetta.toLowerCase() } : { valore: '', sotto: '', cerchio: '' },
    altri,
    righe: righePiano.filter((r) => Number(r.distanza) > 0).map((r, i) => {
      const rip = Number(r.ripetizioni) || 1
      return { testo: `${rip > 1 ? `${rip}×` : ''}${r.distanza} ${breve(r.stile)}`, nota: r.tipo_lavoro || '', colore: dati.striscia[i]?.colore || '#7cc4ff' }
    }),
    striscia: dati.striscia,
  }
}

// Le voci di una gara che l'atleta può mostrare o togliere
export const NUMERI_GARA = [['posizione', 'Classifica'], ['batteria', 'Batteria'], ['iscrizione', 'Rispetto all\'iscrizione']]
export function numeriGara(g) {
  const p = g?.piazzamento || {}
  const diff = tempoInSecondi(g?.tempo) != null && tempoInSecondi(g?.tempo_iscrizione) != null
  return NUMERI_GARA.map(([k]) => k).filter((k) => (k === 'posizione' ? p.posizione : k === 'batteria' ? p.posto_batteria : diff))
}

// Gara: il tempo grande, i posti e la differenza dall'iscrizione, i passaggi ogni 50
export function contenutoGara(g, scelti = numeriGara(g)) {
  const p = g.piazzamento || {}
  const d = Number(g.distanza) || 0
  const altri = []
  if (scelti.includes('posizione') && p.posizione) altri.push({ valore: `${p.posizione}°`, unita: '', etichetta: 'In classifica', dettaglio: `${p.categoria || 'classifica'}${p.classificati ? `, su ${p.classificati}` : ''}` })
  if (scelti.includes('batteria') && p.posto_batteria) altri.push({ valore: `${p.posto_batteria}°`, unita: '', etichetta: 'In batteria', dettaglio: p.batteria ? `batteria ${p.batteria}` : '' })
  const fin = tempoInSecondi(g.tempo)
  const iscr = tempoInSecondi(g.tempo_iscrizione)
  if (scelti.includes('iscrizione') && fin != null && iscr != null) {
    const diff = Math.round((fin - iscr) * 100) / 100
    altri.push({ valore: diff === 0 ? '=' : `${diff < 0 ? '−' : '+'}${secondiInTempo(Math.abs(diff))}`, unita: '', etichetta: diff <= 0 ? 'Migliorato' : 'Sull\'iscrizione', dettaglio: `iscrizione ${g.tempo_iscrizione}` })
  }
  // passaggi e parziali: un pezzo di riga ogni tratto
  const passo = passoGara(g)
  const cumul = [...(g.passaggi || []).map(tempoInSecondi), fin]
  const tratti = []
  let prima = 0
  let ok = cumul.every((x) => x != null)
  cumul.forEach((x, i) => {
    if (!ok) return
    const metri = i === cumul.length - 1 ? d - passo * i : passo
    if (x <= prima || metri <= 0) { ok = false; return }
    tratti.push({ metri, sec: x - prima, fino: i === cumul.length - 1 ? d : passo * (i + 1), tempo: x })
    prima = x
  })
  const conTratti = ok && tratti.length > 1
  const veloce = conTratti ? Math.min(...tratti.map((t) => t.sec / t.metri)) : null
  const nomeStile = `${d} m ${String(g.stile || '').toLowerCase()}`
  return {
    giorno: g.data_gara,
    testa: g.nome_gara || dataLunga(g.data_gara),
    grande: { valore: g.tempo || '', sotto: nomeStile, cerchio: nomeStile },
    altri,
    righe: conTratti ? tratti.map((t) => ({ testo: `${t.fino} m  ${secondiInTempo(Math.round(t.tempo * 100) / 100)}`, nota: secondiInTempo(Math.round(t.sec * 100) / 100), colore: t.sec / t.metri === veloce ? '#ffc21a' : '#2f6cf6' })) : [],
    striscia: conTratti
      ? tratti.map((t, i) => ({ metri: t.metri, colore: t.sec / t.metri === veloce ? '#ffc21a' : i % 2 ? '#a9dcff' : '#2f6cf6' }))
      : [{ metri: d || 1, colore: '#2f6cf6' }],
  }
}

// ---------- attrezzi di disegno ----------
function tela(w = W, h = H) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}
const rett = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r) }
// imposta il carattere più grande (fino a px) che fa stare t in maxW; restituisce la larghezza
function adatta(ctx, t, maxW, peso, px, famiglia) {
  let s = px
  do { ctx.font = `${peso} ${s}px ${famiglia}`; s -= 4 } while (ctx.measureText(t).width > maxW && s > 18)
  return ctx.measureText(t).width
}
function ombra(ctx, forte) {
  ctx.shadowColor = forte ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = forte ? 26 : 14
  ctx.shadowOffsetY = forte ? 4 : 2
}
const senzaOmbra = (ctx) => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0 }
// numeri pseudo-casuali sempre uguali: la stessa immagine ogni volta
function casuale(seme) { let s = seme; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } }

function firma(ctx, logo, x, yAlto, px, famiglia, colore = '#fff') {
  const lg = logo ? Math.round(px * 1.4) : 0
  if (logo) {
    ctx.save()
    rett(ctx, x, yAlto, lg, lg, lg * 0.26)
    ctx.clip()
    ctx.drawImage(logo, x, yAlto, lg, lg)
    ctx.restore()
  }
  ctx.fillStyle = colore
  ctx.textAlign = 'left'
  ctx.font = `800 ${px}px ${famiglia}`
  ctx.fillText('SwimLine4', x + (logo ? lg + px * 0.3 : 0), yAlto + (lg || px) / 2 + px * 0.34)
}

// ---------- A. Fondo vasca ----------
function vasca(ctx, ct, logo, sfondo) {
  if (sfondo) {
    ctx.fillStyle = '#1fb0d0'
    ctx.fillRect(0, 0, W, H)
    // riflessi della luce sul fondo
    const r = casuale(7)
    for (let i = 0; i < 70; i++) {
      const x = r() * W
      const y = r() * H
      const raggio = 60 + r() * 170
      const g = ctx.createRadialGradient(x, y, 0, x, y, raggio)
      g.addColorStop(0, 'rgba(255,255,255,0.20)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - raggio, y - raggio, raggio * 2, raggio * 2)
    }
    // le piastrelle
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 3, H)
    for (let y = 0; y < H; y += 60) ctx.fillRect(0, y, W, 3)
  }
  const chiaro = !sfondo // sulla foto i testi scuri diventano bianchi
  // la T e la riga della corsia: un pezzo per lavoro (o per tratto di gara)
  if (chiaro) ombra(ctx, false)
  ctx.fillStyle = BLU_NOTTE
  ctx.fillRect(440, 250, 440, 120)
  ctx.fillRect(588, 250, 144, H - 250)
  senzaOmbra(ctx)
  const tot = ct.striscia.reduce((a, s) => a + s.metri, 0) || 1
  let y = 250
  ct.striscia.forEach((s, i) => {
    const h = (s.metri / tot) * (H - 250)
    ctx.fillStyle = s.colore
    ctx.fillRect(600, y + (i ? 10 : 0), 120, h - (i ? 10 : 0))
    y += h
  })
  ctx.textBaseline = 'alphabetic'
  // data o nome della gara
  ctx.textAlign = 'center'
  ctx.fillStyle = chiaro ? '#fff' : BLU_NOTTE
  if (chiaro) ombra(ctx, false)
  adatta(ctx, ct.testa, W - 140, 800, 64, CONDENSATO)
  ctx.fillText(ct.testa, W / 2, 160)
  // il numero grande
  ctx.textAlign = 'left'
  ombra(ctx, true)
  ctx.shadowColor = chiaro ? 'rgba(0,0,0,0.45)' : 'rgba(16,41,95,0.28)'
  ctx.shadowBlur = chiaro ? 26 : 0
  ctx.shadowOffsetY = 8
  ctx.fillStyle = '#fff'
  const wNum = adatta(ctx, ct.grande.valore, 940, 900, 560, CONDENSATO)
  const px = parseInt(ctx.font.match(/(\d+)px/)[1], 10)
  const base = 440 + px * 0.8
  ctx.fillText(ct.grande.valore, 70, base)
  senzaOmbra(ctx)
  ctx.fillStyle = chiaro ? '#fff' : BLU_NOTTE
  if (chiaro) ombra(ctx, false)
  adatta(ctx, ct.grande.sotto, 900, 800, 150, CONDENSATO)
  if (!chiaro) {
    // bordo color acqua: la scritta resta leggibile dove passa sopra la riga scura
    ctx.lineWidth = 16
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1fb0d0'
    ctx.strokeText(ct.grande.sotto, 70, base + 140)
  }
  ctx.fillText(ct.grande.sotto, 70, base + 140)
  // legenda a destra, solo se il numero lascia spazio
  if (wNum < 640 && ct.righe.length && ct.righe.length <= 8) {
    ctx.font = `700 26px ${CORPO}`
    ct.righe.forEach((r, i) => {
      const yy = 430 + i * 46
      senzaOmbra(ctx)
      ctx.fillStyle = '#fff'
      ctx.fillRect(790, yy, 32, 32)
      ctx.fillStyle = r.colore
      ctx.fillRect(793, yy + 3, 26, 26)
      if (chiaro) ombra(ctx, false)
      ctx.fillStyle = '#fff'
      adatta(ctx, `${r.testo} ${r.nota}`.trim(), 220, 700, 26, CORPO)
      ctx.fillText(`${r.testo} ${r.nota}`.trim(), 834, yy + 26)
    })
  }
  // le targhette con gli altri numeri
  ct.altri.slice(0, 3).forEach((a, i) => {
    const ty = 1150 + i * 188
    senzaOmbra(ctx)
    if (chiaro) ombra(ctx, false)
    ctx.fillStyle = 'rgba(255,255,255,0.93)'
    ctx.fillRect(70, ty, 480, 168)
    senzaOmbra(ctx)
    ctx.fillStyle = COLORI_ALTRI[i]
    ctx.fillRect(70, ty, 16, 168)
    ctx.fillStyle = BLU_NOTTE
    const wv = adatta(ctx, a.valore, a.unita ? 300 : 430, 900, 110, CONDENSATO)
    ctx.fillText(a.valore, 116, ty + 112)
    if (a.unita) { ctx.font = `900 60px ${CONDENSATO}`; ctx.fillText(a.unita, 122 + wv, ty + 112) }
    const et = [a.etichetta.toLowerCase(), a.dettaglio].filter(Boolean).join(', ')
    adatta(ctx, et, 420, 700, 30, CORPO)
    ctx.fillText(et, 116, ty + 150)
  })
  if (chiaro) ombra(ctx, false)
  firma(ctx, logo, 70, 1766, 60, CONDENSATO)
  senzaOmbra(ctx)
}

// ---------- B. Lavagna del coach ----------
function lavagna(ctx, ct, logo) {
  ctx.fillStyle = '#f4f6f4'
  ctx.fillRect(0, 0, W, H)
  // aloni di pennarello cancellato
  ;[[760, 300, 420, 160, 'rgba(120,140,170,0.10)'], [300, 1500, 500, 120, 'rgba(120,140,170,0.09)'], [820, 1120, 300, 90, 'rgba(200,60,60,0.05)']].forEach(([x, y, rx, ry, c]) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore()
  })
  // cornice e vaschetta dei pennarelli
  ctx.lineWidth = 34
  ctx.strokeStyle = '#c9ced6'
  ctx.strokeRect(17, 17, W - 34, H - 34)
  ctx.lineWidth = 6
  ctx.strokeStyle = '#aab1bc'
  ctx.strokeRect(37, 37, W - 74, H - 74)
  ctx.fillStyle = '#aab1bc'
  ctx.fillRect(0, H - 64, W, 64)
  ;[['#1b3f9c', 160], ['#d0262c', 400], ['#128a3e', 640]].forEach(([c, x]) => { ctx.fillStyle = c; rett(ctx, x, H - 74, 210, 34, 10); ctx.fill() })
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'

  // data sottolineata
  ctx.save()
  ctx.translate(100, 196)
  ctx.rotate(-0.035)
  ctx.fillStyle = '#1b3f9c'
  const wd = adatta(ctx, dataLavagna(ct.giorno), 520, 400, 76, PENNARELLO)
  ctx.fillText(dataLavagna(ct.giorno), 0, 0)
  ctx.fillRect(0, 18, wd, 8)
  ctx.restore()

  // adesivo giallo con il marchio
  ctx.save()
  ctx.font = `700 38px ${CORPO}`
  const wa = (logo ? 72 : 0) + ctx.measureText('SwimLine4').width + 38
  ctx.translate(W - 90 - wa, 112)
  ctx.rotate(0.07)
  ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6
  ctx.fillStyle = '#ffd84a'
  ctx.fillRect(0, 0, wa, 90)
  senzaOmbra(ctx)
  firma(ctx, logo, 16, 16, 40, CORPO, '#1d2433')
  ctx.restore()

  // le serie (o i passaggi della gara)
  const righe = ct.righe.length > 9 ? [...ct.righe.slice(0, 8), { testo: `+ altre ${ct.righe.length - 8}`, nota: '', colore: '#1d2433' }] : ct.righe
  if (righe.length) {
    const h = Math.min(108, 520 / righe.length)
    righe.forEach((r, i) => {
      const y = 290 + h * (i + 0.8)
      ctx.fillStyle = '#1d2433'
      const w = adatta(ctx, r.testo, 640, 700, Math.round(h * 0.76), MANO)
      ctx.fillText(r.testo, 110, y)
      if (r.nota) {
        ctx.fillStyle = r.colore === '#a9dcff' ? '#2b8fd6' : r.colore
        adatta(ctx, r.nota, 300, 400, Math.round(h * 0.56), PENNARELLO)
        ctx.fillText(r.nota, 110 + w + 18, y)
      }
    })
  }

  // il numero grande cerchiato in rosso
  ctx.save()
  ctx.translate(540, 860)
  ctx.rotate(-0.07)
  ctx.strokeStyle = '#d0262c'
  ctx.lineWidth = 11
  ctx.lineCap = 'round'
  ctx.stroke(new Path2D('M70 70 C 140 18, 360 10, 430 90 S 410 300, 230 312 S 20 280, 30 160 S 120 50, 250 40'))
  ctx.fillStyle = '#d0262c'
  ctx.textAlign = 'center'
  adatta(ctx, ct.grande.valore, 340, 700, 170, MANO)
  ctx.fillText(ct.grande.valore, 235, 205)
  adatta(ctx, ct.grande.cerchio, 300, 400, 50, PENNARELLO)
  ctx.fillText(ct.grande.cerchio, 235, 270)
  ctx.restore()

  // il primo degli altri numeri, in verde
  const [primo, ...resto] = ct.altri
  if (primo) {
    ctx.save()
    ctx.translate(100, 1380)
    ctx.rotate(0.05)
    ctx.fillStyle = '#128a3e'
    // il punto esclamativo solo dopo un tempo (dopo 44° si confonde)
    const scritta = `${primo.valore}${primo.unita || ''}${/d$/.test(primo.valore) && !primo.unita ? '!' : ''}`
    adatta(ctx, scritta, 640, 400, 180, PENNARELLO)
    ctx.fillText(scritta, 0, 0)
    ctx.fillStyle = '#1d2433'
    adatta(ctx, [primo.etichetta.toLowerCase(), primo.dettaglio].filter(Boolean).join(' '), 760, 700, 50, MANO)
    ctx.fillText([primo.etichetta.toLowerCase(), primo.dettaglio].filter(Boolean).join(' '), 0, 70)
    ctx.restore()
  }
  // gli altri, in una riga: parole a mano e numeri in rosso
  if (resto.length) {
    let x = 110
    const y = 1600
    resto.forEach((a, i) => {
      const pezzi = [[`${i ? '· ' : ''}${a.etichetta.toLowerCase()} `, MANO, 700, '#1d2433'], [`${a.valore}${a.unita || ''} `, PENNARELLO, 400, '#d0262c']]
      pezzi.forEach(([t, f, p, c]) => {
        ctx.font = `${p} 56px ${f}`
        ctx.fillStyle = c
        if (x + ctx.measureText(t).width < W - 90) ctx.fillText(t, x, y)
        x += ctx.measureText(t).width
      })
    })
  }
  // la striscia colorata a pennarello
  const tot = ct.striscia.reduce((a, s) => a + s.metri, 0) || 1
  const gap = 10
  const larga = W - 220 - gap * (ct.striscia.length - 1)
  let xs = 110
  ct.striscia.forEach((s) => {
    const w = Math.max(6, (s.metri / tot) * larga)
    ctx.save()
    ctx.transform(1, 0, -0.1, 1, 0, 0)
    ctx.fillStyle = s.colore === '#a9dcff' ? '#2b8fd6' : s.colore
    rett(ctx, xs + 172, 1700, w, 46, [4, 10, 6, 12])
    ctx.fill()
    ctx.restore()
    xs += w + gap
  })
}

// ---------- C. Sott'acqua ----------
function acqua(ctx, ct, logo, sfondo) {
  if (sfondo) {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#0fb5c9'); g.addColorStop(0.38, '#0a6fa3'); g.addColorStop(1, '#06336b')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255,255,255,0.10)'
    ;[[140, 260, 520, 300], [460, 520, 760, 640], [760, 900, 1180, 1000]].forEach(([a, b, c, d]) => {
      ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(b, 0); ctx.lineTo(c, H); ctx.lineTo(d, H); ctx.closePath(); ctx.fill()
    })
    ctx.fillStyle = 'rgba(127,227,239,0.55)'
    ctx.fill(new Path2D('M0 0 H1080 V150 C 960 200, 860 110, 740 150 S 520 210, 400 160 S 160 110, 0 170 Z'))
    ctx.fillStyle = 'rgba(201,246,251,0.6)'
    ctx.fill(new Path2D('M0 0 H1080 V110 C 940 150, 820 70, 700 112 S 470 160, 350 118 S 130 80, 0 128 Z'))
  }
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  if (!sfondo) ombra(ctx, false)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  adatta(ctx, ct.testa, W - 160, 400, 44, TONDO)
  ctx.fillText(ct.testa, 80, 324)
  senzaOmbra(ctx)

  // il numero grande, deformato come visto attraverso l'acqua
  const [n, nc] = tela(W, 720)
  nc.textBaseline = 'alphabetic'
  if (!sfondo) ombra(nc, true)
  nc.fillStyle = '#fff'
  adatta(nc, ct.grande.valore, 940, 900, 470, TONDO)
  nc.fillText(ct.grande.valore, 70, 470)
  nc.fillStyle = sfondo ? '#bff3fa' : '#fff'
  adatta(nc, ct.grande.sotto, 920, 700, 110, TONDO)
  nc.fillText(ct.grande.sotto, 80, 640)
  for (let y = 0; y < 720; y += 4) {
    const dx = Math.sin(y / 38) * 9 + Math.sin(y / 13) * 3
    ctx.drawImage(n, 0, y, W, 4, dx, 330 + y, W, 4)
  }

  // le bolle con gli altri numeri
  const bolla = (x, y, d) => {
    const g = ctx.createRadialGradient(x + d * 0.32, y + d * 0.28, 0, x + d / 2, y + d / 2, d / 2)
    g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.34, 'rgba(255,255,255,0.08)')
    g.addColorStop(0.7, 'rgba(255,255,255,0.04)'); g.addColorStop(1, 'rgba(255,255,255,0.22)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); ctx.fill()
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke()
  }
  ;[[880, 900, 60], [960, 820, 34], [120, 1010, 44], [560, 1580, 70], [660, 1640, 30]].forEach(([x, y, d]) => bolla(x, y, d))
  const POSTI = [[470, 1040, 500, 120, 34], [90, 1100, 340, 96, 28], [230, 1440, 240, 80, 24]]
  ct.altri.slice(0, 3).forEach((a, i) => {
    const [x, y, d, fv, fe] = POSTI[i]
    bolla(x, y, d)
    const cx = x + d / 2
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    if (!sfondo) ombra(ctx, false)
    adatta(ctx, `${a.valore}${a.unita || ''}`, d * 0.8, 900, fv, TONDO)
    ctx.fillText(`${a.valore}${a.unita || ''}`, cx, y + d / 2 + fv * 0.25)
    const et = a.etichetta.toLowerCase()
    adatta(ctx, et, d * 0.78, 700, fe, CORPO)
    ctx.fillText(et, cx, y + d / 2 + fv * 0.25 + fe * 1.5)
    if (a.dettaglio && i === 0) {
      adatta(ctx, a.dettaglio, d * 0.7, 700, fe * 0.85, CORPO)
      ctx.fillText(a.dettaglio, cx, y + d / 2 + fv * 0.25 + fe * 2.7)
    }
    senzaOmbra(ctx)
  })

  // la scia ondulata: un tratto per lavoro
  const tot = ct.striscia.reduce((a, s) => a + s.metri, 0) || 1
  const larga = 920 - 14 * (ct.striscia.length - 1)
  let x = 80
  ctx.lineWidth = 16
  ctx.lineCap = 'round'
  ct.striscia.forEach((s) => {
    const w = Math.max(4, (s.metri / tot) * larga)
    ctx.beginPath()
    for (let k = x; k <= x + w; k += 6) { const yy = 1750 + Math.sin(k / 22) * 14; if (k === x) ctx.moveTo(k, yy); else ctx.lineTo(k, yy) }
    ctx.strokeStyle = s.colore
    ctx.stroke()
    x += w + 14
  })
  if (!sfondo) ombra(ctx, false)
  firma(ctx, logo, 80, 1806, 46, TONDO)
  senzaOmbra(ctx)
}

// ---------- foto e adesivo ----------
function fotoSotto(ctx, foto) {
  const k = Math.max(W / foto.width, H / foto.height)
  ctx.drawImage(foto, (W - foto.width * k) / 2, (H - foto.height * k) / 2, foto.width * k, foto.height * k)
  // velo scuro leggero: i numeri bianchi si leggono anche su una foto chiara
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.5, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// L'adesivo trasparente si ritaglia sul disegno: incollato su Instagram si sposta e si ingrandisce
function ritaglia(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < c.width; x += 2) {
      if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    }
  }
  if (x1 <= x0) return c
  const m = 24
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(c.width, x1 + m); y1 = Math.min(c.height, y1 + m)
  const [r, rc] = tela(x1 - x0, y1 - y0)
  rc.drawImage(c, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0)
  return r
}

// modo: 'sfondo' (con il suo fondo) o 'foto' (sopra la foto; senza foto = adesivo trasparente)
export function disegnaGrafica(ct, { stile = 'vasca', modo = 'sfondo', logo = null, foto = null } = {}) {
  const [c, ctx] = tela()
  const sfondo = modo === 'sfondo'
  if (!sfondo && foto) fotoSotto(ctx, foto)
  if (stile === 'lavagna') {
    if (sfondo) lavagna(ctx, ct, logo)
    else {
      // sulla foto la lavagna diventa un cartello inclinato, come tenuto in mano
      const [b, bc] = tela()
      lavagna(bc, ct, logo)
      ctx.save()
      ctx.translate(W / 2, H * 0.53)
      ctx.rotate(-0.035)
      ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12
      ctx.drawImage(b, -W * 0.39, -H * 0.39, W * 0.78, H * 0.78)
      ctx.restore()
    }
  } else if (stile === 'acqua') acqua(ctx, ct, logo, sfondo)
  else vasca(ctx, ct, logo, sfondo)
  return !sfondo && !foto ? ritaglia(c) : c
}
