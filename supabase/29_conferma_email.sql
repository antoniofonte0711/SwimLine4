-- ============================================
-- SwimLine4 — 29: l'admin conferma le email che non arrivano — 11 ottobre 2026
-- Senza un servizio email proprio, Supabase manda le email solo ai membri del team del progetto:
-- chi si registra può non ricevere il link di conferma. Finché non c'è un servizio email (Gmail o altro):
-- - admin_email_da_confermare(): chi non ha ancora confermato (Pannello › Tutti gli utenti)
-- - admin_conferma_email(): l'admin la conferma al posto suo (solo l'admin)
-- - approva_coach(): approvando un coach, la sua email si conferma da sola
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

create or replace function public.admin_email_da_confermare()
returns table(id uuid, email text, nome text, cognome text, role text, created_at timestamp with time zone)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  return query
    select u.id, u.email::text, p.nome, p.cognome, p.role, u.created_at
    from auth.users u left join public.profiles p on p.id = u.id
    where u.email_confirmed_at is null
    order by u.created_at desc;
end $$;
revoke all on function public.admin_email_da_confermare() from public, anon;
grant execute on function public.admin_email_da_confermare() to authenticated;

create or replace function public.admin_conferma_email(p_persona uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = p_persona;
  if not found then raise exception 'Utente non trovato'; end if;
end $$;
revoke all on function public.admin_conferma_email(uuid) from public, anon;
grant execute on function public.admin_conferma_email(uuid) to authenticated;

create or replace function public.approva_coach(p_persona uuid, p_accetta boolean, p_nome_squadra text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_squadra uuid; v_nome text;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  if not exists (select 1 from profiles where id = p_persona and role = 'coach_in_attesa') then
    raise exception 'Questa persona non è in attesa di approvazione';
  end if;
  if not p_accetta then
    update profiles set role = 'atleta' where id = p_persona;
    return null;
  end if;
  select coalesce(nullif(trim(p_nome_squadra), ''), nullif(trim(u.raw_user_meta_data->>'nome_squadra'), ''),
                  'Squadra di ' || coalesce(p.nome, 'nuovo coach'))
    into v_nome
    from profiles p join auth.users u on u.id = p.id where p.id = p_persona;
  insert into squadre (nome, coach_id) values (v_nome, p_persona) returning id into v_squadra;
  update profiles set role = 'coach', squadra_id = v_squadra where id = p_persona;
  -- l'admin lo conosce e lo ha approvato: l'email vale come confermata anche se il link non è arrivato
  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = p_persona;
  return v_nome;
end $$;
