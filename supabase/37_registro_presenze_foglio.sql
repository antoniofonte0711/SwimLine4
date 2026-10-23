-- Migrazione 37 (23/10/2026): registro presenze su Google Fogli.
-- Il foglio della squadra legge le presenze dall'app con =IMPORTDATA("…/api/registro-presenze?k=CHIAVE").
-- La chiave sta solo qui e nel foglio (privato): chi non la conosce non legge nulla.
-- Gli atleti si riconoscono nel foglio da cognome + anno di nascita: nell'app non si inserisce nessun nome.

create table if not exists public.registro_fogli (
  squadra_id uuid primary key references public.squadre(id) on delete cascade,
  chiave text not null unique check (length(chiave) >= 32),
  creato_il timestamptz not null default now()
);
alter table public.registro_fogli enable row level security; -- nessuna regola: dall'app non si legge

-- tipo 'presenze': (chiave della casella "cognome|anno|giorno", P/A/G); il giorno è il numero di serie dei fogli
-- (giorni dal 30/12/1899), così la formula non dipende dalla lingua del foglio.
-- tipo 'atleti': gli atleti della squadra (cognome, nome, anno, chiave "cognome|anno"), per trovare chi non è nel registro.
create or replace function public.registro_presenze(p_chiave text, p_tipo text default 'presenze')
returns table (a text, b text, c text, d text)
language sql stable security definer set search_path = public as $$
  with sq as (select squadra_id from registro_fogli where chiave = p_chiave and length(p_chiave) >= 32),
  atleti as (
    select p.id, trim(p.cognome) cognome, trim(p.nome) nome, extract(year from p.data_nascita)::int::text anno
    from profiles p join sq on p.squadra_id = sq.squadra_id
    where p.role = 'atleta' and p.eliminato_il is null
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
revoke all on function public.registro_presenze(text, text) from public;
grant execute on function public.registro_presenze(text, text) to anon, authenticated;
