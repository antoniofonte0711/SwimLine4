-- Migrazione 40 (25/10/2026): quanti utenti sono dentro SwimLine in diretta, per il grafico nel Pannello admin.
-- - attivita_minuti: un segno per persona e minuto mentre l'app è aperta (lo stesso segnale di segnala_attivita); teniamo 2 giorni
-- - admin_in_diretta: per ogni minuto delle ultime p_minuti, quante persone avevano l'app aperta, e chi è dentro adesso
-- Si può rieseguire.

create table if not exists public.attivita_minuti (
  minuto timestamp with time zone not null,
  utente_id uuid not null references public.profiles(id) on delete cascade,
  primary key (minuto, utente_id)
);
alter table public.attivita_minuti enable row level security; -- nessuna policy: si passa solo dalle funzioni

-- Come nella 34, più il segno del minuto
create or replace function public.segnala_attivita(p_apertura boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if auth.uid() is null then return; end if;
  insert into attivita_giornaliera (utente_id, giorno, minuti, aperture, ultimo_segnale)
  values (auth.uid(), v_oggi, 1, case when p_apertura then 1 else 0 end, now())
  on conflict (utente_id, giorno) do update set
    minuti = attivita_giornaliera.minuti + case when now() - attivita_giornaliera.ultimo_segnale >= interval '45 seconds' then 1 else 0 end,
    aperture = attivita_giornaliera.aperture + case when p_apertura then 1 else 0 end,
    ultimo_segnale = now();
  insert into attivita_minuti (minuto, utente_id) values (date_trunc('minute', now()), auth.uid())
  on conflict do nothing;
  -- teniamo 90 giorni di totali e 2 giorni di minuti
  delete from attivita_giornaliera where utente_id = auth.uid() and giorno < v_oggi - 90;
  if p_apertura then delete from attivita_minuti where minuto < now() - interval '2 days'; end if;
end $$;
revoke all on function public.segnala_attivita(boolean) from public, anon;
grant execute on function public.segnala_attivita(boolean) to authenticated;

-- Il segnale arriva ogni 60 secondi, non sempre nello stesso minuto: una persona conta come dentro
-- in un minuto se ha mandato un segnale in quel minuto o in quello prima.
create or replace function public.admin_in_diretta(p_minuti integer default 60)
returns table(minuto timestamp with time zone, utenti integer, persone uuid[])
language plpgsql stable security definer set search_path = public as $$
declare v_ora timestamp with time zone := date_trunc('minute', now());
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  return query
    select s.m, count(distinct a.utente_id)::integer,
      coalesce(array_agg(distinct a.utente_id) filter (where a.utente_id is not null), '{}')
    from generate_series(v_ora - make_interval(mins => greatest(least(p_minuti, 2880), 10) - 1), v_ora, interval '1 minute') s(m)
    left join attivita_minuti a on a.minuto between s.m - interval '1 minute' and s.m
    group by s.m
    order by s.m;
end $$;
revoke all on function public.admin_in_diretta(integer) from public, anon;
grant execute on function public.admin_in_diretta(integer) to authenticated;
