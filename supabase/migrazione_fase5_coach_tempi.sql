-- ============================================
-- SwimLine4 — Fase 5: il coach inserisce tempi per i suoi atleti
-- Incolla tutto nell'SQL Editor di Supabase e premi Run (si può rieseguire).
-- Richiede la fase 3 (funzione sono_coach_di).
-- ============================================
drop policy if exists "coach inserisce allenamenti alla squadra" on allenamenti;
create policy "coach inserisce allenamenti alla squadra"
  on allenamenti for insert with check (public.sono_coach_di(atleta_id));

drop policy if exists "coach inserisce gare alla squadra" on gare;
create policy "coach inserisce gare alla squadra"
  on gare for insert with check (public.sono_coach_di(atleta_id));

-- Tempo di iscrizione della gara (facoltativo), inserito dal coach
alter table gare add column if not exists tempo_iscrizione text;
