// Registro presenze su Google Fogli: il foglio della squadra legge da qui con
//   =IMPORTDATA("https://swim-line4.vercel.app/api/registro-presenze?k=CHIAVE")            (presenze)
//   =IMPORTDATA("https://swim-line4.vercel.app/api/registro-presenze?k=CHIAVE&tipo=atleti") (atleti in app)
// La chiave è della squadra (tabella registro_fogli, migrazione 37): senza chiave giusta la risposta è vuota.
// Google rilegge da solo più o meno ogni ora. Il foglio non scrive mai nell'app.
//   =IMPORTDATA("https://swim-line4.vercel.app/api/registro-presenze?k=CHIAVE&tipo=allenamenti") (registro allenamenti)
/* global process */
const csv = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

// Un lavoro in una casella: "4×200 Misti · Passo gara 200 · ↻ 3'00" · nota"
// (nelle serie a giri "ripetizioni" è il totale di tutti i giri: si mostra quanto per giro)
function lavoro(r) {
  const giri = r.serie ? Math.max(1, Number(r.serie.giri) || 1) : 1
  const n = Math.max(1, Math.round((Number(r.ripetizioni) || 1) / giri))
  const stili = Array.isArray(r.stili) && r.stili.some(Boolean)
    ? ` (${Array.from({ length: n }, (_, j) => r.stili[j] || r.stile).join(', ')})` : ''
  return [
    `${n > 1 ? `${n}×` : ''}${r.distanza} ${r.stile}${stili}`,
    r.tipo_lavoro,
    r.serie && `serie ${giri} giri`,
    r.tratti?.scelte?.some((s) => s?.length) && 'vasche cronometrate',
    r.ripartenza && `↻ ${r.ripartenza}`,
    r.note,
  ].filter(Boolean).join(' · ')
}

function csvAllenamenti(lista) {
  const max = Math.max(1, ...lista.map((a) => (a.righe || []).length))
  const testa = ['Giorno', 'Titolo', 'Metri', ...Array.from({ length: max }, (_, i) => `Lavoro ${i + 1}`)]
  const righe = lista.map((a) => {
    const [y, m, d] = a.data.split('-')
    const giorno = `${GG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}/${m}/${y}`
    const metri = (a.righe || []).reduce((s, r) => s + (Number(r.distanza) || 0) * (Number(r.ripetizioni) || 1), 0)
    return [giorno, a.titolo || '', metri, ...(a.righe || []).map(lavoro)]
  })
  return [testa, ...righe].map((r) => r.map(csv).join(',')).join('\n')
}

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  const chiave = String(req.query.k || '')
  const tipo = ['atleti', 'allenamenti'].includes(req.query.tipo) ? req.query.tipo : 'presenze'
  if (!url || !anon) return res.status(500).send('')
  if (!/^[A-Za-z0-9]{32,80}$/.test(chiave)) return res.status(400).send('')
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${tipo === 'allenamenti' ? 'registro_allenamenti' : 'registro_presenze'}`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(tipo === 'allenamenti' ? { p_chiave: chiave } : { p_chiave: chiave, p_tipo: tipo }),
    })
    if (!r.ok) return res.status(502).send('')
    const righe = await r.json()
    const corpo = tipo === 'allenamenti' ? csvAllenamenti(righe)
      : righe.map((x) => (tipo === 'atleti' ? [x.a, x.b, x.c, x.d] : [x.a, x.b]).map(csv).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(corpo || (tipo === 'atleti' ? ',,,' : ',')) // IMPORTDATA vuole almeno una riga
  } catch {
    return res.status(502).send('')
  }
}
