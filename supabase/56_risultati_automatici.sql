-- ============================================
-- SwimLine4 — 56: i tempi ufficiali delle gare arrivano da soli — 28 novembre 2026
-- La funzione "risultati" (supabase/functions/risultati) li legge da nuoto.ficr.it e scrive tempo,
-- passaggi, posto in batteria e posto in classifica (di categoria, o unica se la gara non ha categorie).
-- - gare.piazzamento: { batteria, posto_batteria, categoria, posizione, classificati }
-- - il piazzamento lo scrive solo il sistema: dall'app non si può inventare; se qualcuno cambia tempo,
--   giorno, distanza o stile, il piazzamento si cancella (non vale più)
-- - ogni 20 minuti il database chiama la funzione, ma solo se c'è una gara degli ultimi 7 giorni senza piazzamento
-- Si può rieseguire. Prima pubblicare la funzione "risultati" con verify_jwt = false.
-- ============================================

alter table public.gare add column if not exists piazzamento jsonb;

create or replace function public.trg_gare_piazzamento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if; -- il sistema (funzione "risultati", ripristini)
  if tg_op = 'INSERT' then
    new.piazzamento := null;
  elsif (new.tempo, new.data_gara, new.distanza, new.stile) is distinct from (old.tempo, old.data_gara, old.distanza, old.stile) then
    new.piazzamento := null;
  else
    new.piazzamento := old.piazzamento;
  end if;
  return new;
end $$;
revoke all on function public.trg_gare_piazzamento() from public, anon, authenticated;
drop trigger if exists gare_piazzamento on public.gare;
create trigger gare_piazzamento before insert or update on public.gare
  for each row execute function public.trg_gare_piazzamento();

create or replace function public.chiama_risultati()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_chiave text; v_oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if not exists (select 1 from gare where piazzamento is null and data_gara between v_oggi - 7 and v_oggi) then return; end if;
  select valore into v_url from segreti where chiave = 'url_funzioni';
  select valore into v_chiave from segreti where chiave = 'chiave_interna';
  if v_url is null or v_chiave is null then return; end if;
  perform net.http_post(url := v_url || '/risultati', body := jsonb_build_object('interno', v_chiave),
    headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 60000);
end $$;
revoke all on function public.chiama_risultati() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'swimline4-risultati-gare';
select cron.schedule('swimline4-risultati-gare', '*/20 * * * *', 'select public.chiama_risultati()');
