// Trasforma una copia dei dati (il file .json del Pannello › Sicurezza › "Scarica una copia dei dati",
// oppure quelli in Documents\SwimLine4-backup) in SQL per rimettere le righe nel database.
//
//   node strumenti/ripristino/crea_sql_ripristino.mjs <copia.json> [prova] > ripristino.sql
//
// Senza "prova": inserisce nelle tabelle vere (public) le righe che mancano, stessi id, niente doppioni
//   (on conflict do nothing). Gli account (auth.users) non si ripristinano: le password non si esportano.
// Con "prova": crea in una transazione delle copie vuote delle tabelle, ci carica la copia, conta le righe
//   e annulla tutto con un errore apposta (si legge il risultato nel messaggio). Da usare sull'ANTEPRIMA.
// Il file contiene dati personali: non salvarlo nel progetto e non caricarlo su GitHub.
import { readFileSync } from 'node:fs'

const [file, modo] = process.argv.slice(2)
if (!file) { console.error('Uso: node crea_sql_ripristino.mjs <copia.json> [prova]'); process.exit(1) }
const copia = JSON.parse(readFileSync(file, 'utf8'))

// Prima le tabelle a cui le altre si collegano
const ORDINE = ['squadre', 'profiles', 'impostazioni_app', 'impostazioni_squadra', 'punti_config', 'premi_catalogo',
  'allenamenti_squadra', 'presenze', 'allenamenti', 'gare', 'punti_movimenti', 'premi_atleta', 'genitori_figli',
  'incoraggiamenti', 'notifiche', 'atleta_riferimenti', 'richieste_squadra', 'segnalazioni', 'accessi_admin',
  'tipi_lavoro', 'tipi_lavoro_squadra', 'video']
const tabelle = ORDINE.filter((t) => Array.isArray(copia[t]) && copia[t].length > 0)
const sconosciute = Object.keys(copia).filter((k) => Array.isArray(copia[k]) && !ORDINE.includes(k) && k !== 'utenti_auth')
if (sconosciute.length) console.error('Attenzione, tabelle non previste (saltate):', sconosciute.join(', '))

const dati = JSON.stringify(Object.fromEntries(tabelle.map((t) => [t, copia[t]]))).replaceAll('$copia$', '')
const schema = modo === 'prova' ? 'prova_ripristino' : 'public'
// Solo le colonne presenti nella copia: quelle aggiunte all'app dopo (es. tempi_visibili) prendono il valore di partenza
const colonne = (t) => [...new Set(copia[t].flatMap((r) => Object.keys(r)))].map((c) => `"${c.replaceAll('"', '')}"`).join(', ')
const righe = tabelle.map((t) =>
  `  begin\n    insert into ${schema}.${t} (${colonne(t)}) select ${colonne(t)} from jsonb_populate_recordset(null::${schema}.${t}, d -> '${t}') on conflict do nothing;\n` +
  `    get diagnostics x = row_count; r := r || '${t}=' || x || '/${copia[t].length} ';\n` +
  `  exception when others then r := r || '${t} ERRORE: ' || sqlerrm || ' '; end;`).join('\n')

console.log(`-- Ripristino dalla copia del ${copia.esportato_il || '?'} (${modo === 'prova' ? 'PROVA, annullata alla fine' : 'nelle tabelle vere'})
do $ripristino$
declare d jsonb := $copia$${dati}$copia$::jsonb; r text := ''; x int;
begin
${modo === 'prova' ? tabelle.map((t) => `  create table if not exists prova_ripristino.${t} (like public.${t} including defaults including constraints including indexes);`).join('\n').replace(/^/, '  create schema prova_ripristino;\n') : ''}
${righe}
  ${modo === 'prova' ? "raise exception 'PROVA RIPRISTINO (annullata): %', r;" : "raise notice 'Ripristinate: %', r;"}
end $ripristino$;`)
