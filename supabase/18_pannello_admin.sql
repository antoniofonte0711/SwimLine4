-- ============================================
-- SwimLine4 — 18: Pannello di controllo (admin) — 10 ottobre 2026
-- - impostazioni_app: funzioni e notifiche accese/spente per tutta l'app
-- - impostazioni_squadra: permessi di ogni squadra (interruttori del pannello)
-- - le regole delicate valgono anche nel database: notifiche, iscrizioni, collegamenti genitori
-- - admin_statistiche(): numeri della home del pannello
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

create table if not exists public.impostazioni_app (
  chiave text primary key,
  valore jsonb not null default '{}'::jsonb,
  aggiornato timestamp with time zone default now()
);
alter table public.impostazioni_app enable row level security;
drop policy if exists "impostazioni_app lettura" on public.impostazioni_app;
create policy "impostazioni_app lettura" on public.impostazioni_app for SELECT to authenticated using (true);
drop policy if exists "impostazioni_app admin" on public.impostazioni_app;
create policy "impostazioni_app admin" on public.impostazioni_app for ALL to authenticated using (is_admin()) with check (is_admin());

create table if not exists public.impostazioni_squadra (
  squadra_id uuid primary key references public.squadre(id) on delete cascade,
  permessi jsonb not null default '{}'::jsonb,
  aggiornato timestamp with time zone default now()
);
alter table public.impostazioni_squadra enable row level security;
drop policy if exists "impostazioni_squadra lettura" on public.impostazioni_squadra;
create policy "impostazioni_squadra lettura" on public.impostazioni_squadra for SELECT to authenticated
  using (is_admin() or sono_in_squadra(squadra_id) or sono_coach_squadra(squadra_id));
drop policy if exists "impostazioni_squadra admin" on public.impostazioni_squadra;
create policy "impostazioni_squadra admin" on public.impostazioni_squadra for ALL to authenticated using (is_admin()) with check (is_admin());

-- Interruttore di una squadra: i permessi "speciali" (s_...) sono spenti se non scritti, gli altri accesi
create or replace function public.regola_squadra(p_squadra uuid, p_chiave text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (permessi ->> p_chiave)::boolean from impostazioni_squadra where squadra_id = p_squadra),
                  not (p_chiave like 's\_%'))
$$;

-- Tipo di notifica acceso per tutta l'app?
create or replace function public.notifica_attiva(p_tipo text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (valore ->> case
      when p_tipo = 'record' then 'record'
      when p_tipo like 'gara\_%' then 'gare'
      when p_tipo in ('richiesta_genitore', 'risposta_genitore') then 'genitori'
      when p_tipo = 'incoraggiamento' then 'incoraggiamenti'
      when p_tipo = 'allenamento' then 'allenamento'
      else '__nessuna' end)::boolean
    from impostazioni_app where chiave = 'notifiche'), true)
$$;

create or replace function public.crea_notifica(p_dest uuid, p_tipo text, p_titolo text, p_testo text, p_link text, p_chiave text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_dest is null or not notifica_attiva(p_tipo) then return; end if;
  if p_chiave is not null and exists (
    select 1 from notifiche where destinatario_id = p_dest and chiave = p_chiave and created_at > now() - interval '10 minutes'
  ) then return; end if;
  insert into notifiche (destinatario_id, tipo, titolo, testo, link, chiave)
  values (p_dest, p_tipo, p_titolo, p_testo, p_link, p_chiave);
end $$;
revoke all on function public.crea_notifica(uuid, text, text, text, text, text) from public, anon, authenticated;

-- ai genitori solo se la squadra del figlio lo permette (Il genitore può › Ricevere avvisi)
create or replace function public.notifica_famiglia(p_atleta uuid, p_tipo text, p_titolo text, p_testo_atleta text, p_testo_genitore text, p_link text, p_chiave text)
returns void language plpgsql security definer set search_path = public as $$
declare g record; v_squadra uuid;
begin
  perform crea_notifica(p_atleta, p_tipo, p_titolo, p_testo_atleta, p_link, p_chiave);
  select squadra_id into v_squadra from profiles where id = p_atleta;
  if v_squadra is not null and not regola_squadra(v_squadra, 'g_avvisi') then return; end if;
  for g in select genitore_id from genitori_figli where atleta_id = p_atleta and stato = 'approvato' loop
    perform crea_notifica(g.genitore_id, p_tipo, p_titolo, p_testo_genitore, p_link, p_chiave);
  end loop;
end $$;
revoke all on function public.notifica_famiglia(uuid, text, text, text, text, text, text) from public, anon, authenticated;

-- Iscrizioni chiuse: niente domande di ingresso
create or replace function public.chiedi_di_entrare(p_nome text)
returns text language plpgsql security definer set search_path = public as $$
declare v_ruolo text; v_attuale uuid; v_squadra uuid; v_nome text;
begin
  select role, squadra_id into v_ruolo, v_attuale from profiles where id = auth.uid();
  if v_ruolo is null or v_ruolo not in ('atleta', 'genitore', 'admin') then
    raise exception 'Solo atleti e genitori possono chiedere di entrare in una squadra';
  end if;
  select id, nome into v_squadra, v_nome from squadre where lower(trim(nome)) = lower(trim(coalesce(p_nome, ''))) limit 1;
  if v_squadra is null then raise exception 'Nessuna squadra con questo nome'; end if;
  if v_attuale = v_squadra then raise exception 'Sei già in questa squadra'; end if;
  if regola_squadra(v_squadra, 's_iscrizioni') then raise exception 'Questa squadra al momento non accetta nuove iscrizioni'; end if;
  insert into richieste_squadra (squadra_id, persona_id, richiesta_da, tipo)
  values (v_squadra, auth.uid(), auth.uid(), 'domanda')
  on conflict (squadra_id, persona_id) where stato = 'in_attesa' do nothing;
  return v_nome;
end $$;

-- Collegamenti genitori chiusi nella squadra
create or replace function public.chiedi_figli(p_atleti uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare v_io record; v_atleta record; n integer := 0;
begin
  select id, nome, cognome, role, squadra_id into v_io from profiles where id = auth.uid();
  if v_io.id is null then raise exception 'Non autenticato'; end if;
  if v_io.role not in ('genitore', 'admin') then raise exception 'Solo i genitori possono collegarsi a un atleta'; end if;
  if v_io.squadra_id is not null and regola_squadra(v_io.squadra_id, 's_genitori') then
    raise exception 'In questa squadra i collegamenti dei genitori sono chiusi: chiedi al coach';
  end if;
  for v_atleta in select id, nome from profiles
    where id = any(p_atleti) and role in ('atleta', 'admin') and squadra_id is not null and squadra_id = v_io.squadra_id and id <> v_io.id
  loop
    insert into genitori_figli (genitore_id, atleta_id) values (v_io.id, v_atleta.id)
    on conflict (genitore_id, atleta_id) do update set stato = 'in_attesa', created_at = now(), risposta_il = null
      where genitori_figli.stato = 'rifiutato';
    if found then
      n := n + 1;
      perform crea_notifica(v_atleta.id, 'richiesta_genitore', 'Un genitore vuole seguirti',
        trim(coalesce(v_io.nome, '') || ' ' || coalesce(v_io.cognome, '')) || ' chiede di vedere i tuoi progressi. Approva o rifiuta dal tuo Profilo.',
        '/profilo', 'richiesta:' || v_io.id);
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.chiedi_figli(uuid[]) from public, anon;
grant execute on function public.chiedi_figli(uuid[]) to authenticated;

-- Avviso dell'admin nella campanella (e push): a tutti, o solo atleti / genitori / coach, di una squadra o di tutte
create or replace function public.admin_avviso(p_testo text, p_ruolo text, p_squadra uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare p record; n integer := 0;
begin
  if not is_admin() then raise exception 'Solo per l''amministratore'; end if;
  if coalesce(trim(p_testo), '') = '' then raise exception 'Scrivi il messaggio'; end if;
  for p in select id from profiles
    where (p_ruolo is null or p_ruolo = 'tutti' or role = p_ruolo or (p_ruolo = 'atleta' and role = 'admin'))
      and (p_squadra is null or squadra_id = p_squadra) and id <> auth.uid()
  loop
    perform crea_notifica(p.id, 'avviso', 'Avviso dalla squadra', left(trim(p_testo), 500), '/notifiche', null);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.admin_avviso(text, text, uuid) from public, anon;
grant execute on function public.admin_avviso(text, text, uuid) to authenticated;

-- Numeri della home del pannello (solo admin)
create or replace function public.admin_statistiche()
returns json language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'Solo per l''amministratore'; end if;
  return json_build_object(
    'nuovi_utenti_7gg', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'accessi_7gg', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'coach_in_attesa', (select count(*) from public.profiles where role = 'coach_in_attesa'),
    'allenamenti_in_programma', (select count(*) from public.allenamenti_squadra where pubblicato and data >= current_date),
    'segnalazioni', (select count(*) from public.segnalazioni)
  );
end $$;
revoke all on function public.admin_statistiche() from public, anon;
grant execute on function public.admin_statistiche() to authenticated;
