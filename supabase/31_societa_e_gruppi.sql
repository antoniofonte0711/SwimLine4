-- ============================================
-- SwimLine4 — 31: società e gruppi (12 ottobre 2026)
-- - "società" sopra le squadre di oggi (che nel pannello si chiamano "gruppi", un coach ciascuno)
-- - una società ha un solo capo; un gruppo sta in una sola società, o in nessuna
-- - per ora società e capo li decide l'admin; più avanti un coach potrà crearla lui (i suoi gruppi ci entrano)
-- - l'admin sposta chiunque da un gruppo all'altro, anche il coach, e cambia il coach di un gruppo
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

create table if not exists public.societa (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  capo_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);
create unique index if not exists societa_nome_unico on public.societa (lower(trim(nome)));

alter table public.squadre add column if not exists societa_id uuid references public.societa(id) on delete set null;
create index if not exists squadre_societa on public.squadre (societa_id);

alter table public.societa enable row level security;
-- il nome della società si vede anche dalla registrazione (come le squadre); si cambia solo con le funzioni qui sotto
drop policy if exists "tutti vedono le societa" on public.societa;
create policy "tutti vedono le societa" on public.societa for select to anon, authenticated using (true);

-- crea (p_id nullo) o modifica una società: nome e capo
create or replace function public.admin_salva_societa(p_id uuid, p_nome text, p_capo uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Scrivi il nome della società'; end if;
  if exists (select 1 from societa where lower(trim(nome)) = lower(trim(p_nome)) and id is distinct from p_id) then
    raise exception 'Esiste già una società con questo nome';
  end if;
  if p_id is null then
    insert into societa (nome, capo_id) values (trim(p_nome), p_capo) returning id into v_id;
  else
    update societa set nome = trim(p_nome), capo_id = p_capo where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Società non trovata'; end if;
  end if;
  return v_id;
end $$;

-- cancellare una società non tocca i gruppi: restano com'erano, senza società
create or replace function public.admin_elimina_societa(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  update squadre set societa_id = null where societa_id = p_id;
  delete from societa where id = p_id;
end $$;

-- mette un gruppo in una società (p_societa nullo = lo toglie)
create or replace function public.admin_gruppo_societa(p_squadra uuid, p_societa uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  update squadre set societa_id = p_societa where id = p_squadra;
end $$;

-- sposta una persona in un altro gruppo (p_squadra nullo = senza gruppo).
-- Se allenava il suo gruppo di prima, quel gruppo resta senza coach.
create or replace function public.admin_sposta_persona(p_persona uuid, p_squadra uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  update squadre set coach_id = null
  where coach_id = p_persona and id is distinct from p_squadra;
  update profiles set squadra_id = p_squadra where id = p_persona;
end $$;

-- sceglie il coach di un gruppo (p_coach nullo = nessuno). Il nuovo coach entra nel gruppo;
-- se allenava un altro gruppo, quello resta senza coach (un coach allena un solo gruppo).
create or replace function public.admin_imposta_coach(p_squadra uuid, p_coach uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  if p_coach is not null then
    update squadre set coach_id = null where coach_id = p_coach and id <> p_squadra;
    update profiles set squadra_id = p_squadra,
      role = case when role in ('admin', 'coach') then role else 'coach' end
    where id = p_coach;
  end if;
  update squadre set coach_id = p_coach where id = p_squadra;
end $$;

revoke execute on function public.admin_salva_societa(uuid, text, uuid) from public, anon;
revoke execute on function public.admin_elimina_societa(uuid) from public, anon;
revoke execute on function public.admin_gruppo_societa(uuid, uuid) from public, anon;
revoke execute on function public.admin_sposta_persona(uuid, uuid) from public, anon;
revoke execute on function public.admin_imposta_coach(uuid, uuid) from public, anon;
grant execute on function public.admin_salva_societa(uuid, text, uuid) to authenticated;
grant execute on function public.admin_elimina_societa(uuid) to authenticated;
grant execute on function public.admin_gruppo_societa(uuid, uuid) to authenticated;
grant execute on function public.admin_sposta_persona(uuid, uuid) to authenticated;
grant execute on function public.admin_imposta_coach(uuid, uuid) to authenticated;
