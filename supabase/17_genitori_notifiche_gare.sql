-- ============================================
-- SwimLine4 — 17: genitori, notifiche nell'app, record personali, incoraggiamenti, gare nel calendario
-- (funzioni decise il 9 ottobre 2026). Si può rieseguire.
-- Prima sull'anteprima, poi sul database vero quando si pubblica.
-- Dopo, su ogni progetto, una tantum: insert into segreti (chiave, valore) values
--   ('url_funzioni', 'https://<progetto>.supabase.co/functions/v1') on conflict (chiave) do update set valore = excluded.valore;
-- ============================================

create extension if not exists pg_net with schema extensions;

-- ---------- tempi: da secondi al formato dell'app (1'02"40 / 59"80) ----------
create or replace function public.tempo_testo(sec numeric)
returns text language sql immutable set search_path = public as $$
  select case when sec is null then null
    when floor(sec / 60) = 0 then floor(sec)::int || '"' || lpad(floor((sec - floor(sec)) * 100)::int::text, 2, '0')
    else floor(sec / 60)::int || '''' || lpad((floor(sec)::int % 60)::text, 2, '0') || '"' || lpad(floor((sec - floor(sec)) * 100)::int::text, 2, '0')
  end
$$;

create or replace function public.stile_breve(s text)
returns text language sql immutable as $$
  select case s when 'Stile libero' then 'SL' when 'Proprio stile' then 'PS' else lower(coalesce(s, '')) end
$$;

-- ---------- collegamento genitore → figlio (l'atleta approva) ----------
create table if not exists public.genitori_figli (
  id uuid default gen_random_uuid() primary key,
  genitore_id uuid not null references public.profiles(id) on delete cascade,
  atleta_id uuid not null references public.profiles(id) on delete cascade,
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'approvato', 'rifiutato')),
  created_at timestamp with time zone default now(),
  risposta_il timestamp with time zone,
  unique (genitore_id, atleta_id)
);
alter table public.genitori_figli enable row level security;

create or replace function public.sono_genitore_di(p_atleta uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from genitori_figli where genitore_id = auth.uid() and atleta_id = p_atleta and stato = 'approvato')
$$;

-- l'atleta vede il nome di chi gli ha chiesto di seguirlo
create or replace function public.mi_ha_chiesto(p_genitore uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from genitori_figli where genitore_id = p_genitore and atleta_id = auth.uid())
$$;

drop policy if exists "genitori_figli lettura" on public.genitori_figli;
create policy "genitori_figli lettura" on public.genitori_figli for SELECT to authenticated
  using (genitore_id = auth.uid() or atleta_id = auth.uid() or sono_coach_di(atleta_id));
drop policy if exists "genitori_figli scollega" on public.genitori_figli;
create policy "genitori_figli scollega" on public.genitori_figli for DELETE to authenticated
  using (genitore_id = auth.uid() or atleta_id = auth.uid() or sono_coach_di(atleta_id));

-- il genitore vede i dati dei figli che lo hanno approvato
drop policy if exists "genitore vede i figli" on public.profiles;
create policy "genitore vede i figli" on public.profiles for SELECT to authenticated using (sono_genitore_di(id));
drop policy if exists "atleta vede chi lo segue" on public.profiles;
create policy "atleta vede chi lo segue" on public.profiles for SELECT to authenticated using (mi_ha_chiesto(id));
drop policy if exists "genitore vede gli allenamenti dei figli" on public.allenamenti;
create policy "genitore vede gli allenamenti dei figli" on public.allenamenti for SELECT to authenticated using (sono_genitore_di(atleta_id));
drop policy if exists "genitore vede le gare dei figli" on public.gare;
create policy "genitore vede le gare dei figli" on public.gare for SELECT to authenticated using (sono_genitore_di(atleta_id));
drop policy if exists "genitore vede le presenze dei figli" on public.presenze;
create policy "genitore vede le presenze dei figli" on public.presenze for SELECT to authenticated using (sono_genitore_di(atleta_id));
drop policy if exists "genitore vede i punti dei figli" on public.punti_movimenti;
create policy "genitore vede i punti dei figli" on public.punti_movimenti for SELECT to authenticated using (sono_genitore_di(atleta_id));

-- ---------- notifiche nell'app (campanella) ----------
create table if not exists public.notifiche (
  id uuid default gen_random_uuid() primary key,
  destinatario_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null,
  titolo text not null,
  testo text,
  link text,
  chiave text,
  letta boolean not null default false,
  created_at timestamp with time zone default now()
);
create index if not exists notifiche_destinatario on public.notifiche (destinatario_id, created_at desc);
alter table public.notifiche enable row level security;
drop policy if exists "notifiche mie" on public.notifiche;
create policy "notifiche mie" on public.notifiche for SELECT to authenticated using (destinatario_id = auth.uid());
drop policy if exists "notifiche segno lette" on public.notifiche;
create policy "notifiche segno lette" on public.notifiche for UPDATE to authenticated
  using (destinatario_id = auth.uid()) with check (destinatario_id = auth.uid());
drop policy if exists "notifiche cancello" on public.notifiche;
create policy "notifiche cancello" on public.notifiche for DELETE to authenticated using (destinatario_id = auth.uid());

-- una notifica (con chiave: niente doppioni nei 10 minuti, es. una gara con più distanze)
create or replace function public.crea_notifica(p_dest uuid, p_tipo text, p_titolo text, p_testo text, p_link text, p_chiave text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_dest is null then return; end if;
  if p_chiave is not null and exists (
    select 1 from notifiche where destinatario_id = p_dest and chiave = p_chiave and created_at > now() - interval '10 minutes'
  ) then return; end if;
  insert into notifiche (destinatario_id, tipo, titolo, testo, link, chiave)
  values (p_dest, p_tipo, p_titolo, p_testo, p_link, p_chiave);
end $$;
revoke all on function public.crea_notifica(uuid, text, text, text, text, text) from public, anon, authenticated;

-- all'atleta (testo in seconda persona) e ai genitori approvati (col nome del figlio)
create or replace function public.notifica_famiglia(p_atleta uuid, p_tipo text, p_titolo text, p_testo_atleta text, p_testo_genitore text, p_link text, p_chiave text)
returns void language plpgsql security definer set search_path = public as $$
declare g record;
begin
  perform crea_notifica(p_atleta, p_tipo, p_titolo, p_testo_atleta, p_link, p_chiave);
  for g in select genitore_id from genitori_figli where atleta_id = p_atleta and stato = 'approvato' loop
    perform crea_notifica(g.genitore_id, p_tipo, p_titolo, p_testo_genitore, p_link, p_chiave);
  end loop;
end $$;
revoke all on function public.notifica_famiglia(uuid, text, text, text, text, text, text) from public, anon, authenticated;

-- ogni notifica nuova parte anche come push sul telefono (funzione "notifiche"), se configurata
insert into public.segreti (chiave, valore) values ('chiave_interna', gen_random_uuid()::text) on conflict (chiave) do nothing;
create or replace function public.trg_push_notifica()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_chiave text;
begin
  select valore into v_url from segreti where chiave = 'url_funzioni';
  select valore into v_chiave from segreti where chiave = 'chiave_interna';
  if v_url is not null and v_chiave is not null then
    begin
      perform net.http_post(url := v_url || '/notifiche',
        body := jsonb_build_object('interno', v_chiave, 'notifica_id', new.id),
        headers := '{"Content-Type": "application/json"}'::jsonb);
    exception when others then null; -- la notifica nell'app resta comunque
    end;
  end if;
  return new;
end $$;
drop trigger if exists push_notifica on public.notifiche;
create trigger push_notifica after insert on public.notifiche for each row execute function public.trg_push_notifica();

-- ---------- richieste dei genitori ----------
create or replace function public.chiedi_figli(p_atleti uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare v_io record; v_atleta record; n integer := 0;
begin
  select id, nome, cognome, role, squadra_id into v_io from profiles where id = auth.uid();
  if v_io.id is null then raise exception 'Non autenticato'; end if;
  if v_io.role not in ('genitore', 'admin') then raise exception 'Solo i genitori possono collegarsi a un atleta'; end if;
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

create or replace function public.rispondi_genitore(p_id uuid, p_accetta boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_r record; v_nome text;
begin
  select * into v_r from genitori_figli where id = p_id and atleta_id = auth.uid();
  if v_r.id is null then raise exception 'Richiesta non trovata'; end if;
  update genitori_figli set stato = case when p_accetta then 'approvato' else 'rifiutato' end, risposta_il = now() where id = p_id;
  select nome into v_nome from profiles where id = auth.uid();
  perform crea_notifica(v_r.genitore_id, 'risposta_genitore',
    case when p_accetta then 'Collegamento approvato' else 'Collegamento rifiutato' end,
    case when p_accetta then coalesce(v_nome, 'L''atleta') || ' ha approvato: ora vedi i suoi progressi.'
         else coalesce(v_nome, 'L''atleta') || ' non ha approvato la richiesta.' end,
    '/dashboard', null);
end $$;
revoke all on function public.rispondi_genitore(uuid, boolean) from public, anon;
grant execute on function public.rispondi_genitore(uuid, boolean) to authenticated;

-- ---------- record personali ----------
create or replace function public.trg_record_allenamenti()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nuovo numeric; v_prima numeric; v_nome text; v_cosa text;
begin
  select min(public.tempo_sec(p)) into v_nuovo from jsonb_array_elements_text(coalesce(new.passaggi, '[]'::jsonb)) p;
  if v_nuovo is null then return new; end if;
  select min(public.tempo_sec(p)) into v_prima
    from allenamenti a, jsonb_array_elements_text(coalesce(a.passaggi, '[]'::jsonb)) p
    where a.atleta_id = new.atleta_id and a.id <> new.id and a.tipo_lavoro is not distinct from new.tipo_lavoro
      and a.distanza = new.distanza and a.stile is not distinct from new.stile;
  if v_prima is null or v_nuovo >= v_prima then return new; end if;
  select nome into v_nome from profiles where id = new.atleta_id;
  v_cosa := 'i ' || new.distanza || ' ' || stile_breve(new.stile) || coalesce(' (' || new.tipo_lavoro || ')', '') || ' in ' || tempo_testo(v_nuovo)
    || ', -' || tempo_testo(v_prima - v_nuovo) || ' rispetto al record precedente.';
  perform notifica_famiglia(new.atleta_id, 'record', 'Nuovo primato!', 'Hai nuotato ' || v_cosa,
    coalesce(v_nome, 'Tuo figlio') || ' ha nuotato ' || v_cosa, '/progressi', 'record:' || new.id);
  return new;
end $$;
drop trigger if exists record_allenamenti on public.allenamenti;
create trigger record_allenamenti after insert on public.allenamenti for each row execute function public.trg_record_allenamenti();

create or replace function public.trg_record_gare()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nuovo numeric; v_prima numeric; v_nome text; v_cosa text;
begin
  if new.tempo is null or (tg_op = 'UPDATE' and old.tempo is not distinct from new.tempo) then return new; end if;
  v_nuovo := tempo_sec(new.tempo);
  if v_nuovo is null then return new; end if;
  select min(tempo_sec(g.tempo)) into v_prima from gare g
    where g.atleta_id = new.atleta_id and g.distanza = new.distanza and g.stile = new.stile and g.id <> new.id and g.tempo is not null;
  if v_prima is null or v_nuovo >= v_prima then return new; end if;
  select nome into v_nome from profiles where id = new.atleta_id;
  v_cosa := 'i ' || new.distanza || ' ' || stile_breve(new.stile) || ' in gara in ' || tempo_testo(v_nuovo)
    || ', -' || tempo_testo(v_prima - v_nuovo) || ' rispetto al record precedente.';
  perform notifica_famiglia(new.atleta_id, 'record', 'Nuovo primato!', 'Hai nuotato ' || v_cosa,
    coalesce(v_nome, 'Tuo figlio') || ' ha nuotato ' || v_cosa, '/gare', 'record:' || new.id);
  return new;
end $$;
drop trigger if exists record_gare on public.gare;
create trigger record_gare after insert or update of tempo on public.gare for each row execute function public.trg_record_gare();

-- ---------- gare: luogo e note, avvisi quando il coach le assegna, cambia o cancella ----------
alter table public.gare add column if not exists luogo text;
alter table public.gare add column if not exists note text;

create or replace function public.trg_avvisi_gare()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_g record; v_quando text; v_testo text; v_tipo text; v_titolo text;
begin
  if tg_op = 'DELETE' then v_g := old; else v_g := new; end if;
  -- solo le gare messe dal coach (non i risultati che un atleta inserisce da solo)
  if auth.uid() is null or auth.uid() = v_g.atleta_id then return null; end if;
  -- atleta appena eliminato (cancellazione a cascata): nessuno da avvisare
  if not exists (select 1 from profiles where id = v_g.atleta_id) then return null; end if;
  if tg_op = 'INSERT' then
    if new.tempo is not null then return null; end if;
    v_tipo := 'gara_nuova'; v_titolo := 'Nuova gara in calendario';
  elsif tg_op = 'UPDATE' then
    if (old.nome_gara, old.data_gara, old.orario, old.luogo, old.note) is not distinct from (new.nome_gara, new.data_gara, new.orario, new.luogo, new.note) then
      return null;
    end if;
    v_tipo := 'gara_modificata'; v_titolo := 'Gara modificata';
  else
    if old.tempo is not null then return null; end if;
    v_tipo := 'gara_cancellata'; v_titolo := 'Gara cancellata';
  end if;
  v_quando := to_char(v_g.data_gara, 'DD/MM/YYYY') || coalesce(' ore ' || left(v_g.orario::text, 5), '');
  v_testo := coalesce(v_g.nome_gara, 'Gara') || ', ' || v_quando || coalesce(', ' || nullif(v_g.luogo, ''), '') || '.';
  perform notifica_famiglia(v_g.atleta_id, v_tipo, v_titolo, v_testo, v_testo, '/gare',
    v_tipo || ':' || coalesce(v_g.nome_gara, '') || ':' || v_g.data_gara);
  return null;
end $$;
drop trigger if exists avvisi_gare on public.gare;
create trigger avvisi_gare after insert or update or delete on public.gare for each row execute function public.trg_avvisi_gare();

-- ---------- incoraggiamenti del genitore (cuore / Bravo!) ----------
create table if not exists public.incoraggiamenti (
  id uuid default gen_random_uuid() primary key,
  genitore_id uuid not null references public.profiles(id) on delete cascade,
  atleta_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('cuore', 'bravo')),
  riferimento text not null,
  descrizione text,
  created_at timestamp with time zone default now(),
  unique (genitore_id, riferimento, tipo)
);
alter table public.incoraggiamenti enable row level security;
drop policy if exists "incoraggiamenti lettura" on public.incoraggiamenti;
create policy "incoraggiamenti lettura" on public.incoraggiamenti for SELECT to authenticated
  using (genitore_id = auth.uid() or atleta_id = auth.uid());

create or replace function public.incoraggia(p_atleta uuid, p_tipo text, p_riferimento text, p_descrizione text)
returns void language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  if not sono_genitore_di(p_atleta) then raise exception 'Puoi incoraggiare solo i tuoi figli'; end if;
  if p_tipo not in ('cuore', 'bravo') then raise exception 'Tipo non valido'; end if;
  insert into incoraggiamenti (genitore_id, atleta_id, tipo, riferimento, descrizione)
  values (auth.uid(), p_atleta, p_tipo, left(p_riferimento, 200), left(p_descrizione, 200))
  on conflict (genitore_id, riferimento, tipo) do nothing;
  if not found then return; end if;
  select trim(coalesce(nome, '') || ' ' || coalesce(cognome, '')) into v_nome from profiles where id = auth.uid();
  perform crea_notifica(p_atleta, 'incoraggiamento',
    case p_tipo when 'cuore' then '❤️ Un cuore per te' else '👏 Bravo!' end,
    coalesce(nullif(v_nome, ''), 'Un genitore') || case p_tipo when 'cuore' then ' ti ha mandato un cuore' else ' ti dice bravo' end
      || coalesce(' per ' || p_descrizione, '') || '.',
    '/dashboard', null);
end $$;
revoke all on function public.incoraggia(uuid, text, text, text) from public, anon;
grant execute on function public.incoraggia(uuid, text, text, text) to authenticated;
