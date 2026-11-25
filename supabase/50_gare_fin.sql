-- 50: Gare FIN. Il coach sceglie la manifestazione dai comunicati FIN Lombardia e la città; l'app cerca gli atleti
-- della squadra per nome negli iscritti (programma FIN) e salva qui le loro gare.
-- Bozza: la vede solo il coach. Pubblicata: per le iscrizioni sicure nascono le gare degli atleti (tabella gare),
-- quelle "da confermare" (stesso nome con società diverse) le conferma l'atleta ("Sei tu?").

create table if not exists public.manifestazioni_fin (
  id uuid default gen_random_uuid() primary key,
  squadra_id uuid not null references public.squadre(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 200),
  citta text not null check (length(trim(citta)) between 1 and 80),
  impianto text check (length(impianto) <= 200),
  vasca smallint not null default 25 check (vasca in (25, 50)),
  documento_url text check (length(documento_url) <= 500),
  programma_url text check (length(programma_url) <= 500),
  pubblicata boolean not null default false,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now()
);
create index if not exists manifestazioni_fin_squadra on public.manifestazioni_fin (squadra_id, created_at desc);

create table if not exists public.iscrizioni_fin (
  id uuid default gen_random_uuid() primary key,
  manifestazione_id uuid not null references public.manifestazioni_fin(id) on delete cascade,
  atleta_id uuid not null references public.profiles(id) on delete cascade,
  nome_fin text not null check (length(nome_fin) <= 120),
  anno smallint,
  societa text check (length(societa) <= 200),
  distanza integer not null check (distanza between 25 and 1500),
  stile text not null check (length(stile) <= 40),
  sesso text check (sesso in ('M', 'F')),
  categoria text check (length(categoria) <= 60),
  data date,
  orario text check (orario ~ '^\d{2}:\d{2}$'),
  tempo_iscrizione text check (length(tempo_iscrizione) <= 20),
  stato text not null default 'confermata' check (stato in ('confermata', 'da_confermare')),
  gara_id uuid references public.gare(id) on delete set null,
  created_at timestamp with time zone not null default now()
);
create index if not exists iscrizioni_fin_manifestazione on public.iscrizioni_fin (manifestazione_id);
create index if not exists iscrizioni_fin_atleta on public.iscrizioni_fin (atleta_id, stato);

alter table public.manifestazioni_fin enable row level security;
alter table public.iscrizioni_fin enable row level security;

-- manifestazioni: il coach (e l'admin) tutto; gli atleti della squadra le leggono quando sono pubblicate
drop policy if exists "manifestazioni fin lettura" on public.manifestazioni_fin;
create policy "manifestazioni fin lettura" on public.manifestazioni_fin for select to authenticated
  using (sono_coach_squadra(squadra_id) or (pubblicata and sono_in_squadra(squadra_id)));
drop policy if exists "manifestazioni fin coach" on public.manifestazioni_fin;
create policy "manifestazioni fin coach" on public.manifestazioni_fin for all to authenticated
  using (sono_coach_squadra(squadra_id)) with check (sono_coach_squadra(squadra_id));

-- iscrizioni: il coach della squadra tutto; l'atleta legge le sue quando la manifestazione è pubblicata
drop policy if exists "iscrizioni fin lettura" on public.iscrizioni_fin;
create policy "iscrizioni fin lettura" on public.iscrizioni_fin for select to authenticated
  using (exists (select 1 from manifestazioni_fin m where m.id = manifestazione_id
    and (sono_coach_squadra(m.squadra_id) or (m.pubblicata and atleta_id = (select auth.uid())))));
drop policy if exists "iscrizioni fin coach" on public.iscrizioni_fin;
create policy "iscrizioni fin coach" on public.iscrizioni_fin for all to authenticated
  using (exists (select 1 from manifestazioni_fin m where m.id = manifestazione_id and sono_coach_squadra(m.squadra_id)))
  with check (exists (select 1 from manifestazioni_fin m join profiles p on p.id = atleta_id
    where m.id = manifestazione_id and sono_coach_squadra(m.squadra_id) and p.squadra_id = m.squadra_id));

-- L'atleta scrive tempo e passaggi delle gare che il coach gli ha messo (prima poteva solo il coach)
drop policy if exists "atleta modifica le proprie gare" on public.gare;
create policy "atleta modifica le proprie gare" on public.gare for update to authenticated
  using ((select auth.uid()) = atleta_id) with check ((select auth.uid()) = atleta_id);

-- Crea le gare (tabella gare) delle iscrizioni confermate che non ne hanno ancora una
create or replace function public.crea_gare_fin(p_manifestazione uuid, p_atleta uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_m record; v_i record; v_id uuid; v_n integer := 0;
begin
  select * into v_m from manifestazioni_fin where id = p_manifestazione;
  if v_m.id is null or not v_m.pubblicata then return 0; end if;
  for v_i in
    select * from iscrizioni_fin where manifestazione_id = p_manifestazione and stato = 'confermata' and gara_id is null
      and (p_atleta is null or atleta_id = p_atleta)
    order by atleta_id, data nulls last, orario nulls last
  loop
    insert into gare (atleta_id, nome_gara, distanza, stile, data_gara, orario, luogo, vasca, tempo_iscrizione, passaggi, ordine, note)
    values (v_i.atleta_id, v_m.nome, v_i.distanza, v_i.stile, coalesce(v_i.data, current_date), v_i.orario,
      v_m.citta || coalesce(' · ' || v_m.impianto, ''), v_m.vasca, v_i.tempo_iscrizione, '[]'::jsonb,
      (select count(*) from iscrizioni_fin x where x.manifestazione_id = p_manifestazione and x.atleta_id = v_i.atleta_id
        and x.gara_id is not null)::smallint,
      'FIN · ' || coalesce(v_i.societa, ''))
    returning id into v_id;
    update iscrizioni_fin set gara_id = v_id where id = v_i.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.crea_gare_fin(uuid, uuid) from public, anon, authenticated;

-- Coach: pubblica la manifestazione (gli atleti la vedono e nascono le loro gare)
create or replace function public.pubblica_manifestazione_fin(p_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_squadra uuid;
begin
  select squadra_id into v_squadra from manifestazioni_fin where id = p_id;
  if v_squadra is null or not sono_coach_squadra(v_squadra) then raise exception 'Solo il coach della squadra'; end if;
  update manifestazioni_fin set pubblicata = true where id = p_id;
  return crea_gare_fin(p_id);
end $$;
revoke all on function public.pubblica_manifestazione_fin(uuid) from public, anon;
grant execute on function public.pubblica_manifestazione_fin(uuid) to authenticated;

-- Atleta: "Sei tu?" — sceglie con quale società è iscritto (null = nessuna, non sono io)
create or replace function public.conferma_iscrizioni_fin(p_manifestazione uuid, p_societa text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_io uuid := auth.uid();
begin
  if v_io is null then raise exception 'Non autenticato'; end if;
  if not exists (select 1 from manifestazioni_fin where id = p_manifestazione and pubblicata) then raise exception 'Manifestazione non pubblicata'; end if;
  delete from iscrizioni_fin where manifestazione_id = p_manifestazione and atleta_id = v_io and stato = 'da_confermare'
    and (p_societa is null or societa is distinct from p_societa);
  update iscrizioni_fin set stato = 'confermata' where manifestazione_id = p_manifestazione and atleta_id = v_io and stato = 'da_confermare';
  return crea_gare_fin(p_manifestazione, v_io);
end $$;
revoke all on function public.conferma_iscrizioni_fin(uuid, text) from public, anon;
grant execute on function public.conferma_iscrizioni_fin(uuid, text) to authenticated;
