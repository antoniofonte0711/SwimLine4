// Edge Function "accedi-come": solo un admin può chiedere un link di accesso per un altro account.
// La chiave service_role resta sul server di Supabase e non arriva mai al browser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const risposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1) Chi sta chiamando?
  const utente = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await utente.auth.getUser()
  if (!user) return risposta({ errore: 'Non autenticato' }, 401)

  // 2) È davvero admin? (si controlla sul database, non su ciò che dice il browser)
  const admin = createClient(url, service)
  const { data: io } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (io?.role !== 'admin') return risposta({ errore: 'Solo gli admin possono farlo' }, 403)

  const { target_id, redirect_to } = await req.json().catch(() => ({}))
  if (!target_id) return risposta({ errore: 'Manca l\'account' }, 400)
  if (target_id === user.id) return risposta({ errore: 'Sei già dentro con questo account' }, 400)

  // 3) Link di accesso monouso per l'account scelto
  const { data: t, error: e1 } = await admin.auth.admin.getUserById(target_id)
  if (e1 || !t?.user?.email) return risposta({ errore: 'Account non trovato' }, 404)
  const { data: link, error: e2 } = await admin.auth.admin.generateLink({
    type: 'magiclink', email: t.user.email, options: { redirectTo: redirect_to },
  })
  if (e2) return risposta({ errore: e2.message }, 500)

  // 4) Resta traccia di ogni accesso
  await admin.from('accessi_admin').insert({ admin_id: user.id, target_id })

  return risposta({ link: link.properties.action_link, email: t.user.email })
})
