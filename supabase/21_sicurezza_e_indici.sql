-- ============================================
-- SwimLine4 — 21: pulizia di sicurezza e indici (controllo approfondito, 11 ottobre 2026)
-- Si può rieseguire.
-- ============================================

-- 1) Le funzioni dei trigger non si chiamano dall'esterno (girano solo come trigger)
do $$ declare f record; begin
  for f in select p.oid::regprocedure as firma from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype loop
    execute format('revoke all on function %s from public, anon, authenticated', f.firma);
  end loop;
end $$;

-- 2) Le funzioni che controllano i permessi servono solo a chi ha fatto l'accesso
do $$ declare f text; begin
  foreach f in array array[
    'public.sono_coach_di(uuid)', 'public.mia_squadra()', 'public.sono_coach_squadra(uuid)', 'public.sono_in_squadra(uuid)',
    'public.is_admin()', 'public.sono_genitore_di(uuid)', 'public.mi_ha_chiesto(uuid)', 'public.regola_squadra(uuid, text)',
    'public.notifica_attiva(text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- 3) Il profilo lo crea solo il trigger di registrazione (handle_new_user, che decide il ruolo):
--    nessuno può inserirsene uno a mano scegliendo il proprio ruolo
drop policy if exists "un utente crea il proprio profilo" on public.profiles;

-- 4) search_path fisso anche per stile_breve
alter function public.stile_breve(text) set search_path = public;

-- 5) Indici sulle colonne usate da filtri e regole di accesso
create index if not exists allenamenti_atleta_data on public.allenamenti (atleta_id, data_allenamento);
create index if not exists gare_atleta_data on public.gare (atleta_id, data_gara);
create index if not exists profiles_squadra on public.profiles (squadra_id);
create index if not exists squadre_coach on public.squadre (coach_id);
create index if not exists genitori_figli_atleta on public.genitori_figli (atleta_id);
create index if not exists premi_atleta_atleta on public.premi_atleta (atleta_id);
create index if not exists push_iscrizioni_utente on public.push_iscrizioni (utente_id);
create index if not exists richieste_squadra_persona on public.richieste_squadra (persona_id);
create index if not exists incoraggiamenti_atleta on public.incoraggiamenti (atleta_id);
create index if not exists video_atleta on public.video (atleta_id);

-- 6) Trasparenza: chi viene aggiunto a una squadra dal coach lo sa subito (e può uscirne dal Profilo)
create or replace function public.aggiungi_a_squadra(p_persona uuid, p_squadra uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_ruolo text; v_attuale uuid; v_nome_attuale text; v_nome text;
  v_admin boolean := coalesce(public.is_admin(), false);
begin
  if not public.sono_coach_squadra(p_squadra) then
    raise exception 'Non puoi gestire questa squadra';
  end if;
  select role, squadra_id into v_ruolo, v_attuale from profiles where id = p_persona;
  if v_ruolo is null then raise exception 'Persona non trovata'; end if;
  if v_ruolo = 'admin' and p_persona <> auth.uid() then
    raise exception 'Questa persona entra solo se accetta: usa "Invia richiesta"';
  end if;
  if not (v_ruolo in ('atleta', 'genitore') or (p_persona = auth.uid() and v_admin)) then
    raise exception 'Si possono aggiungere solo atleti e genitori';
  end if;
  if v_attuale is not null and v_attuale <> p_squadra and not v_admin then
    select nome into v_nome_attuale from squadre where id = v_attuale;
    raise exception 'È già nella squadra %: può uscirne dal suo Profilo, oppure chiedi all''admin di spostarlo', coalesce(v_nome_attuale, '');
  end if;
  update profiles set squadra_id = p_squadra where id = p_persona;
  select nome into v_nome from squadre where id = p_squadra;
  if p_persona <> auth.uid() and v_attuale is distinct from p_squadra then
    perform crea_notifica(p_persona, 'squadra', 'Sei nella squadra ' || coalesce(v_nome, ''),
      'Il coach ti ha aggiunto a ' || coalesce(v_nome, 'una squadra') || ': ora vede i tuoi tempi, le gare e le presenze. Se non lo conosci, esci dalla squadra dal tuo Profilo.',
      '/profilo', 'aggiunto:' || p_squadra);
  end if;
  return v_nome;
end $$;
revoke all on function public.aggiungi_a_squadra(uuid, uuid) from public, anon;
grant execute on function public.aggiungi_a_squadra(uuid, uuid) to authenticated;
