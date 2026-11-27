-- ============================================
-- SwimLine4 — 53: la copia notturna salva anche le tabelle nuove — 27 novembre 2026
-- Mancavano società, registro modifiche, voci punti, premi proposti, riscaldamenti e gare FIN.
-- Restano fuori apposta: chiavi (segreti, registro_fogli, push_iscrizioni) e statistiche d'uso (attivita_*).
-- Quando si aggiunge una tabella con dati: metterla qui, in TABELLE_COPIA (AdminImpostazioni.jsx)
-- e in ORDINE (strumenti/ripristino/crea_sql_ripristino.mjs).
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

create or replace function copie.fai_copia()
returns text language plpgsql security definer set search_path = public, copie as $$
declare t text; oggi date := (now() at time zone 'Europe/Rome')::date; totale int := 0;
begin
  foreach t in array array['squadre', 'profiles', 'allenamenti_squadra', 'presenze', 'allenamenti', 'gare',
    'punti_movimenti', 'punti_config', 'premi_catalogo', 'premi_atleta', 'genitori_figli', 'incoraggiamenti',
    'notifiche', 'atleta_riferimenti', 'richieste_squadra', 'segnalazioni', 'accessi_admin', 'tipi_lavoro',
    'tipi_lavoro_squadra', 'impostazioni_app', 'impostazioni_squadra', 'errori_app', 'video', 'allenamenti_extra',
    'societa', 'registro_modifiche', 'punti_voci', 'premi_proposte', 'riscaldamenti', 'manifestazioni_fin', 'iscrizioni_fin']
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

-- Prima copia completa subito
select copie.fai_copia();
