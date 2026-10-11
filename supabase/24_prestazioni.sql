-- ============================================
-- SwimLine4 — 24: database più veloce con tante squadre — 11 ottobre 2026
-- - Regole di accesso: auth.uid() diventa (select auth.uid()), così Postgres lo calcola una volta
--   per richiesta invece che per ogni riga (avviso Supabase "auth_rls_initplan"). Le regole restano identiche.
-- - Indici sui collegamenti che ne erano senza (avviso "unindexed_foreign_keys").
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

do $$
declare p record; nuova_using text; nuova_check text; sql text;
begin
  for p in
    select tablename, policyname, cmd, qual, with_check from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ 'auth\.uid\(\)' or coalesce(with_check, '') ~ 'auth\.uid\(\)')
  loop
    -- solo gli auth.uid() non già dentro una select
    nuova_using := regexp_replace(p.qual, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    nuova_check := regexp_replace(p.with_check, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    sql := format('alter policy %I on public.%I', p.policyname, p.tablename);
    if p.qual is not null then sql := sql || format(' using (%s)', nuova_using); end if;
    if p.with_check is not null then sql := sql || format(' with check (%s)', nuova_check); end if;
    execute sql;
  end loop;
end $$;

create index if not exists accessi_admin_admin on public.accessi_admin (admin_id);
create index if not exists accessi_admin_target on public.accessi_admin (target_id);
create index if not exists allenamenti_squadra_coach on public.allenamenti_squadra (coach_id);
create index if not exists premi_atleta_squadra on public.premi_atleta (squadra_id);
create index if not exists premi_catalogo_squadra on public.premi_catalogo (squadra_id);
create index if not exists presenze_segnato_da on public.presenze (segnato_da);
create index if not exists punti_movimenti_squadra on public.punti_movimenti (squadra_id);
create index if not exists richieste_squadra_richiesta_da on public.richieste_squadra (richiesta_da);
create index if not exists segnalazioni_autore on public.segnalazioni (autore_id);
create index if not exists tipi_lavoro_squadra_idx on public.tipi_lavoro (squadra_id);
