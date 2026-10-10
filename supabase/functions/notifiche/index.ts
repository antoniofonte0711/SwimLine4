// Edge Function "notifiche": notifiche push ai telefoni della squadra.
// GET  -> { publicKey } chiave pubblica con cui i telefoni si iscrivono (creata al primo uso)
// POST { squadra_id, date: ['2026-10-12', ...] } -> avvisa la squadra che il coach ha pubblicato l'allenamento
// POST { interno, notifica_id } -> dal database: manda come push una notifica della campanella
// Le chiavi stanno nella tabella "segreti", leggibile solo con la service_role (mai dal browser).
// Pubblicata con verify_jwt = false: il database la chiama senza utente; ogni strada controlla da sé chi chiama.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const risposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const url = Deno.env.get('SUPABASE_URL')!
const anon = Deno.env.get('SUPABASE_ANON_KEY')!
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

async function chiavi() {
  const { data } = await admin.from('segreti').select('chiave, valore').in('chiave', ['vapid_pubblica', 'vapid_privata'])
  const m = Object.fromEntries((data || []).map((r) => [r.chiave, r.valore]))
  if (m.vapid_pubblica && m.vapid_privata) return { pubblica: m.vapid_pubblica, privata: m.vapid_privata }
  const nuove = webpush.generateVAPIDKeys()
  await admin.from('segreti').upsert([
    { chiave: 'vapid_pubblica', valore: nuove.publicKey },
    { chiave: 'vapid_privata', valore: nuove.privateKey },
  ])
  return { pubblica: nuove.publicKey, privata: nuove.privateKey }
}

const giornoTesto = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const k = await chiavi()
  if (req.method === 'GET') return risposta({ publicKey: k.pubblica })
  const corpo = await req.json().catch(() => ({}))

  // Dal database (notifica nuova nella campanella): la manda anche come push ai telefoni del destinatario
  if (corpo.interno) {
    const { data: s } = await admin.from('segreti').select('valore').eq('chiave', 'chiave_interna').maybeSingle()
    if (!s?.valore || s.valore !== corpo.interno) return risposta({ errore: 'Non autorizzato' }, 403)
    const { data: n } = await admin.from('notifiche').select('destinatario_id, titolo, testo, link').eq('id', corpo.notifica_id).maybeSingle()
    if (!n) return risposta({ inviate: 0 })
    const { data: iscr } = await admin.from('push_iscrizioni').select('id, endpoint, p256dh, auth').eq('utente_id', n.destinatario_id)
    return risposta({ inviate: await invia(k, iscr || [], { title: n.titolo, body: n.testo || '', url: n.link || '/dashboard' }) })
  }

  // Chi sta chiamando? Deve essere il coach della squadra (o un admin)
  const utente = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await utente.auth.getUser()
  if (!user) return risposta({ errore: 'Non autenticato' }, 401)

  const { squadra_id, date } = corpo
  if (!squadra_id || !Array.isArray(date) || !date.length) return risposta({ errore: 'Mancano squadra o giorni' }, 400)

  const [{ data: squadra }, { data: io }] = await Promise.all([
    admin.from('squadre').select('coach_id, nome').eq('id', squadra_id).maybeSingle(),
    admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ])
  if (!squadra || (squadra.coach_id !== user.id && io?.role !== 'admin')) return risposta({ errore: 'Solo il coach della squadra' }, 403)

  // Solo allenamenti davvero pubblicati alla squadra
  const { data: piani } = await admin.from('allenamenti_squadra').select('data')
    .eq('squadra_id', squadra_id).eq('pubblicato', true).eq('visibilita', 'squadra').in('data', date)
  const giorni = (piani || []).map((p) => p.data).sort()
  if (!giorni.length) return risposta({ inviate: 0 })

  const { data: persone } = await admin.from('profiles').select('id').eq('squadra_id', squadra_id).neq('id', user.id)
  const ids = (persone || []).map((p) => p.id)
  if (!ids.length) return risposta({ inviate: 0 })
  const { data: iscrizioni } = await admin.from('push_iscrizioni').select('id, endpoint, p256dh, auth').in('utente_id', ids)

  const inviate = await invia(k, iscrizioni || [], {
    title: 'Nuovo allenamento',
    body: giorni.length === 1
      ? `Il coach ha pubblicato l'allenamento di ${giornoTesto(giorni[0])}.`
      : `Il coach ha pubblicato ${giorni.length} allenamenti, dal ${giornoTesto(giorni[0])}.`,
    url: `/dashboard?giorno=${giorni[0]}`,
  })
  return risposta({ inviate })
})

type Iscrizione = { id: string, endpoint: string, p256dh: string, auth: string }
async function invia(k: { pubblica: string, privata: string }, iscrizioni: Iscrizione[], dati: Record<string, string>) {
  webpush.setVapidDetails('https://swim-line4.vercel.app', k.pubblica, k.privata)
  const messaggio = JSON.stringify(dati)
  let inviate = 0
  const scadute: string[] = []
  await Promise.all(iscrizioni.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, messaggio)
      inviate += 1
    } catch (e) {
      // 404/410: il telefono ha tolto il permesso o l'app è stata disinstallata
      const codice = (e as { statusCode?: number }).statusCode
      if (codice === 404 || codice === 410) scadute.push(s.id)
    }
  }))
  if (scadute.length) await admin.from('push_iscrizioni').delete().in('id', scadute)
  return inviate
}
