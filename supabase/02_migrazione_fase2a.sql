-- ============================================
-- SwimLine4 — Migrazione fase 2A (gare con passaggi + presenze)
-- Incolla tutto nell'SQL Editor di Supabase e premi Run.
-- Si può eseguire più volte senza rompere nulla.
-- ============================================

-- GARE: passaggi di ogni gara
alter table gare add column if not exists passaggi jsonb not null default '[]'::jsonb;

-- GARE: stile sempre con la maiuscola (come negli allenamenti)
update gare
set stile = upper(left(stile, 1)) || substr(stile, 2)
where stile is not null and stile <> upper(left(stile, 1)) || substr(stile, 2);

-- GARE: poter eliminare (atleta le proprie, coach e admin tutte)
drop policy if exists "atleta elimina le proprie gare" on gare;
create policy "atleta elimina le proprie gare"
  on gare for delete using (auth.uid() = atleta_id);

drop policy if exists "coach e admin eliminano le gare" on gare;
create policy "coach e admin eliminano le gare"
  on gare for delete using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

-- PRESENZE: le segna solo il coach (o l'admin), l'atleta vede le proprie
create table if not exists presenze (
  id uuid default gen_random_uuid() primary key,
  atleta_id uuid references profiles(id) on delete cascade not null,
  data date not null,
  stato text not null check (stato in ('presente', 'assente', 'non_penale')),
  segnato_da uuid references profiles(id),
  created_at timestamp with time zone default now(),
  unique (atleta_id, data)
);

alter table presenze enable row level security;

drop policy if exists "atleta vede le proprie presenze" on presenze;
create policy "atleta vede le proprie presenze"
  on presenze for select using (auth.uid() = atleta_id);

drop policy if exists "coach e admin vedono le presenze" on presenze;
create policy "coach e admin vedono le presenze"
  on presenze for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

drop policy if exists "coach e admin segnano le presenze" on presenze;
create policy "coach e admin segnano le presenze"
  on presenze for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

drop policy if exists "coach e admin modificano le presenze" on presenze;
create policy "coach e admin modificano le presenze"
  on presenze for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

drop policy if exists "coach e admin eliminano le presenze" on presenze;
create policy "coach e admin eliminano le presenze"
  on presenze for delete using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );
