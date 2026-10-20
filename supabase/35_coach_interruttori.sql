-- 35: il coach decide da solo alcuni interruttori della sua squadra (oggi: difficoltà automatica)
create or replace function public.imposta_funzione_squadra(p_squadra uuid, p_chiave text, p_valore boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or sono_coach_squadra(p_squadra)) then
    raise exception 'Solo il coach della squadra può cambiare questa impostazione';
  end if;
  if p_chiave not in ('c_difficolta') then
    raise exception 'Impostazione non permessa';
  end if;
  insert into impostazioni_squadra (squadra_id, permessi, aggiornato)
  values (p_squadra, jsonb_build_object(p_chiave, p_valore), now())
  on conflict (squadra_id) do update
    set permessi = impostazioni_squadra.permessi || jsonb_build_object(p_chiave, p_valore), aggiornato = now();
end $$;
revoke all on function public.imposta_funzione_squadra(uuid, text, boolean) from public, anon;
grant execute on function public.imposta_funzione_squadra(uuid, text, boolean) to authenticated;
