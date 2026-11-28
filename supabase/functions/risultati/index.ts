// Edge Function "risultati": mette da sola i tempi ufficiali delle gare presi da nuoto.ficr.it,
// con passaggi, posto in batteria e posto in classifica. La chiama il database ogni 30 minuti (pg_cron,
// chiama_risultati, migrazione 56) solo se ci sono gare degli ultimi 7 giorni ancora senza piazzamento.
// POST { interno }                  -> cerca e scrive
// POST { interno, soloProva: true } -> cerca e dice cosa scriverebbe, senza scrivere
// Pubblicata con verify_jwt = false: il database la chiama senza utente; controlla da sé la chiave interna.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { cercaRisultati } from './ficr.js'

const risposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const giorno = (indietro: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(Date.now() - indietro * 86400000))

Deno.serve(async (req) => {
  if (req.method !== 'POST') return risposta({ errore: 'Metodo non valido' }, 405)
  const corpo = await req.json().catch(() => ({}))
  const { data: s } = await admin.from('segreti').select('valore').eq('chiave', 'chiave_interna').maybeSingle()
  if (!s?.valore || s.valore !== corpo.interno) return risposta({ errore: 'Non autorizzato' }, 403)

  const { data: gare, error } = await admin.from('gare')
    .select('id, data_gara, distanza, stile, luogo, tempo, passaggi, atleta:profiles!gare_atleta_id_fkey(nome, cognome, data_nascita, eliminato_il)')
    .is('piazzamento', null).gte('data_gara', giorno(7)).lte('data_gara', giorno(0)).limit(200)
  if (error) return risposta({ errore: error.message }, 500)
  // deno-lint-ignore no-explicit-any
  const daCercare = (gare || []).filter((g: any) => g.atleta && !g.atleta.eliminato_il)
  const esito = await cercaRisultati(daCercare)
  if (corpo.soloProva) return risposta(esito)

  let scritte = 0
  for (const x of esito.scrivere) {
    // si scrive solo se nel frattempo nessuno ha cambiato il tempo
    const q = admin.from('gare').update(x.cambi).eq('id', x.id)
    const { data, error: e } = await (x.tempoPrima ? q.eq('tempo', x.tempoPrima) : q.is('tempo', null)).select('id')
    if (e) esito.errori.push(e.message)
    else scritte += data?.length || 0
  }
  return risposta({ cercate: daCercare.length, scritte, saltate: esito.saltate.length, errori: esito.errori })
})
