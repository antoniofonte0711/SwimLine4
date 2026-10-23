-- Migrazione 40 (23/10/2026): i registri su Google Fogli valgono per tutta la società.
-- Una chiave può essere legata a una società: allora contano tutti i suoi gruppi (anche quelli aggiunti dopo),
-- oltre al gruppo di partenza. Il registro allenamenti ha in più il nome del gruppo.

alter table public.registro_fogli add column if not exists societa_id uuid references public.societa(id) on delete set null;

-- Gruppi coperti da una chiave
create or replace function public.registro_gruppi(p_chiave text)
returns setof uuid language sql stable security definer set search_path = public as $$
  select s.id from squadre s join registro_fogli r
    on s.id = r.squadra_id or (r.societa_id is not null and s.societa_id = r.societa_id)
  where r.chiave = p_chiave and length(p_chiave) >= 32
$$;
revoke all on function public.registro_gruppi(text) from public, anon, authenticated;

create or replace function public.registro_presenze(p_chiave text, p_tipo text default 'presenze')
returns table (a text, b text, c text, d text)
language sql stable security definer set search_path = public as $$
  with atleti as (
    select p.id, trim(p.cognome) cognome, trim(p.nome) nome, extract(year from p.data_nascita)::int::text anno
    from profiles p
    where p.squadra_id in (select registro_gruppi(p_chiave)) and p.role = 'atleta' and p.eliminato_il is null
  )
  select lower(a.cognome) || '|' || coalesce(a.anno, '') || '|' || (pr.data - date '1899-12-30')::text,
         case pr.stato when 'presente' then 'P' when 'assente' then 'A' else 'G' end, null::text, null::text
  from presenze pr join atleti a on a.id = pr.atleta_id
  where p_tipo = 'presenze'
  union all
  select a.cognome, a.nome, a.anno, lower(a.cognome) || '|' || coalesce(a.anno, '')
  from atleti a
  where p_tipo = 'atleti'
$$;

drop function if exists public.registro_allenamenti(text);
create function public.registro_allenamenti(p_chiave text)
returns table (data date, gruppo text, titolo text, righe jsonb)
language sql stable security definer set search_path = public as $$
  select a.data, s.nome, a.titolo, a.righe
  from allenamenti_squadra a join squadre s on s.id = a.squadra_id
  where a.squadra_id in (select registro_gruppi(p_chiave)) and a.pubblicato and a.visibilita = 'squadra'
  order by a.data, s.nome
$$;
revoke all on function public.registro_allenamenti(text) from public;
grant execute on function public.registro_allenamenti(text) to anon, authenticated;
