-- ============================================
-- SwimLine4 — 47: presenze importate dal foglio di Mauri (11 novembre 2026)
-- Mauri segna P / A / G nel suo foglio Google; uno script nel nostro registro lo legge ogni ora e manda
-- le caselle qui (via /api/registro-presenze?tipo=importa, con la chiave del registro).
-- Regole: l'atleta si riconosce da cognome + anno (+ iniziale del nome se nell'app ce ne sono due uguali);
-- una casella piena del foglio vince su quello che c'è nell'app; una casella vuota non tocca niente;
-- solo giorni passati o di oggi. Restituisce quante presenze ha cambiato e chi non ha trovato.
-- Si può rieseguire.
-- ============================================
create or replace function public.registro_importa(p_chiave text, p_righe jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r jsonb; v_id uuid; v_n int; v_stato text; v_data date;
  v_cambiate int := 0; v_uguali int := 0; v_non_trovati jsonb := '[]'::jsonb;
begin
  if not exists (select 1 from registro_fogli where chiave = p_chiave and length(p_chiave) >= 32) then
    raise exception 'chiave';
  end if;
  if jsonb_typeof(p_righe) <> 'array' or jsonb_array_length(p_righe) > 20000 then raise exception 'righe'; end if;

  for r in select * from jsonb_array_elements(p_righe) loop
    v_stato := case upper(trim(r->>'s')) when 'P' then 'presente' when 'A' then 'assente' when 'G' then 'non_penale' end;
    begin v_data := (r->>'d')::date; exception when others then v_data := null; end;
    continue when v_stato is null or v_data is null or v_data > current_date or v_data < date '2026-08-01';

    select count(*), min(p.id::text)::uuid into v_n, v_id from profiles p
      where p.squadra_id in (select registro_gruppi(p_chiave)) and p.role in ('atleta', 'admin') and p.eliminato_il is null
        and lower(trim(p.cognome)) = lower(trim(r->>'c'))
        and extract(year from p.data_nascita)::int::text = trim(r->>'y');
    if v_n > 1 and coalesce(trim(r->>'n'), '') <> '' then
      select count(*), min(p.id::text)::uuid into v_n, v_id from profiles p
        where p.squadra_id in (select registro_gruppi(p_chiave)) and p.role in ('atleta', 'admin') and p.eliminato_il is null
          and lower(trim(p.cognome)) = lower(trim(r->>'c'))
          and extract(year from p.data_nascita)::int::text = trim(r->>'y')
          and lower(trim(p.nome)) like lower(left(trim(r->>'n'), 1)) || '%';
    end if;
    if v_n <> 1 then
      if not v_non_trovati @> jsonb_build_array(trim(r->>'c') || ' ' || trim(r->>'y')) then
        v_non_trovati := v_non_trovati || jsonb_build_array(trim(r->>'c') || ' ' || trim(r->>'y'));
      end if;
      continue;
    end if;

    insert into presenze (atleta_id, data, stato) values (v_id, v_data, v_stato)
      on conflict (atleta_id, data) do update set stato = excluded.stato where presenze.stato is distinct from excluded.stato;
    if found then v_cambiate := v_cambiate + 1; else v_uguali := v_uguali + 1; end if;
  end loop;

  return jsonb_build_object('cambiate', v_cambiate, 'gia_uguali', v_uguali, 'non_trovati', v_non_trovati);
end $$;
revoke all on function public.registro_importa(text, jsonb) from public;
grant execute on function public.registro_importa(text, jsonb) to anon, authenticated;
