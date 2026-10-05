-- ============================================
-- SwimLine4 — Migrazione fase 8
-- Incolla tutto nell'SQL Editor di Supabase e premi Run (si può rieseguire).
-- Richiede la fase 7. Permette all'admin di mettere anche se stesso in squadra
-- come atleta (il tuo account ha ruolo "admin", per questo prima non compariva).
-- ============================================

drop function if exists public.atleti_disponibili();
create or replace function public.atleti_disponibili()
returns table (id uuid, nome text, cognome text, nella_mia_squadra boolean, sono_io boolean)
language sql security definer stable set search_path = public as $$
  select p.id, p.nome, p.cognome,
         (p.squadra_id is not null and p.squadra_id in (select s.id from squadre s where s.coach_id = auth.uid())),
         (p.id = auth.uid())
  from profiles p
  where (p.role = 'atleta' or (p.id = auth.uid() and coalesce(public.is_admin(), false)))
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role in ('coach', 'admin'))
    and (
      p.squadra_id is null
      or p.squadra_id in (select s.id from squadre s where s.coach_id = auth.uid())
      or coalesce(public.is_admin(), false)
    )
  order by (p.id = auth.uid()) desc, p.cognome, p.nome
$$;
grant execute on function public.atleti_disponibili() to authenticated;

create or replace function public.aggiungi_atleta_squadra(p_atleta uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_squadra uuid;
begin
  if not exists (select 1 from profiles me where me.id = auth.uid() and me.role in ('coach', 'admin')) then
    raise exception 'Non hai i permessi per aggiungere atleti';
  end if;
  select id into v_squadra from squadre where coach_id = auth.uid() limit 1;
  if v_squadra is null then
    raise exception 'Nessuna squadra: creala prima dal Profilo';
  end if;
  if not exists (
    select 1 from profiles
    where id = p_atleta
      and (
        (role = 'atleta' and (squadra_id is null or squadra_id = v_squadra or coalesce(public.is_admin(), false)))
        or (id = auth.uid() and coalesce(public.is_admin(), false))
      )
  ) then
    raise exception 'Questo atleta non è disponibile (è già in un''altra squadra)';
  end if;
  update profiles set squadra_id = v_squadra where id = p_atleta;
end $$;
grant execute on function public.aggiungi_atleta_squadra(uuid) to authenticated;

-- I compagni di squadra includono anche l'admin che si è aggiunto come atleta
create or replace view public.compagni_squadra as
  select id, nome, cognome, squadra_id
  from profiles
  where role in ('atleta', 'admin') and squadra_id is not null and squadra_id = public.mia_squadra();
grant select on public.compagni_squadra to authenticated;
