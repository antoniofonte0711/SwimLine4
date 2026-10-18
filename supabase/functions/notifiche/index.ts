// Edge Function "notifiche": notifiche push ai telefoni della squadra.
// GET  -> { publicKey } chiave pubblica con cui i telefoni si iscrivono (creata al primo uso)
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

// Notifiche che arrivano senza suono né vibrazione (es. il coach decide con calma)
const SILENZIOSE: string[] = []
// Sul telefono arrivano solo queste: nuovi primati, assenze, avvisi del coach e quel che serve per entrare/accedere.
// Tutte le altre (allenamenti, gare, cuori…) restano solo nella campanella dell'app.
const PUSH = ['record', 'assenza', 'avviso', 'domanda_squadra', 'squadra', 'richiesta_genitore', 'risposta_genitore', 'email']
// Chi ha chiesto silenzio (Profilo › Notifiche) le trova solo nella campanella fino a quella data
const inSilenzio = (fino?: string | null) => !!fino && new Date(fino).getTime() > Date.now()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const k = await chiavi()
  if (req.method === 'GET') return risposta({ publicKey: k.pubblica })
  const corpo = await req.json().catch(() => ({}))

  // Dal database (notifica nuova nella campanella): la manda anche come push ai telefoni del destinatario
  if (corpo.interno) {
    const { data: s } = await admin.from('segreti').select('valore').eq('chiave', 'chiave_interna').maybeSingle()
    if (!s?.valore || s.valore !== corpo.interno) return risposta({ errore: 'Non autorizzato' }, 403)
    const { data: n } = await admin.from('notifiche').select('destinatario_id, tipo, titolo, testo, link').eq('id', corpo.notifica_id).maybeSingle()
    if (!n || !PUSH.includes(n.tipo)) return risposta({ inviate: 0, soloCampanella: true })
    const { data: chi } = await admin.from('profiles').select('notifiche_silenzio_fino').eq('id', n.destinatario_id).maybeSingle()
    if (inSilenzio(chi?.notifiche_silenzio_fino)) return risposta({ inviate: 0, silenzio: true })
    const { data: iscr } = await admin.from('push_iscrizioni').select('id, endpoint, p256dh, auth').eq('utente_id', n.destinatario_id)
    return risposta({ inviate: await invia(k, iscr || [], {
      title: n.titolo, body: n.testo || '', url: n.link || '/dashboard', silenziosa: SILENZIOSE.includes(n.tipo),
    }) })
  }

  // Altre chiamate non ce ne sono: il coach che pubblica un allenamento non manda più notifiche sul telefono
  return risposta({ errore: 'Richiesta non valida' }, 400)
})

type Iscrizione = { id: string, endpoint: string, p256dh: string, auth: string }
async function invia(k: { pubblica: string, privata: string }, iscrizioni: Iscrizione[], dati: Record<string, string | boolean>) {
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
