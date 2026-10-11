-- ============================================
-- SwimLine4 — 23: Tipi di lavoro per squadra — 11 ottobre 2026
-- Non tutti i coach usano le stesse sigle (A1, EN2…): ogni squadra sceglie i suoi lavori.
-- - tipi_lavoro: lavori aggiunti oltre a quelli di base (A2, B1… che restano nel codice).
--     squadra_id vuoto = elenco generale (solo l'admin), altrimenti solo per quella squadra.
--     peso = quanto stanca un metro (A2 = 1), gruppo = dove va la fatica, colore = nome della tinta.
-- - tipi_lavoro_squadra: la spunta di ogni lavoro per ogni squadra (acceso / spento).
--     Senza riga: i lavori di base e quelli della squadra sono accesi, quelli generali aggiunti spenti.
-- Li gestiscono il coach della squadra e l'admin; li leggono tutti quelli della squadra.
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

create table if not exists public.tipi_lavoro (
  id uuid primary key default gen_random_uuid(),
  squadra_id uuid references public.squadre(id) on delete cascade,
  sigla text not null check (length(trim(sigla)) between 1 and 20),
  descrizione text not null default '' check (length(descrizione) <= 200),
  gruppo text not null check (gruppo in ('recupero', 'aerobico', 'soglia', 'lattacido', 'velocita')),
  peso numeric(4, 2) not null check (peso > 0 and peso <= 6),
  colore text not null default 'cielo' check (colore ~ '^[a-z]{2,12}$'),
  creato_da uuid default auth.uid(),
  created_at timestamp with time zone default now()
);
-- una sigla sola per squadra, e una sola nell'elenco generale
create unique index if not exists tipi_lavoro_sigla_squadra on public.tipi_lavoro (squadra_id, lower(trim(sigla))) where squadra_id is not null;
create unique index if not exists tipi_lavoro_sigla_generale on public.tipi_lavoro (lower(trim(sigla))) where squadra_id is null;

create table if not exists public.tipi_lavoro_squadra (
  squadra_id uuid not null references public.squadre(id) on delete cascade,
  sigla text not null,
  attivo boolean not null,
  aggiornato timestamp with time zone default now(),
  primary key (squadra_id, sigla)
);

-- Chi può cambiare i lavori di una squadra: il suo coach (non a stagione chiusa) e l'admin
create or replace function public.gestisce_lavori(p_squadra uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.is_admin(), false)
      or (public.sono_coach_squadra(p_squadra) and not public.regola_squadra(p_squadra, 's_sola'))
$$;
revoke all on function public.gestisce_lavori(uuid) from public, anon;
grant execute on function public.gestisce_lavori(uuid) to authenticated;

alter table public.tipi_lavoro enable row level security;
drop policy if exists "tipi_lavoro lettura" on public.tipi_lavoro;
create policy "tipi_lavoro lettura" on public.tipi_lavoro for SELECT to authenticated
  using (squadra_id is null or (select is_admin()) or sono_in_squadra(squadra_id) or sono_coach_squadra(squadra_id));
drop policy if exists "tipi_lavoro modifica" on public.tipi_lavoro;
create policy "tipi_lavoro modifica" on public.tipi_lavoro for ALL to authenticated
  using (case when squadra_id is null then (select is_admin()) else gestisce_lavori(squadra_id) end)
  with check (case when squadra_id is null then (select is_admin()) else gestisce_lavori(squadra_id) end);

alter table public.tipi_lavoro_squadra enable row level security;
drop policy if exists "tipi_lavoro_squadra lettura" on public.tipi_lavoro_squadra;
create policy "tipi_lavoro_squadra lettura" on public.tipi_lavoro_squadra for SELECT to authenticated
  using ((select is_admin()) or sono_in_squadra(squadra_id) or sono_coach_squadra(squadra_id));
drop policy if exists "tipi_lavoro_squadra modifica" on public.tipi_lavoro_squadra;
create policy "tipi_lavoro_squadra modifica" on public.tipi_lavoro_squadra for ALL to authenticated
  using (gestisce_lavori(squadra_id))
  with check (gestisce_lavori(squadra_id));

grant select, insert, update, delete on public.tipi_lavoro, public.tipi_lavoro_squadra to authenticated;
