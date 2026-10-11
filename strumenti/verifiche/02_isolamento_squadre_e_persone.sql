-- VERIFICA 02 — Isolamento: ognuno vede e modifica solo ciò che gli spetta.
-- SOLO sul database di ANTEPRIMA (gpxteehblkitzfniqobm), con execute_sql: tutto annullato alla fine.
-- Dentro la prova si crea una seconda squadra ("Rivali") con Luca come coach e Pietro come atleta.
-- Risultato atteso (11/10/2026): tutto 0 / "no", TRANNE "genitore ... gare non sue" > 0: un genitore iscritto alla
-- squadra vede le GARE dei compagni che hanno lasciato acceso "La squadra vede le mie gare" (voluto, scritto nell'informativa).
do $$
declare
  coach uuid := 'a0000000-0000-4000-8000-000000000001';  -- coach della Squadra di prova
  marco uuid := 'a0000000-0000-4000-8000-000000000012';  -- atleta Squadra di prova
  sofia uuid := 'a0000000-0000-4000-8000-000000000013';  -- atleta Squadra di prova
  gen   uuid := 'a0000000-0000-4000-8000-000000000021';  -- genitore (collegato solo a Giulia)
  luca  uuid := 'a0000000-0000-4000-8000-000000000014';  -- diventa coach di "Rivali"
  pietro uuid := 'a0000000-0000-4000-8000-000000000018'; -- atleta di "Rivali"
  mia uuid; rivali uuid; r text := ''; x int; ok boolean;
begin
  select squadra_id into mia from profiles where id = coach;
  insert into squadre (nome, coach_id) values ('Rivali', luca) returning id into rivali;
  update profiles set role = 'coach', squadra_id = rivali where id = luca;
  update profiles set squadra_id = rivali where id = pietro;
  insert into allenamenti (atleta_id, tipo_lavoro, distanza, ripetizioni, stile, passaggi, data_allenamento) values (pietro, 'A2', 100, 1, 'Stile libero', '["1''10\"00"]', current_date);
  insert into presenze (atleta_id, data, stato) values (pietro, current_date, 'presente') on conflict do nothing;
  insert into allenamenti_squadra (squadra_id, data, righe, pubblicato, visibilita) values (rivali, current_date + 30, '[]', true, 'squadra');

  execute 'set local role authenticated';

  -- COACH della Squadra di prova verso la squadra Rivali
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated')::text, true);
  select count(*) into x from allenamenti where atleta_id = pietro; r := r || 'coach vede allen. di altra squadra=' || x;
  select count(*) into x from presenze where atleta_id = pietro; r := r || ' presenze=' || x;
  select count(*) into x from profiles where id = pietro; r := r || ' profilo=' || x;
  select count(*) into x from allenamenti_squadra where squadra_id = rivali; r := r || ' piano=' || x;
  update allenamenti set passaggi = '["0''01\"00"]' where atleta_id = pietro; get diagnostics x = row_count; r := r || ' | modifica tempi altrui=' || x;
  begin insert into presenze (atleta_id, data, stato) values (pietro, current_date + 1, 'assente'); r := r || ' segna presenza altrui=PERMESSO';
  exception when others then r := r || ' segna presenza altrui=no'; end;
  begin insert into allenamenti_squadra (squadra_id, data, righe, pubblicato, visibilita) values (rivali, current_date + 31, '[]', true, 'squadra'); r := r || ' pubblica per altri=PERMESSO';
  exception when others then r := r || ' pubblica per altri=no'; end;
  begin perform public.aggiungi_a_squadra(pietro, rivali); r := r || ' gestisce squadra altrui=PERMESSO';
  exception when others then r := r || ' gestisce squadra altrui=no'; end;
  begin perform public.aggiungi_a_squadra(pietro, mia); r := r || ' ruba atleta di altra squadra=PERMESSO';
  exception when others then r := r || ' ruba atleta=no'; end;
  begin perform public.togli_da_squadra(pietro); r := r || ' toglie atleta altrui=PERMESSO';
  exception when others then r := r || ' toglie atleta altrui=no'; end;

  -- ATLETA Marco verso compagni e altre squadre
  perform set_config('request.jwt.claims', json_build_object('sub', marco, 'role', 'authenticated')::text, true);
  select count(*) into x from allenamenti where atleta_id = sofia; r := r || E'\natleta vede allen. del compagno=' || x;
  select count(*) into x from presenze where atleta_id = sofia; r := r || ' presenze compagno=' || x;
  select count(*) into x from allenamenti where atleta_id = pietro; r := r || ' allen. altra squadra=' || x;
  select count(*) into x from profiles where id = pietro; r := r || ' profilo altra squadra=' || x;
  select count(*) into x from allenamenti_squadra where squadra_id = rivali; r := r || ' piano altra squadra=' || x;
  begin insert into gare (atleta_id, nome_gara, distanza, stile, tempo, data_gara) values (sofia, 'falsa', 50, 'Stile libero', '20"00', current_date); r := r || ' | scrive gara per altri=PERMESSO';
  exception when others then r := r || ' | scrive gara per altri=no'; end;
  begin insert into presenze (atleta_id, data, stato) values (marco, current_date + 2, 'presente'); r := r || ' si segna presente=PERMESSO';
  exception when others then r := r || ' si segna presente=no'; end;
  begin insert into punti_movimenti (atleta_id, squadra_id, punti, motivo, riferimento, data) values (marco, mia, 1000, 'trucco', 'trucco', current_date); r := r || ' si regala punti=PERMESSO';
  exception when others then r := r || ' si regala punti=no'; end;
  update profiles set squadra_id = rivali where id = marco; get diagnostics x = row_count; r := r || ' cambia squadra da solo=' || x;
  delete from allenamenti where atleta_id = sofia; get diagnostics x = row_count; r := r || ' cancella allen. altrui=' || x;

  -- GENITORE collegato solo a Giulia
  perform set_config('request.jwt.claims', json_build_object('sub', gen, 'role', 'authenticated')::text, true);
  select count(*) into x from allenamenti where atleta_id = marco; r := r || E'\ngenitore vede atleta non suo=' || x;
  select count(*) into x from gare where atleta_id = marco; r := r || ' gare non sue=' || x;
  begin insert into genitori_figli (genitore_id, atleta_id, stato) values (gen, marco, 'approvato'); r := r || ' si auto-approva=PERMESSO';
  exception when others then r := r || ' si auto-approva=no'; end;

  -- ANONIMO
  execute 'reset role';
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin select count(*) into x from profiles; r := r || E'\nanonimo legge profili=' || x;
  exception when others then r := r || E'\nanonimo legge profili=no'; end;
  begin select count(*) into x from gare; r := r || ' gare=' || x;
  exception when others then r := r || ' gare=no'; end;
  begin select count(*) into x from notifiche; r := r || ' notifiche=' || x;
  exception when others then r := r || ' notifiche=no'; end;
  raise exception E'VERIFICA 02 (annullata)\n%', r;
end $$;
