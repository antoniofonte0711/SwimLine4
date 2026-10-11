// Sveglia di Supabase: il piano gratuito mette in pausa il database dopo una settimana senza attività
// (vacanze di Natale, agosto…). Vercel chiama questa pagina ogni mattina (vedi "crons" in vercel.json)
// e lei fa una lettura minima: l'elenco delle squadre, che è pubblico. Non scrive niente.
/* global process */
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const chiave = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !chiave) return res.status(500).json({ ok: false, errore: 'Mancano le variabili di Supabase su Vercel' })
  try {
    const r = await fetch(`${url}/rest/v1/squadre?select=id&limit=1`, { headers: { apikey: chiave, Authorization: `Bearer ${chiave}` } })
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, stato: r.status, il: new Date().toISOString() })
  } catch (e) {
    return res.status(502).json({ ok: false, errore: String(e) })
  }
}
