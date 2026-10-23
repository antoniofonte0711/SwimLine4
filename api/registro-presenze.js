// Registro presenze su Google Fogli: il foglio della squadra legge da qui con
//   =IMPORTDATA("https://swim-line4.vercel.app/api/registro-presenze?k=CHIAVE")            (presenze)
//   =IMPORTDATA("https://swim-line4.vercel.app/api/registro-presenze?k=CHIAVE&tipo=atleti") (atleti in app)
// La chiave è della squadra (tabella registro_fogli, migrazione 37): senza chiave giusta la risposta è vuota.
// Google rilegge da solo più o meno ogni ora. Il foglio non scrive mai nell'app.
/* global process */
const csv = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  const chiave = String(req.query.k || '')
  const tipo = req.query.tipo === 'atleti' ? 'atleti' : 'presenze'
  if (!url || !anon) return res.status(500).send('')
  if (!/^[A-Za-z0-9]{32,80}$/.test(chiave)) return res.status(400).send('')
  try {
    const r = await fetch(`${url}/rest/v1/rpc/registro_presenze`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_chiave: chiave, p_tipo: tipo }),
    })
    if (!r.ok) return res.status(502).send('')
    const righe = await r.json()
    const corpo = righe.map((x) => (tipo === 'atleti' ? [x.a, x.b, x.c, x.d] : [x.a, x.b]).map(csv).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(corpo || (tipo === 'atleti' ? ',,,' : ',')) // IMPORTDATA vuole almeno una riga
  } catch {
    return res.status(502).send('')
  }
}
