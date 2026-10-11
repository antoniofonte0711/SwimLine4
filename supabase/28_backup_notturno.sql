-- ============================================
-- SwimLine4 — 28: copia automatica dei dati ogni notte — 11 ottobre 2026
-- Gratis, dentro Supabase (pg_cron): ogni notte (1:30 UTC = 3:30 in Italia d'estate, 2:30 d'inverno) ogni tabella
-- viene salvata in copie.istantanee; si tengono gli ultimi 14 giorni.
-- Serve contro gli sbagli (dati cancellati per errore, una modifica andata male): si torna al giorno prima.
-- Non protegge se si perde l'intero progetto Supabase: per quello resta "Scarica una copia dei dati"
-- nel Pannello › Sicurezza (da fare ogni tanto e tenere sul PC).
-- Ripristino: select copie.esporta('2026-10-12') dà lo stesso formato della copia del Pannello,
-- da passare a strumenti/ripristino/crea_sql_ripristino.mjs.
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

create extension if not exists pg_cron;

create schema if not exists copie;
revoke all on schema copie from public, anon, authenticated;

create table if not exists copie.istantanee (
  giorno date not null,
  tabella text not null,
  righe jsonb not null,
  quante integer not null,
  fatta_il timestamp with time zone not null default now(),
  primary key (giorno, tabella)
);
revoke all on copie.istantanee from public, anon, authenticated;

-- Le tabelle con dati da salvare (non le iscrizioni push, che contengono chiavi dei telefoni)
create or replace function copie.fai_copia()
returns text language plpgsql security definer set search_path = public, copie as $$
declare t text; oggi date := (now() at time zone 'Europe/Rome')::date; totale int := 0;
begin
  foreach t in array array['squadre', 'profiles', 'allenamenti_squadra', 'presenze', 'allenamenti', 'gare',
    'punti_movimenti', 'punti_config', 'premi_catalogo', 'premi_atleta', 'genitori_figli', 'incoraggiamenti',
    'notifiche', 'atleta_riferimenti', 'richieste_squadra', 'segnalazioni', 'accessi_admin', 'tipi_lavoro',
    'tipi_lavoro_squadra', 'impostazioni_app', 'impostazioni_squadra', 'errori_app', 'video']
  loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('insert into copie.istantanee (giorno, tabella, righe, quante)
      select $1, $2, coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb), count(*) from public.%I x
      on conflict (giorno, tabella) do update set righe = excluded.righe, quante = excluded.quante, fatta_il = now()', t)
      using oggi, t;
    totale := totale + 1;
  end loop;
  delete from copie.istantanee where giorno < oggi - 14;
  return format('Copia del %s: %s tabelle', oggi, totale);
end $$;
revoke all on function copie.fai_copia() from public, anon, authenticated;

-- La copia di un giorno nel formato del Pannello (per lo strumento di ripristino)
create or replace function copie.esporta(p_giorno date)
returns jsonb language sql stable security definer set search_path = public, copie as $$
  select jsonb_build_object('esportato_il', min(fatta_il)) || coalesce(jsonb_object_agg(tabella, righe), '{}'::jsonb)
  from copie.istantanee where giorno = p_giorno
$$;
revoke all on function copie.esporta(date) from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'swimline4-copia-notturna';
select cron.schedule('swimline4-copia-notturna', '30 1 * * *', 'select copie.fai_copia()');

-- Prima copia subito
select copie.fai_copia();
