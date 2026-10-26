-- ============================================
-- SwimLine4 — 44: il registro su Fogli conta anche l'admin che nuota in squadra (26 ottobre 2026)
-- Nell'app le presenze si segnano per atleti e admin (l'admin è anche atleta); il registro prendeva solo
-- role = 'atleta', quindi Antonio Fonte, segnato presente, non arrivava nel foglio.
-- Si può rieseguire.
-- ============================================
create or replace function public.registro_presenze(p_chiave text, p_tipo text default 'presenze')
returns table(a text, b text, c text, d text) language sql stable security definer set search_path = public as $$
  with atleti as (
    select p.id, trim(p.cognome) cognome, trim(p.nome) nome, extract(year from p.data_nascita)::int::text anno
    from profiles p
    where p.squadra_id in (select registro_gruppi(p_chiave)) and p.role in ('atleta', 'admin') and p.eliminato_il is null
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
