-- ============================================
-- SwimLine4 — 32: registro dei cambi di ruolo e di gruppo (13 ottobre 2026)
-- - ogni cambio di ruolo, di gruppo o di coach fatto dall'admin resta scritto: chi, a chi, da → a, quando
-- - il ruolo si cambia solo con admin_cambia_ruolo (solo admin; non il proprio, per non chiudersi fuori)
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero. Richiede la 31.
-- ============================================

create table if not exists public.registro_modifiche (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  persona_id uuid references public.profiles(id) on delete cascade,
  cosa text not null check (cosa in ('ruolo', 'gruppo', 'coach')),
  da text,
  a text,
  created_at timestamp with time zone default now()
);
create index if not exists registro_modifiche_data on public.registro_modifiche (created_at desc);
alter table public.registro_modifiche enable row level security;
drop policy if exists "admin legge il registro" on public.registro_modifiche;
create policy "admin legge il registro" on public.registro_modifiche for select to authenticated using (public.is_admin());

-- nome del gruppo (con la società davanti) per il registro
create or replace function public.nome_gruppo(p_squadra uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when so.nome is null then s.nome else so.nome || ' · ' || s.nome end
  from squadre s left join societa so on so.id = s.societa_id where s.id = p_squadra
$$;

create or replace function public.admin_cambia_ruolo(p_persona uuid, p_ruolo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_prima text;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  if p_persona = auth.uid() then raise exception 'Non puoi cambiare il tuo ruolo: chiedilo a un altro admin'; end if;
  if p_ruolo not in ('atleta', 'genitore', 'coach', 'admin') then raise exception 'Ruolo non valido'; end if;
  select role into v_prima from profiles where id = p_persona;
  if v_prima is null then raise exception 'Persona non trovata'; end if;
  if v_prima = p_ruolo then return; end if;
  update profiles set role = p_ruolo where id = p_persona;
  insert into registro_modifiche (admin_id, persona_id, cosa, da, a) values (auth.uid(), p_persona, 'ruolo', v_prima, p_ruolo);
end $$;

create or replace function public.admin_sposta_persona(p_persona uuid, p_squadra uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_prima uuid;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  select squadra_id into v_prima from profiles where id = p_persona;
  update squadre set coach_id = null
  where coach_id = p_persona and id is distinct from p_squadra;
  update profiles set squadra_id = p_squadra where id = p_persona;
  if v_prima is distinct from p_squadra then
    insert into registro_modifiche (admin_id, persona_id, cosa, da, a)
    values (auth.uid(), p_persona, 'gruppo', public.nome_gruppo(v_prima), public.nome_gruppo(p_squadra));
  end if;
end $$;

create or replace function public.admin_imposta_coach(p_squadra uuid, p_coach uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_prima uuid;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  select coach_id into v_prima from squadre where id = p_squadra;
  if p_coach is not null then
    update squadre set coach_id = null where coach_id = p_coach and id <> p_squadra;
    update profiles set squadra_id = p_squadra,
      role = case when role in ('admin', 'coach') then role else 'coach' end
    where id = p_coach;
  end if;
  update squadre set coach_id = p_coach where id = p_squadra;
  if v_prima is distinct from p_coach then
    if v_prima is not null then
      insert into registro_modifiche (admin_id, persona_id, cosa, da, a) values (auth.uid(), v_prima, 'coach', public.nome_gruppo(p_squadra), null);
    end if;
    if p_coach is not null then
      insert into registro_modifiche (admin_id, persona_id, cosa, da, a) values (auth.uid(), p_coach, 'coach', null, public.nome_gruppo(p_squadra));
    end if;
  end if;
end $$;

revoke execute on function public.admin_cambia_ruolo(uuid, text) from public, anon;
revoke execute on function public.nome_gruppo(uuid) from public, anon;
grant execute on function public.admin_cambia_ruolo(uuid, text) to authenticated;
grant execute on function public.nome_gruppo(uuid) to authenticated;
