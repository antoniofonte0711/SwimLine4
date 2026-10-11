-- VERIFICA 04 — Permessi di base, trigger, vasca 25/50, notifica "aggiunto alla squadra", premio grande.
-- SOLO ANTEPRIMA (gpxteehblkitzfniqobm), execute_sql; tutto annullato.
-- Atteso (11/10/2026): anon squadre>0 | anon allenamenti bloccato | anon is_admin bloccato | Marco crea profilo bloccato
--   | chiama trigger bloccato | punti dopo gara=+1 | notifica a Pietro=1 | vasca 25 vs 50 record=0 | stessa vasca record=1
--   | vasca 33 rifiutata | premio grande: mai prima di 7 aperture, in media ~9 su 300
do $$
declare
  coach uuid := 'a0000000-0000-4000-8000-000000000001';
  marco uuid := 'a0000000-0000-4000-8000-000000000012';
  pietro uuid := 'a0000000-0000-4000-8000-000000000018';
  luca uuid := 'a0000000-0000-4000-8000-000000000014';
  sq uuid; r text := ''; x int; n0 int; pr premi_atleta; last int := 0; nb int := 0; minimo int := 999;
begin
  select squadra_id into sq from profiles where id = coach;
  update profiles set squadra_id = null where id = pietro;
  -- anonimo
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into x from squadre; r := r || 'anon squadre=' || x;
  begin select count(*) into x from allenamenti; r := r || ' | anon allenamenti=' || x; exception when others then r := r || ' | anon allenamenti bloccato'; end;
  begin perform public.is_admin(); r := r || ' | anon is_admin PERMESSO'; exception when others then r := r || ' | anon is_admin bloccato'; end;
  execute 'reset role';
  -- atleta
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', marco, 'role', 'authenticated')::text, true);
  begin insert into profiles (id, nome, role) values (marco, 'X', 'admin'); r := r || ' | Marco crea profilo PERMESSO (BUG)'; exception when others then r := r || ' | Marco crea profilo bloccato'; end;
  begin perform public.trg_record_gare(); r := r || ' | chiama trigger PERMESSO'; exception when others then r := r || ' | chiama trigger bloccato'; end;
  select count(*) into x from punti_movimenti where atleta_id = marco;
  insert into gare (atleta_id, nome_gara, distanza, stile, tempo, data_gara) values (marco, 'Prova', 100, 'Stile libero', '59"00', current_date);
  select count(*) - x into x from punti_movimenti where atleta_id = marco; r := r || ' | punti dopo gara=+' || x;
  -- coach aggiunge Pietro
  perform set_config('request.jwt.claims', json_build_object('sub', coach, 'role', 'authenticated')::text, true);
  perform public.aggiungi_a_squadra(pietro, sq);
  -- conta come Pietro (il coach giustamente non legge le notifiche altrui)
  perform set_config('request.jwt.claims', json_build_object('sub', pietro, 'role', 'authenticated')::text, true);
  select count(*) into x from notifiche where destinatario_id = pietro and tipo = 'squadra'; r := r || ' | notifica a Pietro=' || x;
  -- vasca
  perform set_config('request.jwt.claims', json_build_object('sub', luca, 'role', 'authenticated')::text, true);
  insert into gare (atleta_id, nome_gara, distanza, stile, vasca, tempo, data_gara) values (luca, 'Estate', 150, 'Farfalla', 50, '2''10"00', '2026-07-01');
  select count(*) into n0 from notifiche where destinatario_id = luca and tipo = 'record';
  insert into gare (atleta_id, nome_gara, distanza, stile, vasca, tempo, data_gara) values (luca, 'Inverno', 150, 'Farfalla', 25, '2''05"00', '2026-10-01');
  select count(*) - n0 into x from notifiche where destinatario_id = luca and tipo = 'record'; r := r || E'\nvasca 25 vs 50 record=' || x;
  insert into gare (atleta_id, nome_gara, distanza, stile, vasca, tempo, data_gara) values (luca, 'Inverno 2', 150, 'Farfalla', 25, '2''04"00', '2026-10-08');
  select count(*) - n0 into x from notifiche where destinatario_id = luca and tipo = 'record'; r := r || ' | stessa vasca record=' || x;
  begin insert into gare (atleta_id, nome_gara, distanza, stile, vasca, tempo, data_gara) values (luca, 'X', 100, 'Rana', 33, null, current_date); r := r || ' | vasca 33 PERMESSA (BUG)';
  exception when others then r := r || ' | vasca 33 rifiutata'; end;
  -- premio grande: 300 aperture
  execute 'reset role';
  delete from premi_atleta where atleta_id = marco;
  insert into premi_catalogo (squadra_id, nome, peso, grande) values (sq, 'piccolo A', 6, false), (sq, 'piccolo B', 3, false), (sq, 'GRANDE', 3, true);
  insert into punti_movimenti (atleta_id, squadra_id, punti, motivo, riferimento, data) values (marco, sq, 30000, 'test', 'test-sim', current_date);
  for i in 1 .. 300 loop
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', json_build_object('sub', marco, 'role', 'authenticated')::text, true);
    pr := public.apri_premio();
    execute 'reset role';
    update premi_atleta set ottenuto_il = now() + i * interval '1 day' where id = pr.id;
    if pr.grande then nb := nb + 1; minimo := least(minimo, i - last); last := i; end if;
  end loop;
  r := r || E'\npremio grande: ' || nb || ' su 300, intervallo minimo ' || minimo || ', medio ' || round(300.0 / greatest(nb, 1), 1);
  raise exception E'VERIFICA 04 (annullata)\n%', r;
end $$;
