// "Aggiungi al calendario" su iPhone: Safari non apre i file .ics creati dalla pagina (data:/blob:), apre quelli
// che arrivano da un indirizzo vero. Questo indirizzo costruisce il file con i dati della gara passati nell'indirizzo.
//   GET /api/calendario?id=&nome=&data=2026-11-29&orario=11:45&luogo=&note=&dettagli=
// Non usa il database né dati riservati: scrive solo quello che riceve (nome, data, ora, luogo) in un file .ics.
import { creaIcs } from '../src/lib/ics.js'

// niente caratteri di controllo (a capo compresi): non si possono inserire righe nel file
const corto = (v, max) => [...String(Array.isArray(v) ? v[0] : v ?? '')].map((c) => (c.charCodeAt(0) < 32 ? ' ' : c)).join('').slice(0, max)

export default function handler(req, res) {
  if (req.method !== 'GET') { res.statusCode = 405; return res.end() }
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams)
  const data = corto(q.data, 10)
  const orario = corto(q.orario, 5)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(new Date(data + 'T12:00:00').getTime())) {
    res.statusCode = 400
    return res.end('Data non valida')
  }
  const testo = creaIcs({
    id: corto(q.id, 60).replace(/[^\w-]/g, '') || data,
    nome: corto(q.nome, 150) || 'Gara', data,
    orario: /^\d{2}:\d{2}$/.test(orario) ? orario : null,
    luogo: corto(q.luogo, 200) || null, note: corto(q.note, 300) || null, dettagli: corto(q.dettagli, 400) || null,
  })
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', `inline; filename="gara-${data}.ics"`)
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.statusCode = 200
  res.end(testo)
}
