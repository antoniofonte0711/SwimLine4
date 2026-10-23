-- Migrazione 39 (23/10/2026): l'admin cambia il nome di un gruppo dal Pannello di controllo.
-- Stesse regole di admin_crea_squadra: nome non vuoto, al massimo 60 caratteri, unico (le domande di ingresso cercano per nome).
create or replace function public.admin_rinomina_squadra(p_squadra uuid, p_nome text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo per l''amministratore'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Scrivi il nome del gruppo'; end if;
  if length(trim(p_nome)) > 60 then raise exception 'Nome troppo lungo'; end if;
  if exists (select 1 from squadre where lower(trim(nome)) = lower(trim(p_nome)) and id <> p_squadra) then
    raise exception 'Esiste già un gruppo con questo nome';
  end if;
  update squadre set nome = trim(p_nome) where id = p_squadra;
  if not found then raise exception 'Gruppo non trovato'; end if;
end $$;
revoke all on function public.admin_rinomina_squadra(uuid, text) from public, anon;
grant execute on function public.admin_rinomina_squadra(uuid, text) to authenticated;
