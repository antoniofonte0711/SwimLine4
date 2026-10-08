-- ============================================
-- SwimLine4 — Migrazione fase 10
-- 1) Ordine delle gare dentro un trofeo
-- 2) Sistema a punti e premi a sorpresa
-- Incolla tutto nell'SQL Editor di Supabase e premi Run (si può rieseguire).
-- Richiede le fasi 3 e 7 (funzioni sono_coach_di e is_admin).
-- ============================================

alter table gare add column if not exists ordine smallint default 0;

-- ---------- Tabelle ----------
create table if not exists punti_config (
  squadra_id uuid primary key references squadre(id) on delete cascade,
  punti_presenza int not null default 10,
  punti_risultati int not null default 5,
  punti_gara int not null default 15,
  punti_miglioramento int not null default 10,
  soglia_premio int not null default 100 check (soglia_premio > 0)
);

create table if not exists punti_movimenti (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references profiles(id) on delete cascade,
  squadra_id uuid references squadre(id) on delete set null,
  punti int not null,
  motivo text not null,
  riferimento text not null,        -- evita di dare due volte i punti per lo stesso fatto
  data date default current_date,
  created_at timestamp with time zone default now(),
  unique (atleta_id, riferimento)
);

create table if not exists premi_catalogo (
  id uuid primary key default gen_random_uuid(),
  squadra_id uuid not null references squadre(id) on delete cascade,
  nome text not null,
  peso int not null default 3 check (peso between 1 and 10),  -- più alto = esce più spesso
  attivo boolean not null default true,
  created_at timestamp with time zone default now()
);

create table if not exists premi_atleta (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references profiles(id) on delete cascade,
  squadra_id uuid references squadre(id) on delete set null,
  premio_nome text not null,
  ottenuto_il timestamp with time zone default now(),
  usato boolean not null default false,
  usato_il timestamp with time zone
);

alter table punti_config enable row level security;
alter table punti_movimenti enable row level security;
alter table premi_catalogo enable row level security;
alter table premi_atleta enable row level security;

-- ---------- Permessi ----------
create or replace function public.sono_coach_squadra(p_squadra uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from squadre where id = p_squadra and coach_id = auth.uid())
      or coalesce(public.is_admin(), false)
$$;
create or replace function public.sono_in_squadra(p_squadra uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and squadra_id = p_squadra)
$$;

drop policy if exists "punti_config lettura" on punti_config;
create policy "punti_config lettura" on punti_config for select
  using (public.sono_coach_squadra(squadra_id) or public.sono_in_squadra(squadra_id));
drop policy if exists "punti_config coach" on punti_config;
create policy "punti_config coach" on punti_config for all
  using (public.sono_coach_squadra(squadra_id)) with check (public.sono_coach_squadra(squadra_id));

drop policy if exists "movimenti lettura" on punti_movimenti;
create policy "movimenti lettura" on punti_movimenti for select
  using (auth.uid() = atleta_id or public.sono_coach_di(atleta_id));
drop policy if exists "movimenti bonus coach" on punti_movimenti;
create policy "movimenti bonus coach" on punti_movimenti for insert
  with check (public.sono_coach_di(atleta_id));

drop policy if exists "catalogo lettura" on premi_catalogo;
create policy "catalogo lettura" on premi_catalogo for select
  using (public.sono_coach_squadra(squadra_id) or public.sono_in_squadra(squadra_id));
drop policy if exists "catalogo coach" on premi_catalogo;
create policy "catalogo coach" on premi_catalogo for all
  using (public.sono_coach_squadra(squadra_id)) with check (public.sono_coach_squadra(squadra_id));

drop policy if exists "premi lettura" on premi_atleta;
create policy "premi lettura" on premi_atleta for select
  using (auth.uid() = atleta_id or public.sono_coach_di(atleta_id));
drop policy if exists "premi coach conferma" on premi_atleta;
create policy "premi coach conferma" on premi_atleta for update
  using (public.sono_coach_di(atleta_id));

-- ---------- Lettura dei tempi (formato 1'20"00, 59"00, vecchio 01:05.40) ----------
create or replace function public.tempo_sec(t text)
returns numeric language plpgsql immutable as $$
declare m text[];
begin
  if t is null then return null; end if;
  m := regexp_match(t, '^(\d{1,2})''([0-5]\d)"(\d{2})$');
  if m is not null then return m[1]::numeric * 60 + m[2]::numeric + m[3]::numeric / 100; end if;
  m := regexp_match(t, '^([0-5]?\d)"(\d{2})$');
  if m is not null then return m[1]::numeric + m[2]::numeric / 100; end if;
  m := regexp_match(t, '^(\d+):(\d+)\.(\d+)$');
  if m is not null then return m[1]::numeric * 60 + m[2]::numeric + m[3]::numeric / power(10, length(m[3])); end if;
  return null;
end $$;

-- ---------- Assegnazione automatica dei punti ----------
create or replace function public.punti_assegna(p_atleta uuid, p_evento text, p_rif text, p_data date)
returns void language plpgsql security definer set search_path = public as $$
declare v_sq uuid; v_pres int; v_ris int; v_gara int; v_migl int; v_p int; v_mot text;
begin
  select squadra_id into v_sq from profiles where id = p_atleta;
  if v_sq is null then return; end if;
  select coalesce(c.punti_presenza, 10), coalesce(c.punti_risultati, 5), coalesce(c.punti_gara, 15), coalesce(c.punti_miglioramento, 10)
    into v_pres, v_ris, v_gara, v_migl
    from (select 1) x left join punti_config c on c.squadra_id = v_sq;
  if p_evento = 'presenza' then v_p := v_pres; v_mot := 'Presenza all''allenamento';
  elsif p_evento = 'risultati' then v_p := v_ris; v_mot := 'Risultati inseriti';
  elsif p_evento = 'gara' then v_p := v_gara; v_mot := 'Gara completata';
  elsif p_evento = 'miglioramento' then v_p := v_migl; v_mot := 'Tempo migliorato';
  else return; end if;
  if v_p <= 0 then return; end if;
  insert into punti_movimenti (atleta_id, squadra_id, punti, motivo, riferimento, data)
    values (p_atleta, v_sq, v_p, v_mot, p_rif, coalesce(p_data, current_date))
    on conflict (atleta_id, riferimento) do nothing;
end $$;

create or replace function public.trg_punti_presenze() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stato = 'presente' then
    perform public.punti_assegna(new.atleta_id, 'presenza', 'presenza:' || new.data::text, new.data);
  else
    delete from punti_movimenti where atleta_id = new.atleta_id and riferimento = 'presenza:' || new.data::text;
  end if;
  return new;
end $$;
drop trigger if exists punti_presenze on presenze;
create trigger punti_presenze after insert or update on presenze
  for each row execute function public.trg_punti_presenze();

create or replace function public.trg_punti_allenamenti() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(jsonb_array_length(new.passaggi), 0) > 0 or new.tempo_totale is not null then
    perform public.punti_assegna(new.atleta_id, 'risultati', 'risultati:' || new.data_allenamento::text, new.data_allenamento);
  end if;
  return new;
end $$;
drop trigger if exists punti_allenamenti on allenamenti;
create trigger punti_allenamenti after insert or update on allenamenti
  for each row execute function public.trg_punti_allenamenti();

create or replace function public.trg_punti_gare() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nuovo numeric; v_prima numeric;
begin
  if new.tempo is null then return new; end if;
  perform public.punti_assegna(new.atleta_id, 'gara', 'gara:' || new.id::text, new.data_gara);
  v_nuovo := public.tempo_sec(new.tempo);
  if v_nuovo is not null then
    select min(public.tempo_sec(g.tempo)) into v_prima from gare g
      where g.atleta_id = new.atleta_id and g.distanza = new.distanza and g.stile = new.stile
        and g.id <> new.id and g.tempo is not null and g.data_gara <= new.data_gara;
    if v_prima is not null and v_nuovo < v_prima then
      perform public.punti_assegna(new.atleta_id, 'miglioramento', 'miglioramento:' || new.id::text, new.data_gara);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists punti_gare on gare;
create trigger punti_gare after insert or update of tempo on gare
  for each row execute function public.trg_punti_gare();

-- ---------- Apertura del premio: l'estrazione casuale la fa il server ----------
create or replace function public.apri_premio()
returns premi_atleta language plpgsql security definer set search_path = public as $$
declare v_sq uuid; v_soglia int; v_tot bigint; v_gia bigint; v_nome text; r premi_atleta;
begin
  select squadra_id into v_sq from profiles where id = auth.uid();
  if v_sq is null then raise exception 'Non sei in una squadra'; end if;
  select coalesce((select soglia_premio from punti_config where squadra_id = v_sq), 100) into v_soglia;
  select coalesce(sum(punti), 0) into v_tot from punti_movimenti where atleta_id = auth.uid();
  select count(*) into v_gia from premi_atleta where atleta_id = auth.uid();
  if v_tot / v_soglia <= v_gia then raise exception 'Non hai ancora un premio da aprire'; end if;
  select nome into v_nome from (
    select nome, -ln(1 - random()) / peso as k
    from premi_catalogo where squadra_id = v_sq and attivo and peso > 0
    order by k limit 1
  ) x;
  if v_nome is null then raise exception 'Il coach non ha ancora inserito premi'; end if;
  insert into premi_atleta (atleta_id, squadra_id, premio_nome) values (auth.uid(), v_sq, v_nome) returning * into r;
  return r;
end $$;
grant execute on function public.apri_premio() to authenticated;
