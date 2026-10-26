-- ============================================
-- SwimLine4 — 42: elimina un gruppo (26 ottobre 2026)
-- Solo l'admin. Un gruppo con persone dentro non si elimina: prima vanno spostate
-- (così nessun account resta senza gruppo per sbaglio). Allenamenti, permessi e tipi di lavoro
-- del gruppo vengono cancellati con lui (on delete cascade); i punti restano senza gruppo.
-- Si può rieseguire.
-- ============================================

create or replace function public.admin_elimina_squadra(p_squadra uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_persone int;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  select count(*) into v_persone from profiles where squadra_id = p_squadra;
  if v_persone > 0 then
    raise exception 'Nel gruppo ci sono ancora % persone: spostale o toglile prima di eliminarlo', v_persone;
  end if;
  delete from squadre where id = p_squadra;
end $$;

revoke execute on function public.admin_elimina_squadra(uuid) from public, anon;
grant execute on function public.admin_elimina_squadra(uuid) to authenticated;
