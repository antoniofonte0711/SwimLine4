-- ============================================
-- SwimLine4 — Schema database e permessi (RLS)
-- Incolla questo nell'SQL Editor di Supabase
-- ============================================

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text,
  cognome text,
  data_nascita date,
  role text not null default 'atleta', -- 'atleta' | 'coach' | 'genitore' | 'admin'
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "vedi il tuo profilo"
  on profiles for select
  using (auth.uid() = id);

create policy "admin vede tutti i profili"
  on profiles for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin modifica tutti i profili"
  on profiles for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- TABELLA ALLENAMENTI
create table if not exists allenamenti (
  id uuid default gen_random_uuid() primary key,
  atleta_id uuid references profiles(id) on delete cascade,
  tipo_lavoro text,
  distanza integer,
  parziale_50 text,
  tempo_totale text not null,
  commento text,
  video_url text,
  created_at timestamp with time zone default now()
);

alter table allenamenti enable row level security;

create policy "atleta vede i propri allenamenti"
  on allenamenti for select using (auth.uid() = atleta_id);

create policy "atleta inserisce i propri allenamenti"
  on allenamenti for insert with check (auth.uid() = atleta_id);

create policy "coach e admin vedono tutti gli allenamenti"
  on allenamenti for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

create policy "coach e admin modificano tutti gli allenamenti"
  on allenamenti for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

-- TABELLA GARE
create table if not exists gare (
  id uuid default gen_random_uuid() primary key,
  atleta_id uuid references profiles(id) on delete cascade,
  nome_gara text,
  distanza integer,
  stile text,
  tempo text not null,
  data_gara date,
  created_at timestamp with time zone default now()
);

alter table gare enable row level security;

create policy "atleta vede le proprie gare"
  on gare for select using (auth.uid() = atleta_id);

create policy "atleta inserisce le proprie gare"
  on gare for insert with check (auth.uid() = atleta_id);

create policy "coach e admin vedono tutte le gare"
  on gare for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

create policy "coach e admin modificano tutte le gare"
  on gare for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

-- STORAGE per i video (crea anche il bucket "video-allenamenti"
-- dalla sezione Storage dell'interfaccia Supabase, come privato)
