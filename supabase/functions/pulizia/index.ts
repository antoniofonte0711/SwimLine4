// Edge Function "pulizia": cancella per sempre gli account chiusi dai loro proprietari ("Elimina il mio account").
// Per 30 giorni l'account resta nascosto e bloccato, e l'admin può ripristinarlo; poi si cancella tutto:
// documenti e video nello spazio file (dal database non si può) e l'account con tutti i suoi dati.
// POST { interno }   -> dal database ogni notte (pg_cron, chiama_pulizia): gli account chiusi da più di 30 giorni
// POST { persona }   -> dall'admin nel Pannello, con il suo accesso: quell'account subito
// Pubblicata con verify_jwt = false: il database la chiama senza utente; ogni strada controlla da sé chi chiama.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const risposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const url = Deno.env.get('SUPABASE_URL')!
const anon = Deno.env.get('SUPABASE_ANON_KEY')!
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SPAZI = ['documenti-atleti', 'video-allenamenti']

async function cancella(id: string) {
  // prima i file (cartella con l'id della persona), poi l'account: i dati nel database si cancellano a cascata
  for (const spazio of SPAZI) {
    const { data: file } = await admin.storage.from(spazio).list(id, { limit: 1000 })
    if (file?.length) await admin.storage.from(spazio).remove(file.map((f) => `${id}/${f.name}`))
  }
  const { error } = await admin.auth.admin.deleteUser(id)
  return !error
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const corpo = await req.json().catch(() => ({}))

  if (corpo.interno) {
    const { data: s } = await admin.from('segreti').select('valore').eq('chiave', 'chiave_interna').maybeSingle()
    if (!s?.valore || s.valore !== corpo.interno) return risposta({ errore: 'Non autorizzato' }, 403)
    const limite = new Date(Date.now() - 30 * 86400000).toISOString()
    const { data: scaduti } = await admin.from('profiles').select('id').not('eliminato_il', 'is', null).lt('eliminato_il', limite)
    let cancellati = 0
    for (const p of scaduti || []) if (await cancella(p.id)) cancellati += 1
    return risposta({ cancellati })
  }

  // Dall'admin: deve essere davvero admin (si controlla sul database) e l'account deve essere già chiuso
  const utente = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await utente.auth.getUser()
  if (!user) return risposta({ errore: 'Non autenticato' }, 401)
  const { data: io } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (io?.role !== 'admin') return risposta({ errore: 'Solo l\'amministratore' }, 403)
  if (!corpo.persona) return risposta({ errore: 'Manca l\'account' }, 400)
  const { data: p } = await admin.from('profiles').select('id, eliminato_il').eq('id', corpo.persona).maybeSingle()
  if (!p?.eliminato_il) return risposta({ errore: 'Si cancellano per sempre solo gli account già eliminati' }, 400)
  return (await cancella(p.id)) ? risposta({ cancellati: 1 }) : risposta({ errore: 'Non sono riuscito a cancellarlo' }, 500)
})
