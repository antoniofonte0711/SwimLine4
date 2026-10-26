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

-- Eliminare un gruppo non deve scollegare il registro (la chiave stava sul vecchio gruppo "C.S.D.C" ed è sparita con lui):
-- se il gruppo è in una società, la chiave passa a un altro gruppo della società; se no, non si elimina.
create or replace function public.admin_elimina_squadra(p_squadra uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_persone int; v_altro uuid;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  select count(*) into v_persone from profiles where squadra_id = p_squadra;
  if v_persone > 0 then
    raise exception 'Nel gruppo ci sono ancora % persone: spostale o toglile prima di eliminarlo', v_persone;
  end if;
  if exists (select 1 from registro_fogli where squadra_id = p_squadra) then
    select s.id into v_altro from squadre s join squadre io on io.id = p_squadra
      where s.societa_id = io.societa_id and s.id <> p_squadra limit 1;
    if v_altro is null then raise exception 'Questo gruppo è collegato al registro su Google Fogli: prima mettilo in una società con altri gruppi'; end if;
    update registro_fogli set squadra_id = v_altro where squadra_id = p_squadra;
  end if;
  delete from squadre where id = p_squadra;
end $$;
