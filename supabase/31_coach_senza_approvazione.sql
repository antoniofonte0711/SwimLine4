-- ============================================
-- SwimLine4 — 31: il coach si registra senza l'approvazione dell'admin — 12 ottobre 2026
-- Chi si registra come coach diventa subito coach e nasce la sua squadra (nome scelto in registrazione;
-- se esiste già, si aggiunge il cognome o un numero, così gli atleti la trovano senza confondersi).
-- Se qualcosa va storto la registrazione non si blocca: resta "coach in attesa" e l'admin lo approva come prima.
-- Chi era già "coach in attesa" resta lì: l'admin lo approva dal Pannello.
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

create or replace function public.nome_squadra_libero(p_nome text, p_cognome text)
returns text language plpgsql stable security definer set search_path = public as $$
declare v text := left(trim(p_nome), 60); n int := 2;
begin
  if not exists (select 1 from squadre where lower(trim(nome)) = lower(v)) then return v; end if;
  if coalesce(trim(p_cognome), '') <> '' then
    v := left(trim(p_nome), 45) || ' ' || trim(p_cognome);
    if not exists (select 1 from squadre where lower(trim(nome)) = lower(v)) then return v; end if;
  end if;
  loop
    v := left(trim(p_nome), 55) || ' ' || n;
    if not exists (select 1 from squadre where lower(trim(nome)) = lower(v)) then return v; end if;
    n := n + 1;
  end loop;
end $$;
revoke all on function public.nome_squadra_libero(text, text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ruolo text := new.raw_user_meta_data->>'role';
  v_sesso text := new.raw_user_meta_data->>'sesso';
  v_nome text := new.raw_user_meta_data->>'nome';
  v_cognome text := new.raw_user_meta_data->>'cognome';
  v_squadra uuid;
begin
  if v_ruolo = 'coach' then
    v_ruolo := 'coach_in_attesa'; -- diventa coach qui sotto, appena nasce la sua squadra
  elsif v_ruolo is null or v_ruolo not in ('atleta', 'genitore') then
    v_ruolo := 'atleta';
  end if;
  insert into public.profiles (id, nome, cognome, data_nascita, role, sesso)
  values (new.id, v_nome, v_cognome, (new.raw_user_meta_data->>'data_nascita')::date, v_ruolo,
    case when v_sesso in ('M', 'F') then v_sesso end)
  on conflict (id) do nothing;

  -- coach: la squadra nasce subito, senza approvazione dell'admin
  if v_ruolo = 'coach_in_attesa' then
    begin
      insert into public.squadre (nome, coach_id)
      values (public.nome_squadra_libero(coalesce(nullif(trim(new.raw_user_meta_data->>'nome_squadra'), ''),
                'Squadra di ' || coalesce(nullif(trim(v_nome), ''), 'nuovo coach')), v_cognome), new.id)
      returning id into v_squadra;
      update public.profiles set role = 'coach', squadra_id = v_squadra where id = new.id;
    exception when others then null; -- resta in attesa: l'admin lo approva dal Pannello
    end;
  end if;

  -- squadra scelta in registrazione (atleta o genitore): diventa una domanda per il coach
  if v_ruolo in ('atleta', 'genitore') and new.raw_user_meta_data->>'squadra_id' is not null then
    select id into v_squadra from public.squadre where id::text = new.raw_user_meta_data->>'squadra_id';
    if v_squadra is not null then
      insert into public.richieste_squadra (squadra_id, persona_id, richiesta_da, tipo)
      values (v_squadra, new.id, new.id, 'domanda')
      on conflict (squadra_id, persona_id) where stato = 'in_attesa' do nothing;
      begin
        perform public.avvisa_coach_domanda(v_squadra, new.id);
      exception when others then null;
      end;
    end if;
  end if;
  return new;
end;
$$;
