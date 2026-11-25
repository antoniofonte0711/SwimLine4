// Lettura dei documenti della FIN Lombardia (federnuoto.lombardia.it): niente database, niente rete.
// - comunicati: la pagina Nuoto con i comunicati (linee guida + programmi per città)
// - linee guida: per ogni città il calendario con data e ora di ogni gara
// - programma: per ogni gara gli iscritti (nome, anno, società, tempo di iscrizione)
// I PDF arrivano come pezzi di testo con la posizione ({ str, x, y, pagina }), letti da estrai.js.

export const STILI_FIN = { SL: 'Stile libero', DO: 'Dorso', RA: 'Rana', FA: 'Farfalla', MI: 'Misti' }
const STILE_DA_TESTO = { 'stile libero': 'Stile libero', dorso: 'Dorso', rana: 'Rana', farfalla: 'Farfalla', misti: 'Misti' }

// Testo pulito: entità HTML, spazi, lettere accentate rovinate dal PDF ("SocietÃ" -> "Società")
export const pulisci = (s = '') => String(s)
  .replace(/&amp;/g, '&').replace(/&#039;|&#8217;|&rsquo;/g, "'").replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
  .replace(/Ã /g, 'à ').replace(/Ã$/g, 'à').replace(/Ã¨/g, 'è').replace(/Ã©/g, 'é').replace(/Ã¬/g, 'ì').replace(/Ã²/g, 'ò').replace(/Ã¹/g, 'ù').replace(/Ã(?=\s|$)/g, 'à')
  .replace(/\s+/g, ' ').trim()

// ---------- Comunicati (HTML della pagina Nuoto) ----------
// [{ data: 'YYYY-MM-DD', titolo, documento: { nome, url } | null, sezioni: { Programmi: [{ nome, url }], Risultati: [...] } }]
export function leggiComunicati(html = '') {
  const blocchi = String(html).split(/<div class="row datagara">/).slice(1)
  return blocchi.map((b) => {
    const cat = b.match(/<span class="categoria">([^<]*)<\/span>/)?.[1] || ''
    const [, g, m, a] = cat.match(/(\d{2})\/(\d{2})\/(\d{4})/) || []
    const titolo = pulisci(b.match(/<div class="competizione">([^<]*)<\/div>/)?.[1] || '')
    const corpo = b.match(/<span class="corpo">([\s\S]*?)<\/span>/)?.[1] || ''
    const sezioni = {}
    let documento = null
    let sezione = null
    // i paragrafi in ordine: "Programmi:" o "Risultati:" aprono una sezione, i link dopo ne fanno parte
    for (const p of corpo.split(/<\/p>|<br\s*\/?>/)) {
      const testo = pulisci(p.replace(/<[^>]+>/g, ''))
      const link = p.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
      if (link) {
        const voce = { nome: pulisci(link[2].replace(/<[^>]+>/g, '')), url: link[1] }
        if (sezione) sezioni[sezione].push(voce)
        else if (!documento) documento = voce
      } else if (/^[A-Za-zÀ-ú]+( [A-Za-zÀ-ú]+)?:$/.test(testo)) { // "Programmi:", "Risultati:" (non le frasi)
        sezione = testo.slice(0, -1)
        sezioni[sezione] = sezioni[sezione] || []
      }
    }
    return { data: a ? `${a}-${m}-${g}` : null, titolo, documento, sezioni }
  }).filter((c) => c.titolo)
}

// ---------- Pezzi di testo del PDF -> righe ----------
// Pezzi con la stessa pagina e quasi la stessa altezza fanno una riga; le righe vanno dall'alto in basso.
export function righeDaPezzi(pezzi = [], tolleranza = 2.5) {
  const ordinati = pezzi.filter((p) => String(p.str).trim())
    .sort((a, b) => a.pagina - b.pagina || b.y - a.y || a.x - b.x)
  const righe = []
  for (const p of ordinati) {
    const r = righe[righe.length - 1]
    if (r && r.pagina === p.pagina && Math.abs(r.y - p.y) <= tolleranza) r.pezzi.push(p)
    else righe.push({ pagina: p.pagina, y: p.y, pezzi: [p] })
  }
  righe.forEach((r) => r.pezzi.sort((a, b) => a.x - b.x))
  return righe
}
const testoRiga = (r) => pulisci(r.pezzi.map((p) => p.str).join(' '))

// ---------- Linee guida: calendario per città ----------
// { 'Lodi': { impianto: 'Faustina (10 corsie)', gare: [{ data, ora, distanza, stile, sesso, categoria }], riscaldamenti: [{ data, ora }] } }
const RIGA_CAL = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}:\d{2}) (?:(SL|DO|RA|FA|MI)(\d{2,4}) ([MF]) (\S+(?: [AB])?)|(Risc\.))/
export function leggiLineeGuida(pezzi = []) {
  const citta = {}
  let attuale = null
  for (const r of righeDaPezzi(pezzi)) {
    const t = testoRiga(r)
    const intestazione = t.match(/^([A-Za-zÀ-ú' ]+?) [–-] (.+)$/)
    if (intestazione && !/^\d/.test(t) && !/Federazione|Comitato|Via |Linee Guida/i.test(t)) {
      attuale = intestazione[1].trim()
      citta[attuale] = { impianto: intestazione[2].trim(), gare: [], riscaldamenti: [] }
      continue
    }
    const m = t.match(RIGA_CAL)
    if (!m || !attuale) continue
    const data = `${m[3]}-${m[2]}-${m[1]}`
    const ora = m[4].padStart(5, '0')
    if (m[9]) citta[attuale].riscaldamenti.push({ data, ora })
    else citta[attuale].gare.push({ data, ora, stile: STILI_FIN[m[5]], distanza: Number(m[6]), sesso: m[7], categoria: m[8] })
  }
  return citta
}

// ---------- Programma: iscritti di ogni gara ----------
// [{ distanza, stile, sesso: 'M'|'F', categoria, iscritti: [{ pos, nome, anno, societa, tempo }] }]
const TITOLO_GARA = /(\d{2,4})\s?m\s+(Stile Libero|Dorso|Rana|Farfalla|Misti)\s+(Maschi|Femmine)\s+(.+)$/i
const TEMPO = /^(\d{1,2}\.)?\d{2}\.\d{2}$/
export function leggiProgramma(pezzi = []) {
  const gare = []
  let gara = null
  for (const r of righeDaPezzi(pezzi)) {
    const t = testoRiga(r)
    if (/^Pag\. \d+$/.test(t)) continue
    const titolo = t.match(TITOLO_GARA)
    if (titolo) {
      gara = {
        distanza: Number(titolo[1]), stile: STILE_DA_TESTO[titolo[2].toLowerCase()],
        sesso: /^m/i.test(titolo[3]) ? 'M' : 'F', categoria: titolo[4].trim(), iscritti: [],
      }
      gare.push(gara)
      continue
    }
    if (!gara) continue
    // il numero può arrivare attaccato al nome ("101. ROSSI MARIO"): lo si stacca
    const [primo, ...altri] = r.pezzi
    const m = primo.str.trim().match(/^(\d+\.)\s*(.*)$/)
    if (!m) continue
    const pezzi = m[2] ? [{ ...primo, str: m[1] }, { ...primo, str: m[2], x: primo.x + 20 }, ...altri] : r.pezzi
    const iscritto = leggiIscritto(pezzi)
    if (iscritto) gara.iscritti.push(iscritto)
  }
  return gare
}

// Una riga di iscritto: "52. FONTE ANTONIO 2006 Aicsport ... 30.88". Le colonne si riconoscono dalla posizione:
// l'anno divide nome e società, il tempo sta a destra. Quando il nome della società è lungo, le sue ultime lettere
// e le cifre del tempo arrivano mescolate (stessa x): le cifre e i punti a destra sono il tempo, le lettere la società.
function leggiIscritto(pezzi) {
  const pos = Number(pezzi[0].str.replace('.', ''))
  const iAnno = pezzi.findIndex((p, k) => k > 0 && /^(19|20)\d{2}$/.test(p.str.trim()))
  if (iAnno < 2) return null
  const nome = pulisci(pezzi.slice(1, iAnno).map((p) => p.str).join(' '))
  const anno = Number(pezzi[iAnno].str)
  const resto = pezzi.slice(iAnno + 1)
  // colonna del tempo: dove inizia l'ultimo pezzo che sembra un tempo intero, oppure (righe mescolate) la x
  // del primo carattere singolo che è una cifra nella zona destra
  const intero = [...resto].reverse().find((p) => TEMPO.test(p.str.trim()) || p.str.trim() === '---')
  let societa, tempo
  if (intero) {
    societa = resto.filter((p) => p !== intero).map((p) => p.str).join(' ')
    tempo = intero.str.trim() === '---' ? null : intero.str.trim()
  } else {
    // zona del tempo: gli ultimi 30 punti a destra; lì ogni pezzo si spezza in caratteri
    const xMax = Math.max(...resto.map((p) => p.x))
    const zona = (p) => p.x >= xMax - 30
    const lettere = resto.filter((p) => !zona(p)).map((p) => p.str)
    let coda = ''
    tempo = ''
    resto.filter(zona).forEach((p) => [...p.str].forEach((c) => { if (/[\d.]/.test(c)) tempo += c; else coda += c }))
    if (!TEMPO.test(tempo)) tempo = null
    societa = lettere.join(' ') + coda
  }
  return { pos, nome, anno, societa: pulisci(societa), tempo: tempo ? tempoFin(tempo) : null }
}
// "1.00.58" -> "1'00\"58", "30.88" -> "30\"88" (come scrive i tempi l'app)
export function tempoFin(t) {
  const p = String(t).split('.')
  if (p.length === 3) return `${Number(p[0])}'${p[1]}"${p[2]}`
  if (p.length === 2) return `${p[0]}"${p[1]}`
  return t
}

// ---------- Programma + calendario della città ----------
// Ogni gara del programma prende data e ora dal calendario (stessa distanza, stile, sesso e categoria)
export function unisciOrari(gare = [], calendario = null) {
  const lista = calendario?.gare || []
  const usate = new Set()
  return gare.map((g) => {
    const k = lista.findIndex((c, i) => !usate.has(i) && c.distanza === g.distanza && c.stile === g.stile && c.sesso === g.sesso
      && normale(c.categoria) === normale(g.categoria))
    const c = k >= 0 ? lista[k] : lista.find((x) => x.distanza === g.distanza && x.stile === g.stile && x.sesso === g.sesso)
    if (k >= 0) usate.add(k)
    return { ...g, data: c?.data || null, ora: c?.ora || null }
  })
}
const normale = (s = '') => s.toLowerCase().replace(/[^a-z]/g, '')
