// Tempi ufficiali dal sito dei cronometristi (nuoto.ficr.it): cerca i nostri atleti nelle manifestazioni
// dei giorni delle loro gare e restituisce tempo, passaggi ogni 50 m, posto in batteria e posto in classifica.
// Non scrive niente: lo fa index.ts. Qui solo lettura e abbinamento (provati da src/lib/risultatiFicr.test.js).
// Un atleta si riconosce da cognome, nome (anche solo l'iniziale) e anno di nascita. MAI dalla società.

const BASE = 'https://apinuoto.ficr.it/NUO/'
const MAX_MANIFESTAZIONI = 40

// "NiccolÃ²" -> "Niccolò": il sito a volte manda gli accenti rovinati
export function ripara(s) {
  const t = String(s ?? '')
  if (!/Ã/.test(t)) return t
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(t, (c) => c.charCodeAt(0) & 255))
  } catch { return t }
}

const senzaAccenti = (s) => ripara(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const solo = (s) => senzaAccenti(s).replace(/[^a-z]/g, '')
const parole = (s) => senzaAccenti(s).split(/[^a-z]+/).filter(Boolean)

// Cognome uguale; nome uguale, oppure uno dei due è l'iniziale o solo il primo nome
export function stessoNome(atleta, voce) {
  if (!solo(atleta.cognome) || solo(atleta.cognome) !== solo(voce.Cognome)) return false
  const a = parole(atleta.nome)
  const b = parole(voce.Nome)
  if (!a.length || !b.length) return false
  if (a.join('') === b.join('')) return true
  if (a[0].length === 1 || b[0].length === 1) return a[0][0] === b[0][0]
  return (a.length === 1 || b.length === 1) && a[0] === b[0]
}

// "1'05.99" -> 1'05"99 (il formato dell'app); null se non è un tempo
export function tempoApp(t) {
  const x = String(t ?? '').trim().match(/^(?:(\d{1,2})')?(\d{1,2})[."](\d{2})$/)
  if (!x) return null
  const [, m, s, c] = x
  return m ? `${Number(m)}'${s.padStart(2, '0')}"${c}` : `${Number(s)}"${c}`
}

export function centesimi(t) {
  const x = String(t ?? '').trim().match(/^(?:(\d{1,2})')?(\d{1,2})(?:[."](\d{1,2}))?"?$/)
  if (!x) return null
  return Number(x[1] || 0) * 6000 + Number(x[2]) * 100 + Number((x[3] || '0').padEnd(2, '0'))
}

const STILI = { 'stile libero': 'Stile libero', dorso: 'Dorso', rana: 'Rana', farfalla: 'Farfalla', misti: 'Misti' }
export function leggiGara(descr) {
  const x = String(descr ?? '').trim().match(/^(\d{2,4})\s*m?\s+(.+)$/i)
  const stile = x && STILI[x[2].trim().toLowerCase()]
  return stile ? { distanza: Number(x[1]), stile } : null
}

const isoDa = (g, m, a) => `${a}-${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}`
export const dataIso = (s) => {
  const x = String(s ?? '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return x ? isoDa(x[1], x[2], x[3]) : null
}
const piuGiorni = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)

// Primo e ultimo giorno di una manifestazione dell'archivio
export function giorniDi(m) {
  const date = [...String(m.Place ?? '').matchAll(/\d{1,2}\/\d{1,2}\/\d{4}/g)].map((x) => dataIso(x[0]))
  const inizio = date[0] || String(m.ma_DataRiferimento ?? '').slice(0, 10)
  return [inizio, date[1] || piuGiorni(inizio, date.length ? 0 : 3)]
}

// Le manifestazioni in cui può esserci una gara: giorno giusto e, se si riconosce, la città
export function candidate(archivio, gara) {
  const delGiorno = archivio.filter((m) => {
    const [da, a] = giorniDi(m)
    return da <= gara.data_gara && gara.data_gara <= a
  })
  const citta = solo(String(gara.luogo ?? '').split(/[·,(-]/)[0])
  const inCitta = citta.length > 2 ? delGiorno.filter((m) => solo(String(m.Place ?? '').split(/[(,]/)[0]) === citta) : []
  return (inCitta.length ? inCitta : delGiorno).slice(0, MAX_MANIFESTAZIONI)
}

const classificati = (lista) => lista.filter((r) => r.EsisteTempo && !r.Causa)

// Posto nella classifica in cui gareggia: la categoria d'età se la manifestazione le ha, altrimenti quella unica
async function classifica(leggi, chiave, riga, numero) {
  const percorso = `${chiave}/${riga.Categoria}/${riga.TipoGara}`
  const sotto = (await leggi(`mpcache-30/get/sottocategorie/${percorso}`)) || []
  for (const s of sotto) {
    const lista = (await leggi(`mpcache-10/get/result/${chiave}/${riga.Categoria}/${riga.TipoGara}/*/*/${s.ct_Categoria}`))?.results || []
    const io = lista.find((r) => r.Numero === numero)
    if (!io) continue
    const validi = classificati(lista).filter((r) => r.Sex === io.Sex)
    const i = validi.findIndex((r) => r.Numero === numero)
    return i < 0 ? null : { categoria: ripara(s.ct_Descrizione).trim(), posizione: i + 1, classificati: validi.length }
  }
  // categorie d'età previste ma l'atleta non è in nessuna: meglio niente che la classifica sbagliata
  if (sotto.length) return null
  const validi = classificati((await leggi(`mpcache-10/get/result/${percorso}/*/*/*`))?.results || [])
  const i = validi.findIndex((r) => r.Numero === numero)
  return i < 0 ? null : { categoria: ripara(riga.DescrCat).trim(), posizione: i + 1, classificati: validi.length }
}

// Cosa scrivere su una gara dell'app, partendo dalle righe dell'atleta in una manifestazione
async function risultatoDi(leggi, chiave, gara, voce, programma) {
  const righe = (voce.tempi || []).filter((r) => {
    const g = leggiGara(r.DescrGara)
    if (r.Staffetta || !g || g.distanza !== Number(gara.distanza) || g.stile !== gara.stile) return false
    const turno = programma.find((p) => p.Categoria === r.Categoria && p.TipoGara === r.TipoGara && p.Turno === r.TipoTurno)
    // solo il giorno giusto e solo risultati ufficializzati dai giudici
    return turno && dataIso(turno.Data) === gara.data_gara && /^ufficializzato$/i.test(String(turno.Uff).trim())
  })
  if (!righe.length) return null
  if (new Set(righe.map((r) => `${r.Categoria}|${r.TipoTurno}|${r.Batteria}`)).size > 1) return { dubbio: 'due turni nello stesso giorno' }
  const distanza = Number(gara.distanza)
  const fine = righe.find((r) => r.Metri === distanza)
  const tempo = fine && tempoApp(fine.Tempo)
  if (!tempo) return null
  const posto = await classifica(leggi, chiave, fine, voce.numero)
  if (!posto) return null // squalificato, non partito o non in classifica: non si scrive niente
  const passaggi = []
  for (let m = 50; m < distanza; m += 50) {
    const p = tempoApp(righe.find((r) => r.Metri === m)?.Tempo)
    if (!p || centesimi(p) <= (centesimi(passaggi.at(-1)) ?? 0) || centesimi(p) >= centesimi(tempo)) return { tempo, passaggi: [], piazzamento: piazza(fine, posto) }
    passaggi.push(p)
  }
  return { tempo, passaggi, piazzamento: piazza(fine, posto) }
}

const piazza = (riga, posto) => ({
  batteria: riga.Batteria || null,
  posto_batteria: riga.Pos > 0 ? riga.Pos : null,
  ...posto,
})

export function lettore(scarica = fetch) {
  const memoria = new Map()
  return (percorso) => {
    if (!memoria.has(percorso)) {
      memoria.set(percorso, (async () => {
        const r = await scarica(BASE + percorso, { headers: { 'User-Agent': 'SwimLine (app di squadra)' }, signal: AbortSignal.timeout(20000) })
        if (!r.ok) throw new Error(`Il sito dei risultati ha risposto ${r.status}`)
        return (await r.json()).data
      })())
    }
    return memoria.get(percorso)
  }
}

// gare: [{ id, data_gara, distanza, stile, luogo, tempo, passaggi, atleta: { nome, cognome, data_nascita } }]
// Torna { scrivere: [{ id, tempoPrima, cambi }], saltate: [{ id, motivo }] }. Non sovrascrive mai un tempo diverso.
export async function cercaRisultati(gare, leggi = lettore()) {
  const scrivere = []
  const saltate = []
  const errori = []
  const prova = async (f) => { try { return await f() } catch (e) { errori.push(e.message); return null } }

  for (const gara of gare) {
    const anno = Number(gara.atleta?.data_nascita?.slice(0, 4))
    if (!anno) { saltate.push({ id: gara.id, motivo: 'manca la data di nascita' }); continue }
    const archivio = await prova(() => leggi(`mpcache-30/get/schedule/${gara.data_gara.slice(0, 4)}/*/*`))
    const trovati = []
    for (const m of candidate(archivio || [], gara)) {
      const chiave = `${m.Year}/${m.TeamCode}/${m.ID}`
      await prova(async () => {
        const iscritti = (await leggi(`mpcache-30/get/allathletes/${chiave}`))?.entrylist || []
        const numeri = [...new Set(iscritti.filter((v) => stessoNome(gara.atleta, v)).map((v) => v.Numero))]
        for (const numero of numeri) {
          const scheda = await leggi(`mpcache-30/get/atleta/${chiave}/${numero}`)
          if (!scheda?.atleta || scheda.atleta.Anno !== anno || !stessoNome(gara.atleta, scheda.atleta)) continue
          const programma = (await leggi(`mpcache-30/get/program/${chiave}`)) || []
          const r = await risultatoDi(leggi, chiave, gara, { ...scheda, numero }, programma)
          if (r) trovati.push(r)
        }
      })
    }
    if (!trovati.length) { saltate.push({ id: gara.id, motivo: 'nessun risultato ufficiale' }); continue }
    if (trovati.length > 1 || trovati[0].dubbio) {
      saltate.push({ id: gara.id, motivo: trovati[0].dubbio || 'più atleti o manifestazioni corrispondono' })
      continue
    }
    const { tempo, passaggi, piazzamento } = trovati[0]
    if (gara.tempo && centesimi(gara.tempo) !== centesimi(tempo)) {
      saltate.push({ id: gara.id, motivo: `nell'app c'è ${gara.tempo}, sul sito ${tempo}` })
      continue
    }
    const cambi = { piazzamento, da_confermare: false }
    if (!gara.tempo) cambi.tempo = tempo
    if (!gara.passaggi?.length && passaggi.length) cambi.passaggi = passaggi
    scrivere.push({ id: gara.id, tempoPrima: gara.tempo || null, cambi })
  }
  return { scrivere, saltate, errori: [...new Set(errori)] }
}
