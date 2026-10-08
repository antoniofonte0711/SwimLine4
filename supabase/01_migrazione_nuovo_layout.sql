-- ============================================
-- SwimLine4 — Migrazione per il nuovo layout (fase 1)
-- Incolla tutto nell'SQL Editor di Supabase e premi Run.
-- Si può eseguire più volte senza rompere nulla.
-- ============================================

-- ALLENAMENTI: ora ogni lavoro ha ripetizioni, stile e il risultato di ogni passaggio
alter table allenamenti add column if not exists ripetizioni integer;
alter table allenamenti add column if not exists stile text;
alter table allenamenti add column if not exists passaggi jsonb not null default '[]'::jsonb;
alter table allenamenti add column if not exists data_allenamento date;
alter table allenamenti alter column tempo_totale drop not null;

update allenamenti set data_allenamento = created_at::date where data_allenamento is null;
alter table allenamenti alter column data_allenamento set default current_date;

-- Eliminare un tempo (atleta i propri, coach e admin tutti)
drop policy if exists "atleta elimina i propri allenamenti" on allenamenti;
create policy "atleta elimina i propri allenamenti"
  on allenamenti for delete using (auth.uid() = atleta_id);

drop policy if exists "coach e admin eliminano gli allenamenti" on allenamenti;
create policy "coach e admin eliminano gli allenamenti"
  on allenamenti for delete using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );

-- VIDEO: elenco unico dei video di allenamenti e gare
create table if not exists video (
  id uuid default gen_random_uuid() primary key,
  atleta_id uuid references profiles(id) on delete cascade,
  tipo text not null default 'allenamento', -- 'allenamento' | 'gara'
  riferimento_id uuid,                      -- id dell'allenamento o della gara collegata
  data date default current_date,
  commento text,
  video_url text,
  nome_file text,
  created_at timestamp with time zone default now()
);

alter table video enable row level security;

drop policy if exists "atleta vede i propri video" on video;
create policy "atleta vede i propri video"
  on video for select using (auth.uid() = atleta_id);

drop policy if exists "atleta inserisce i propri video" on video;
create policy "atleta inserisce i propri video"
  on video for insert with check (auth.uid() = atleta_id);

drop policy if exists "atleta elimina i propri video" on video;
create policy "atleta elimina i propri video"
  on video for delete using (auth.uid() = atleta_id);

drop policy if exists "coach e admin vedono tutti i video" on video;
create policy "coach e admin vedono tutti i video"
  on video for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'admin'))
  );
