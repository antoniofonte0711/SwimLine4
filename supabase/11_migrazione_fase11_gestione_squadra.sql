-- ============================================
-- SwimLine4 — Migrazione fase 11 (il coach gestisce le persone della squadra)
-- Incolla tutto nell'SQL Editor di Supabase e premi Run (si può rieseguire).
-- Richiede la fase 10 (funzione sono_coach_squadra).
-- Non cambia nessuna tabella: aggiunge solo tre funzioni sicure.
--  - cerca_persone: cerca per nome/cognome o per email ESATTA (l'email non viene mai mostrata)
--  - aggiungi_a_squadra: mette un atleta o un genitore nella squadra
--  - togli_da_squadra: lo toglie dalla squadra
-- Le usa il coach della squadra; l'admin può farlo su qualsiasi squadra.
-- ============================================

create or replace function public.cerca_persone(p_testo text, p_squadra uuid)
returns table (id uuid, nome text, cognome text, ruolo text, squadra_id uuid, squadra_nome text)
language plpgsql security definer stable set search_path = public as $$
#variable_conflict use_column
declare
  t text := lower(trim(coalesce(p_testo, '')));
  v_admin boolean := coalesce(public.is_admin(), false);
begin
  if not public.sono_coach_squadra(p_squadra) then
    raise exception 'Non puoi gestire questa squadra';
  end if;
  if length(t) < 2 then return; end if;
  return query
    select p.id, p.nome, p.cognome, p.role, p.squadra_id, s.nome
    from profiles p
    left join auth.users u on u.id = p.id
    left join squadre s on s.id = p.squadra_id
    where (p.role in ('atleta', 'genitore') or (p.id = auth.uid() and v_admin))
      and (
        -- con l'email esatta si trova chiunque
        lower(u.email) = t
        -- per nome: il coach trova chi non ha squadra o è già nella sua (non i membri di altre squadre)
        or (
          (position(t in lower(coalesce(p.nome, '') || ' ' || coalesce(p.cognome, ''))) > 0
           or position(t in lower(coalesce(p.cognome, '') || ' ' || coalesce(p.nome, ''))) > 0)
          and (p.squadra_id is null or p.squadra_id = p_squadra or v_admin)
        )
      )
    order by p.cognome, p.nome
    limit 20;
end $$;
grant execute on function public.cerca_persone(text, uuid) to authenticated;

create or replace function public.aggiungi_a_squadra(p_persona uuid, p_squadra uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_ruolo text; v_attuale uuid; v_nome_attuale text; v_nome text;
  v_admin boolean := coalesce(public.is_admin(), false);
begin
  if not public.sono_coach_squadra(p_squadra) then
    raise exception 'Non puoi gestire questa squadra';
  end if;
  select role, squadra_id into v_ruolo, v_attuale from profiles where id = p_persona;
  if v_ruolo is null then raise exception 'Persona non trovata'; end if;
  if not (v_ruolo in ('atleta', 'genitore') or (p_persona = auth.uid() and v_admin)) then
    raise exception 'Si possono aggiungere solo atleti e genitori';
  end if;
  -- Spostare qualcuno da un'altra squadra lo può fare solo l'admin
  if v_attuale is not null and v_attuale <> p_squadra and not v_admin then
    select nome into v_nome_attuale from squadre where id = v_attuale;
    raise exception 'È già nella squadra %: può uscirne dal suo Profilo, oppure chiedi all''admin di spostarlo', coalesce(v_nome_attuale, '');
  end if;
  update profiles set squadra_id = p_squadra where id = p_persona;
  select nome into v_nome from squadre where id = p_squadra;
  return v_nome;
end $$;
grant execute on function public.aggiungi_a_squadra(uuid, uuid) to authenticated;

create or replace function public.togli_da_squadra(p_persona uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_squadra uuid; v_ruolo text;
begin
  select squadra_id, role into v_squadra, v_ruolo from profiles where id = p_persona;
  if v_squadra is null then return; end if;
  if not public.sono_coach_squadra(v_squadra) then
    raise exception 'Non puoi gestire questa squadra';
  end if;
  if v_ruolo = 'coach' then
    raise exception 'Il coach non si toglie da qui';
  end if;
  update profiles set squadra_id = null where id = p_persona;
end $$;
grant execute on function public.togli_da_squadra(uuid) to authenticated;
