-- Approvazioni (decise il 7 ottobre 2026), da eseguire dopo migrazione_sicurezza.sql
--  A. Chi si registra come coach resta "coach_in_attesa" finché l'admin non lo approva:
--     solo allora nasce la sua squadra e diventa coach con tutti i permessi su di essa.
--  B. Un atleta o genitore non entra più in una squadra da solo: manda una domanda
--     e il coach di quella squadra la approva o la rifiuta.
--  Gli admin restano solo quelli nominati dall'admin (dal pannello amministratore).

-- Nuovo stato del ruolo
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('atleta', 'coach', 'coach_in_attesa', 'genitore', 'admin'));

-- Le richieste ora sono di due tipi: invito (il coach invita, la persona accetta)
-- e domanda (la persona chiede, il coach accetta)
alter table public.richieste_squadra add column if not exists tipo text not null default 'invito';
alter table public.richieste_squadra drop constraint if exists richieste_squadra_tipo_check;
alter table public.richieste_squadra add constraint richieste_squadra_tipo_check check (tipo in ('invito', 'domanda'));

-- Solo i coach approvati (e l'admin) creano squadre
drop policy if exists "coach crea la propria squadra" on public.squadre;
create policy "coach crea la propria squadra" on public.squadre for insert
  with check (auth.uid() = coach_id and exists (select 1 from public.profiles where id = auth.uid() and role in ('coach', 'admin')));

-- Registrazione
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ruolo text := new.raw_user_meta_data->>'role';
  v_squadra uuid;
begin
  if v_ruolo = 'coach' then
    v_ruolo := 'coach_in_attesa'; -- la squadra nasce quando l'admin approva
  elsif v_ruolo is null or v_ruolo not in ('atleta', 'genitore') then
    v_ruolo := 'atleta';
  end if;
  insert into public.profiles (id, nome, cognome, data_nascita, role)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'cognome',
    (new.raw_user_meta_data->>'data_nascita')::date,
    v_ruolo
  )
  on conflict (id) do nothing;

  -- squadra scelta in registrazione: diventa una domanda per il coach
  if v_ruolo in ('atleta', 'genitore') and new.raw_user_meta_data->>'squadra_id' is not null then
    select id into v_squadra from public.squadre where id::text = new.raw_user_meta_data->>'squadra_id';
    if v_squadra is not null then
      insert into public.richieste_squadra (squadra_id, persona_id, richiesta_da, tipo)
      values (v_squadra, new.id, new.id, 'domanda')
      on conflict (squadra_id, persona_id) where stato = 'in_attesa' do nothing;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Richieste che mi riguardano: inviti da accettare e domande mie in attesa
drop function if exists public.mie_richieste();
create function public.mie_richieste()
returns table (id uuid, squadra_id uuid, squadra_nome text, coach_nome text, created_at timestamptz, tipo text)
language sql stable security definer set search_path = public
as $$
  select r.id, r.squadra_id, s.nome,
    trim(coalesce(c.nome, '') || ' ' || coalesce(c.cognome, '')), r.created_at, r.tipo
  from richieste_squadra r
  join squadre s on s.id = r.squadra_id
  left join profiles c on c.id = case when r.tipo = 'invito' then coalesce(r.richiesta_da, s.coach_id) else s.coach_id end
  where r.persona_id = auth.uid() and r.stato = 'in_attesa'
  order by r.created_at desc
$$;

-- Accettare un invito: solo gli inviti (una domanda la decide il coach, non chi l'ha fatta)
create or replace function public.rispondi_richiesta(p_richiesta uuid, p_accetta boolean)
returns text language plpgsql security definer set search_path = public
as $$
declare v_squadra uuid; v_nome text;
begin
  select squadra_id into v_squadra from richieste_squadra
  where id = p_richiesta and persona_id = auth.uid() and stato = 'in_attesa' and tipo = 'invito';
  if v_squadra is null then raise exception 'Richiesta non trovata o già gestita'; end if;
  update richieste_squadra set stato = case when p_accetta then 'accettata' else 'rifiutata' end, risposta_il = now()
  where id = p_richiesta;
  if p_accetta then update profiles set squadra_id = v_squadra where id = auth.uid(); end if;
  select nome into v_nome from squadre where id = v_squadra;
  return v_nome;
end $$;

-- L'atleta o il genitore chiede di entrare scrivendo il nome esatto della squadra
create or replace function public.chiedi_di_entrare(p_nome text)
returns text language plpgsql security definer set search_path = public
as $$
declare v_ruolo text; v_attuale uuid; v_squadra uuid; v_nome text;
begin
  select role, squadra_id into v_ruolo, v_attuale from profiles where id = auth.uid();
  if v_ruolo is null or v_ruolo not in ('atleta', 'genitore', 'admin') then
    raise exception 'Solo atleti e genitori possono chiedere di entrare in una squadra';
  end if;
  select id, nome into v_squadra, v_nome from squadre where lower(trim(nome)) = lower(trim(coalesce(p_nome, ''))) limit 1;
  if v_squadra is null then raise exception 'Nessuna squadra con questo nome'; end if;
  if v_attuale = v_squadra then raise exception 'Sei già in questa squadra'; end if;
  insert into richieste_squadra (squadra_id, persona_id, richiesta_da, tipo)
  values (v_squadra, auth.uid(), auth.uid(), 'domanda')
  on conflict (squadra_id, persona_id) where stato = 'in_attesa' do nothing;
  return v_nome;
end $$;

-- Il coach vede le domande per la sua squadra...
create or replace function public.domande_squadra(p_squadra uuid)
returns table (id uuid, persona_id uuid, nome text, cognome text, ruolo text, squadra_attuale text, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.sono_coach_squadra(p_squadra) then raise exception 'Non puoi gestire questa squadra'; end if;
  return query
    select r.id, p.id, p.nome, p.cognome, p.role, s.nome, r.created_at
    from richieste_squadra r
    join profiles p on p.id = r.persona_id
    left join squadre s on s.id = p.squadra_id
    where r.squadra_id = p_squadra and r.tipo = 'domanda' and r.stato = 'in_attesa'
    order by r.created_at;
end $$;

-- ...e le approva o le rifiuta
create or replace function public.rispondi_domanda(p_richiesta uuid, p_accetta boolean)
returns text language plpgsql security definer set search_path = public
as $$
declare v_squadra uuid; v_persona uuid; v_nome text;
begin
  select squadra_id, persona_id into v_squadra, v_persona from richieste_squadra
  where id = p_richiesta and tipo = 'domanda' and stato = 'in_attesa';
  if v_squadra is null then raise exception 'Domanda non trovata o già gestita'; end if;
  if not public.sono_coach_squadra(v_squadra) then raise exception 'Non puoi gestire questa squadra'; end if;
  update richieste_squadra set stato = case when p_accetta then 'accettata' else 'rifiutata' end, risposta_il = now()
  where id = p_richiesta;
  if p_accetta then update profiles set squadra_id = v_squadra where id = v_persona; end if;
  select trim(coalesce(nome, '') || ' ' || coalesce(cognome, '')) into v_nome from profiles where id = v_persona;
  return v_nome;
end $$;

-- Il coach approvato rinomina la propria squadra
create or replace function public.imposta_nome_squadra(p_nome text)
returns text language plpgsql security definer set search_path = public
as $$
declare v_nome text := trim(coalesce(p_nome, ''));
begin
  if length(v_nome) < 2 then raise exception 'Scrivi un nome di almeno 2 lettere'; end if;
  update squadre set nome = v_nome
  where id = (select id from squadre where coach_id = auth.uid() order by created_at limit 1);
  if not found then raise exception 'Nessuna squadra: viene creata quando l''amministratore approva il tuo account coach'; end if;
  return v_nome;
end $$;

-- Admin: coach in attesa di approvazione...
create or replace function public.coach_da_approvare()
returns table (id uuid, nome text, cognome text, email text, nome_squadra text, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  return query
    select p.id, p.nome, p.cognome, u.email::text, u.raw_user_meta_data->>'nome_squadra', p.created_at
    from profiles p join auth.users u on u.id = p.id
    where p.role = 'coach_in_attesa'
    order by p.created_at;
end $$;

-- ...approvazione (nasce la squadra) o rifiuto (resta atleta)
create or replace function public.approva_coach(p_persona uuid, p_accetta boolean, p_nome_squadra text default null)
returns text language plpgsql security definer set search_path = public
as $$
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
  return v_nome;
end $$;

-- Funzioni nuove: solo dopo il login
revoke execute on function public.mie_richieste() from public, anon;
revoke execute on function public.chiedi_di_entrare(text) from public, anon;
revoke execute on function public.domande_squadra(uuid) from public, anon;
revoke execute on function public.rispondi_domanda(uuid, boolean) from public, anon;
revoke execute on function public.imposta_nome_squadra(text) from public, anon;
revoke execute on function public.coach_da_approvare() from public, anon;
revoke execute on function public.approva_coach(uuid, boolean, text) from public, anon;
grant execute on function public.mie_richieste() to authenticated;
grant execute on function public.chiedi_di_entrare(text) to authenticated;
grant execute on function public.domande_squadra(uuid) to authenticated;
grant execute on function public.rispondi_domanda(uuid, boolean) to authenticated;
grant execute on function public.imposta_nome_squadra(text) to authenticated;
grant execute on function public.coach_da_approvare() to authenticated;
grant execute on function public.approva_coach(uuid, boolean, text) to authenticated;
