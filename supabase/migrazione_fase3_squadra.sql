-- ============================================
-- SwimLine4 — Migrazione fase 3 (squadra e visuale coach)
-- Incolla tutto nell'SQL Editor di Supabase e premi Run.
-- Si può eseguire più volte senza rompere nulla.
-- Dopo questa: il coach vede SOLO gli atleti della propria squadra
-- (prima vedeva gli allenamenti e le gare di tutti).
-- ============================================

-- Funzioni di aiuto
create or replace function public.mia_squadra()
returns uuid language sql security definer stable set search_path = public as $$
  select squadra_id from profiles where id = auth.uid()
$$;

create or replace function public.sono_coach_di(atleta uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(public.is_admin(), false) or exists (
    select 1 from profiles p
    join squadre s on s.id = p.squadra_id
    where p.id = atleta and s.coach_id = auth.uid()
  )
$$;

-- PROFILI: il coach vede gli atleti della sua squadra
drop policy if exists "coach vede gli atleti della sua squadra" on profiles;
create policy "coach vede gli atleti della sua squadra"
  on profiles for select using (
    squadra_id in (select id from squadre where coach_id = auth.uid())
  );

-- COMPAGNI: nome e cognome dei compagni di squadra (niente data di nascita o altri dati)
create or replace view public.compagni_squadra as
  select id, nome, cognome, squadra_id
  from profiles
  where role = 'atleta' and squadra_id is not null and squadra_id = public.mia_squadra();
grant select on public.compagni_squadra to authenticated;

-- ALLENAMENTI: il coach vede e gestisce solo la sua squadra (l'admin tutto)
drop policy if exists "coach e admin vedono tutti gli allenamenti" on allenamenti;
drop policy if exists "coach e admin modificano tutti gli allenamenti" on allenamenti;
drop policy if exists "coach e admin eliminano gli allenamenti" on allenamenti;
drop policy if exists "coach vede gli allenamenti della squadra" on allenamenti;
drop policy if exists "coach modifica gli allenamenti della squadra" on allenamenti;
drop policy if exists "coach elimina gli allenamenti della squadra" on allenamenti;
create policy "coach vede gli allenamenti della squadra"
  on allenamenti for select using (public.sono_coach_di(atleta_id));
create policy "coach modifica gli allenamenti della squadra"
  on allenamenti for update using (public.sono_coach_di(atleta_id));
create policy "coach elimina gli allenamenti della squadra"
  on allenamenti for delete using (public.sono_coach_di(atleta_id));

-- GARE: come sopra, e in più gli atleti vedono le gare dei compagni di squadra
drop policy if exists "coach e admin vedono tutte le gare" on gare;
drop policy if exists "coach e admin modificano tutte le gare" on gare;
drop policy if exists "coach e admin eliminano le gare" on gare;
drop policy if exists "coach vede le gare della squadra" on gare;
drop policy if exists "coach modifica le gare della squadra" on gare;
drop policy if exists "coach elimina le gare della squadra" on gare;
drop policy if exists "atleta vede le gare dei compagni" on gare;
create policy "coach vede le gare della squadra"
  on gare for select using (public.sono_coach_di(atleta_id));
create policy "coach modifica le gare della squadra"
  on gare for update using (public.sono_coach_di(atleta_id));
create policy "coach elimina le gare della squadra"
  on gare for delete using (public.sono_coach_di(atleta_id));
create policy "atleta vede le gare dei compagni"
  on gare for select using (atleta_id in (select id from public.compagni_squadra));

-- VIDEO
drop policy if exists "coach e admin vedono tutti i video" on video;
drop policy if exists "coach vede i video della squadra" on video;
create policy "coach vede i video della squadra"
  on video for select using (public.sono_coach_di(atleta_id));

-- PRESENZE: le segna solo il coach della squadra (o l'admin)
drop policy if exists "coach e admin vedono le presenze" on presenze;
drop policy if exists "coach e admin segnano le presenze" on presenze;
drop policy if exists "coach e admin modificano le presenze" on presenze;
drop policy if exists "coach e admin eliminano le presenze" on presenze;
drop policy if exists "coach vede le presenze della squadra" on presenze;
drop policy if exists "coach segna le presenze della squadra" on presenze;
drop policy if exists "coach modifica le presenze della squadra" on presenze;
drop policy if exists "coach elimina le presenze della squadra" on presenze;
create policy "coach vede le presenze della squadra"
  on presenze for select using (public.sono_coach_di(atleta_id));
create policy "coach segna le presenze della squadra"
  on presenze for insert with check (public.sono_coach_di(atleta_id));
create policy "coach modifica le presenze della squadra"
  on presenze for update using (public.sono_coach_di(atleta_id));
create policy "coach elimina le presenze della squadra"
  on presenze for delete using (public.sono_coach_di(atleta_id));
