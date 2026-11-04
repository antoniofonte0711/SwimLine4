-- Migrazione 45 (04/11/2026): il "proprio stile" si sceglie nel form di registrazione.
-- La finestra che lo chiedeva dopo l'ingresso in squadra non c'è più: l'atleta lo sceglie
-- registrandosi (obbligatorio nel form) e lo può cambiare dal Profilo.
-- handle_new_user = migrazione 31 + proprio_stile dai dati di registrazione. Si può rieseguire.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ruolo text := new.raw_user_meta_data->>'role';
  v_sesso text := new.raw_user_meta_data->>'sesso';
  v_ps text := new.raw_user_meta_data->>'proprio_stile';
  v_nome text := new.raw_user_meta_data->>'nome';
  v_cognome text := new.raw_user_meta_data->>'cognome';
  v_squadra uuid;
begin
  if v_ruolo = 'coach' then
    v_ruolo := 'coach_in_attesa'; -- diventa coach qui sotto, appena nasce la sua squadra
  elsif v_ruolo is null or v_ruolo not in ('atleta', 'genitore') then
    v_ruolo := 'atleta';
  end if;
  insert into public.profiles (id, nome, cognome, data_nascita, role, sesso, proprio_stile)
  values (new.id, v_nome, v_cognome, (new.raw_user_meta_data->>'data_nascita')::date, v_ruolo,
    case when v_sesso in ('M', 'F') then v_sesso end,
    case when v_ruolo = 'atleta' and v_ps in ('Dorso', 'Rana', 'Farfalla') then v_ps end)
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
