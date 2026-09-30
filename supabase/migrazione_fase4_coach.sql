-- ============================================
-- SwimLine4 — Migrazione fase 4 (visuale coach)
-- Incolla tutto nell'SQL Editor di Supabase e premi Run.
-- Si può eseguire più volte. Richiede la fase 3 già eseguita.
-- Crea l'allenamento della giornata che il coach prepara per la squadra.
-- ============================================
create table if not exists allenamenti_squadra (
  id uuid default gen_random_uuid() primary key,
  squadra_id uuid references squadre(id) on delete cascade not null,
  coach_id uuid references profiles(id),
  data date not null,
  titolo text,
  righe jsonb not null default '[]'::jsonb,
  visibilita text not null default 'squadra' check (visibilita in ('coach', 'squadra')),
  pubblicato boolean not null default false,
  created_at timestamp with time zone default now(),
  unique (squadra_id, data)
);
alter table allenamenti_squadra enable row level security;

drop policy if exists "coach gestisce il piano della squadra" on allenamenti_squadra;
create policy "coach gestisce il piano della squadra"
  on allenamenti_squadra for all
  using (
    coalesce(public.is_admin(), false)
    or exists (select 1 from squadre s where s.id = squadra_id and s.coach_id = auth.uid())
  )
  with check (
    coalesce(public.is_admin(), false)
    or exists (select 1 from squadre s where s.id = squadra_id and s.coach_id = auth.uid())
  );

-- Gli atleti vedono solo i piani pubblicati per tutta la squadra, della propria squadra
drop policy if exists "atleta vede il piano pubblicato" on allenamenti_squadra;
create policy "atleta vede il piano pubblicato"
  on allenamenti_squadra for select
  using (pubblicato = true and visibilita = 'squadra' and squadra_id = public.mia_squadra());
