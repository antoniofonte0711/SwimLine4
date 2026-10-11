-- VERIFICA 06 — Tipi di lavoro per squadra: chi li vede, chi li aggiunge, chi li spunta.
-- SOLO sul database di ANTEPRIMA (gpxteehblkitzfniqobm), con execute_sql: tutto annullato alla fine.
-- Dentro la prova si crea una seconda squadra ("Rivali") con Luca come coach e Pietro come atleta.
-- Risultato atteso: il coach fa tutto sulla sua squadra (SI / 1); su altre squadre e sull'elenco generale no / 0;
-- l'atleta legge i lavori della sua squadra e del generale ma non cambia nulla; l'admin scrive il generale;
-- a stagione chiusa il coach non cambia più nulla.
do $$
declare
  coach uuid := 'a0000000-0000-4000-8000-000000000001';  -- coach della Squadra di prova
  marco uuid := 'a0000000-0000-4000-8000-000000000012';  -- atleta Squadra di prova
  luca  uuid := 'a0000000-0000-4000-8000-000000000014';  -- diventa coach di "Rivali"
  pietro uuid := 'a0000000-0000-4000-8000-000000000018'; -- atleta di "Rivali"
  adm uuid; mia uuid; rivali uuid; r text := ''; x int;
begin
  -- sull'anteprima non c'è un admin: un atleta di prova lo diventa solo per questa prova
  select id into adm from profiles where role = 'admin' limit 1;
  if adm is null then
    select id into adm from profiles where role = 'atleta' and id not in (marco, luca, pietro) limit 1;
    update profiles set role = 'admin' where id = adm;
  end if;
  select squadra_id into mia from profiles where id = coach;
  insert into squadre (nome, coach_id) values ('Rivali', luca) returning id into rivali;
  update profiles set role = 'coach', squadra_id = rivali where id = luca;
  update profiles set squadra_id = rivali where id = pietro;
  insert into tipi_lavoro (squadra_id, sigla, gruppo, peso) values (rivali, 'SEGRETO', 'soglia', 2);

  execute 'set local role authenticated';

  -- COACH della Squadra di prova
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated')::text, true);
  begin insert into tipi_lavoro (squadra_id, sigla, gruppo, peso, colore) values (mia, 'A1', 'recupero', 0.8, 'menta'); r := r || 'coach aggiunge alla sua=SI';
  exception when others then r := r || 'coach aggiunge alla sua=no (' || sqlerrm || ')'; end;
  begin insert into tipi_lavoro (squadra_id, sigla, gruppo, peso) values (mia, ' a1', 'recupero', 0.8); r := r || ' doppione=PERMESSO';
  exception when others then r := r || ' doppione=no'; end;
  begin insert into tipi_lavoro_squadra (squadra_id, sigla, attivo) values (mia, 'C3', false); r := r || ' spegne C3 nella sua=SI';
  exception when others then r := r || ' spegne C3=no (' || sqlerrm || ')'; end;
  update tipi_lavoro set peso = 1 where squadra_id = mia and sigla = 'A1'; get diagnostics x = row_count; r := r || ' modifica il suo=' || x;
  begin insert into tipi_lavoro (squadra_id, sigla, gruppo, peso) values (rivali, 'X', 'soglia', 2); r := r || E'\ncoach aggiunge ad altra squadra=PERMESSO';
  exception when others then r := r || E'\ncoach aggiunge ad altra squadra=no'; end;
  begin insert into tipi_lavoro (squadra_id, sigla, gruppo, peso) values (null, 'GEN', 'soglia', 2); r := r || ' aggiunge al generale=PERMESSO';
  exception when others then r := r || ' aggiunge al generale=no'; end;
  begin insert into tipi_lavoro_squadra (squadra_id, sigla, attivo) values (rivali, 'A2', false); r := r || ' spunta altra squadra=PERMESSO';
  exception when others then r := r || ' spunta altra squadra=no'; end;
  select count(*) into x from tipi_lavoro where squadra_id = rivali; r := r || ' vede lavori altra squadra=' || x;
  update tipi_lavoro set peso = 6 where squadra_id = rivali; get diagnostics x = row_count; r := r || ' modifica altra squadra=' || x;
  begin update tipi_lavoro set squadra_id = rivali where squadra_id = mia; r := r || ' sposta il suo altrove=PERMESSO';
  exception when others then r := r || ' sposta il suo altrove=no'; end;

  -- ADMIN: elenco generale
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  begin insert into tipi_lavoro (squadra_id, sigla, gruppo, peso, colore) values (null, 'EN3', 'soglia', 2.1, 'ambra'); r := r || E'\nadmin aggiunge al generale=SI';
  exception when others then r := r || E'\nadmin aggiunge al generale=no (' || sqlerrm || ')'; end;
  begin insert into tipi_lavoro_squadra (squadra_id, sigla, attivo) values (rivali, 'EN3', true); r := r || ' admin spunta in Rivali=SI';
  exception when others then r := r || ' admin spunta in Rivali=no (' || sqlerrm || ')'; end;

  -- ATLETA Marco (Squadra di prova)
  perform set_config('request.jwt.claims', json_build_object('sub', marco, 'role', 'authenticated')::text, true);
  select count(*) into x from tipi_lavoro where squadra_id = mia; r := r || E'\natleta legge i lavori della sua=' || x;
  select count(*) into x from tipi_lavoro where squadra_id is null; r := r || ' generale=' || x;
  select count(*) into x from tipi_lavoro_squadra where squadra_id = mia; r := r || ' spunte sua=' || x;
  select count(*) into x from tipi_lavoro where squadra_id = rivali; r := r || ' altra squadra=' || x;
  select count(*) into x from tipi_lavoro_squadra where squadra_id = rivali; r := r || ' spunte altra=' || x;
  begin insert into tipi_lavoro (squadra_id, sigla, gruppo, peso) values (mia, 'FALSO', 'soglia', 2); r := r || ' | atleta aggiunge=PERMESSO';
  exception when others then r := r || ' | atleta aggiunge=no'; end;
  update tipi_lavoro set peso = 0.1 where squadra_id = mia; get diagnostics x = row_count; r := r || ' modifica=' || x;
  delete from tipi_lavoro_squadra where squadra_id = mia; get diagnostics x = row_count; r := r || ' toglie spunte=' || x;

  -- COACH a stagione chiusa
  execute 'reset role';
  insert into impostazioni_squadra (squadra_id, permessi) values (mia, '{"s_sola": true}')
    on conflict (squadra_id) do update set permessi = impostazioni_squadra.permessi || '{"s_sola": true}';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated')::text, true);
  begin insert into tipi_lavoro (squadra_id, sigla, gruppo, peso) values (mia, 'CHIUSO', 'soglia', 2); r := r || E'\nstagione chiusa: coach aggiunge=PERMESSO';
  exception when others then r := r || E'\nstagione chiusa: coach aggiunge=no'; end;
  update tipi_lavoro set peso = 2 where squadra_id = mia; get diagnostics x = row_count; r := r || ' modifica=' || x;

  raise exception E'VERIFICA 06 (annullata)\n%', r;
end $$;
