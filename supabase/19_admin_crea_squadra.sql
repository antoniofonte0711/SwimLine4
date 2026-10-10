-- ============================================
-- SwimLine4 — 19: l'admin crea le squadre dal Pannello di controllo (10 ottobre 2026)
-- Nome unico (le domande di ingresso cercano la squadra per nome). Coach facoltativo:
-- se scelto, diventa coach della nuova squadra (non può allenarne già un'altra).
-- Si può rieseguire.
-- ============================================
create or replace function public.admin_crea_squadra(p_nome text, p_coach uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ruolo text;
begin
  if not is_admin() then raise exception 'Solo per l''amministratore'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Scrivi il nome della squadra'; end if;
  if length(trim(p_nome)) > 60 then raise exception 'Nome troppo lungo'; end if;
  if exists (select 1 from squadre where lower(trim(nome)) = lower(trim(p_nome))) then
    raise exception 'Esiste già una squadra con questo nome';
  end if;
  if p_coach is not null then
    select role into v_ruolo from profiles where id = p_coach;
    if v_ruolo is null then raise exception 'Persona non trovata'; end if;
    if exists (select 1 from squadre where coach_id = p_coach) then
      raise exception 'Questa persona allena già un''altra squadra';
    end if;
  end if;
  insert into squadre (nome, coach_id) values (trim(p_nome), p_coach) returning id into v_id;
  if p_coach is not null then
    update profiles set squadra_id = v_id,
      role = case when role = 'admin' then 'admin' else 'coach' end
    where id = p_coach;
  end if;
  return v_id;
end $$;
revoke all on function public.admin_crea_squadra(text, uuid) from public, anon;
grant execute on function public.admin_crea_squadra(text, uuid) to authenticated;
