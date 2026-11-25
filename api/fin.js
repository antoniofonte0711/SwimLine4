// Gare FIN Lombardia lette dal sito della federazione (i PDF non si possono leggere dal browser: niente CORS).
//   GET /api/fin?azione=comunicati                         -> comunicati della pagina Nuoto (linee guida + programmi)
//   GET /api/fin?azione=programma&linee=URL&programma=URL&citta=Lodi
//        -> { citta, impianto, riscaldamenti, gare: [{ distanza, stile, sesso, categoria, data, ora, iscritti }] }
// Solo per utenti dell'app (token di Supabase) e solo verso i siti della FIN Lombardia.
/* global process */
import { leggiComunicati, leggiLineeGuida, leggiProgramma, unisciOrari } from '../src/lib/fin/leggi.js'
import { pezziDaPdf } from '../src/lib/fin/estrai.js'

const PAGINA = 'https://www.federnuoto.lombardia.it/categoria_sportiva/nuoto/'
const SITI = ['www.finlombardia.net', 'finlombardia.net', 'www.federnuoto.lombardia.it', 'federnuoto.lombardia.it']
const MAX_BYTE = 15 * 1024 * 1024

// Solo https e solo i siti della FIN Lombardia (niente richieste verso altri indirizzi)
export function indirizzoFin(s) {
  try {
    const u = new URL(String(s))
    return u.protocol === 'https:' && SITI.includes(u.hostname) && !u.username && !u.password && !u.port ? u.href : null
  } catch { return null }
}

async function scarica(url, tipo) {
  const r = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'SwimLine (app di squadra)' }, signal: AbortSignal.timeout(20000) })
  if (!r.ok) throw new Error(`La FIN ha risposto ${r.status}`)
  const byte = await r.arrayBuffer()
  if (byte.byteLength > MAX_BYTE) throw new Error('Documento troppo grande')
  return tipo === 'testo' ? new TextDecoder('utf-8').decode(byte) : byte
}

async function utenteValido(req) {
  if (req.locale) return true // server di prova sul PC (vite)
  const url = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  const token = String(req.headers.authorization || '').replace(/^Bearer /, '')
  if (!url || !anon || !token) return false
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } })
  return r.ok
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  if (req.method !== 'GET') return res.status(405).json({ errore: 'Solo lettura' })
  try {
    if (!(await utenteValido(req))) return res.status(401).json({ errore: 'Accedi all\'app per leggere le gare FIN.' })
    const azione = String(req.query.azione || '')
    if (azione === 'comunicati') {
      const comunicati = leggiComunicati(await scarica(PAGINA, 'testo'))
      return res.status(200).json({ comunicati })
    }
    if (azione === 'programma') {
      const linee = indirizzoFin(req.query.linee)
      const programma = indirizzoFin(req.query.programma)
      const citta = String(req.query.citta || '').trim()
      if (!programma || !citta) return res.status(400).json({ errore: 'Mancano il programma o la città.' })
      const [pezziLinee, pezziProgramma] = await Promise.all([
        linee ? scarica(linee).then(pezziDaPdf) : Promise.resolve([]),
        scarica(programma).then(pezziDaPdf),
      ])
      const calendario = leggiLineeGuida(pezziLinee)
      // la città del calendario che corrisponde a quella scelta (maiuscole e minuscole non contano)
      const chiave = Object.keys(calendario).find((c) => c.toLowerCase() === citta.toLowerCase())
      const cal = chiave ? calendario[chiave] : null
      const gare = unisciOrari(leggiProgramma(pezziProgramma), cal)
      if (!gare.length) return res.status(422).json({ errore: 'Non trovo gare in questo programma: forse il formato del PDF è cambiato.' })
      return res.status(200).json({ citta: chiave || citta, impianto: cal?.impianto || null, riscaldamenti: cal?.riscaldamenti || [], gare })
    }
    return res.status(400).json({ errore: 'Azione sconosciuta' })
  } catch (e) {
    return res.status(502).json({ errore: 'Non riesco a leggere il sito FIN: ' + (e.message || 'errore') })
  }
}
