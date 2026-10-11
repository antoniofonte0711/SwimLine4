-- ============================================
-- SwimLine4 — 26: i punti seguono anche le cancellazioni — 11 ottobre 2026
-- Prima: cancellando i tempi di un giorno, una gara o una presenza, i punti guadagnati restavano
-- (e inserendo e cancellando gare si potevano accumulare punti). Ora si tolgono insieme al dato.
-- In fondo: pulizia dei punti già rimasti senza il loro dato.
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

-- Tempi di allenamento: il punto "risultati" del giorno resta finché quel giorno c'è almeno un tempo
create or replace function public.trg_punti_allenamenti_tolti()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from allenamenti a
    where a.atleta_id = old.atleta_id and a.data_allenamento = old.data_allenamento
      and (coalesce(jsonb_array_length(a.passaggi), 0) > 0 or a.tempo_totale is not null)
  ) then
    delete from punti_movimenti where atleta_id = old.atleta_id and riferimento = 'risultati:' || old.data_allenamento::text;
  end if;
  return old;
end $$;
drop trigger if exists punti_allenamenti_tolti on public.allenamenti;
create trigger punti_allenamenti_tolti after delete on public.allenamenti
  for each row execute function public.trg_punti_allenamenti_tolti();

-- Gara cancellata: via i punti della gara e del miglioramento
create or replace function public.trg_punti_gare_tolte()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from punti_movimenti where atleta_id = old.atleta_id
    and riferimento in ('gara:' || old.id::text, 'miglioramento:' || old.id::text);
  return old;
end $$;
drop trigger if exists punti_gare_tolte on public.gare;
create trigger punti_gare_tolte after delete on public.gare
  for each row execute function public.trg_punti_gare_tolte();

-- Presenza cancellata (non solo cambiata in assente)
create or replace function public.trg_punti_presenze_tolte()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from punti_movimenti where atleta_id = old.atleta_id and riferimento = 'presenza:' || old.data::text;
  return old;
end $$;
drop trigger if exists punti_presenze_tolte on public.presenze;
create trigger punti_presenze_tolte after delete on public.presenze
  for each row execute function public.trg_punti_presenze_tolte();

revoke all on function public.trg_punti_allenamenti_tolti() from public, anon, authenticated;
revoke all on function public.trg_punti_gare_tolte() from public, anon, authenticated;
revoke all on function public.trg_punti_presenze_tolte() from public, anon, authenticated;

-- Pulizia: punti rimasti senza il loro dato
delete from punti_movimenti m where m.riferimento like 'risultati:%' and not exists (
  select 1 from allenamenti a where a.atleta_id = m.atleta_id and 'risultati:' || a.data_allenamento::text = m.riferimento
    and (coalesce(jsonb_array_length(a.passaggi), 0) > 0 or a.tempo_totale is not null));
delete from punti_movimenti m where (m.riferimento like 'gara:%' or m.riferimento like 'miglioramento:%') and not exists (
  select 1 from gare g where m.riferimento in ('gara:' || g.id::text, 'miglioramento:' || g.id::text));
delete from punti_movimenti m where m.riferimento like 'presenza:%' and not exists (
  select 1 from presenze x where x.atleta_id = m.atleta_id and 'presenza:' || x.data::text = m.riferimento and x.stato = 'presente');
