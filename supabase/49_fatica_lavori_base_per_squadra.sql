-- ============================================
-- 49 · "Quanto stanca" dei lavori di base, per squadra
-- I lavori di base (A2, B1, C1…) hanno i pesi impostati da noi.
-- Il coach (o l'admin) può dire che per la sua squadra un lavoro di base stanca di più o di meno:
-- il valore sta nella riga della spunta (tipi_lavoro_squadra.peso). Vuoto = il valore nostro.
-- Permessi: gli stessi della spunta (coach della squadra fuori stagione chiusa, admin).
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

alter table public.tipi_lavoro_squadra
  add column if not exists peso numeric(4, 2);

alter table public.tipi_lavoro_squadra
  drop constraint if exists tipi_lavoro_squadra_peso_check;
alter table public.tipi_lavoro_squadra
  add constraint tipi_lavoro_squadra_peso_check check (peso is null or (peso > 0 and peso <= 6));
