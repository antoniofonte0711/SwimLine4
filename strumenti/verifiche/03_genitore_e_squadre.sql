-- VERIFICA 03 — Collegamento genitore→atleta e creazione squadre dell'admin.
-- SOLO ANTEPRIMA (gpxteehblkitzfniqobm), execute_sql; tutto annullato.
-- Atteso (11/10/2026): richieste=1 | PRIMA=0 | notifica a Marco=1 | Pietro bloccato | DOPO > 0 | Pietro (non figlio)=0
--   | notifica approvazione=1 | gen scrive allenamento: bloccato | gen chiede il coach=0
--   | atleta crea squadra: bloccato | crea senza coach ok "Esordienti" | doppione/vuoto/coach impegnato: bloccati | Luca coach in Master
do $$
declare
  gen uuid := 'a0000000-0000-4000-8000-000000000021';
  marco uuid := 'a0000000-0000-4000-8000-000000000012';
  pietro uuid := 'a0000000-0000-4000-8000-000000000018';
  adm uuid := 'a0000000-0000-4000-8000-000000000017';
  coach uuid := 'a0000000-0000-4000-8000-000000000001';
  luca uuid := 'a0000000-0000-4000-8000-000000000014';
  r text := ''; n int; lid uuid; x int; sid uuid; t text;
begin
  update profiles set role = 'admin' where id = adm;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', gen, 'role','authenticated')::text, true);
  n := public.chiedi_figli(array[marco]); r := r || 'richieste=' || n;
  select count(*) into x from allenamenti where atleta_id = marco; r := r || ' | PRIMA=' || x;
  perform set_config('request.jwt.claims', json_build_object('sub', marco, 'role','authenticated')::text, true);
  select count(*) into x from notifiche where destinatario_id = marco and tipo = 'richiesta_genitore'; r := r || ' | notifica a Marco=' || x;
  select id into lid from genitori_figli where atleta_id = marco and genitore_id = gen;
  perform public.rispondi_genitore(lid, true);
  perform set_config('request.jwt.claims', json_build_object('sub', pietro, 'role','authenticated')::text, true);
  begin perform public.rispondi_genitore(lid, false); r := r || ' | Pietro risponde: PERMESSO (BUG)';
  exception when others then r := r || ' | Pietro bloccato'; end;
  perform set_config('request.jwt.claims', json_build_object('sub', gen, 'role','authenticated')::text, true);
  select count(*) into x from allenamenti where atleta_id = marco; r := r || ' | DOPO=' || x;
  select count(*) into x from allenamenti where atleta_id = pietro; r := r || ' | Pietro (non figlio)=' || x;
  select count(*) into x from notifiche where destinatario_id = gen and tipo = 'risposta_genitore'; r := r || ' | notifica approvazione=' || x;
  begin insert into allenamenti (atleta_id, tipo_lavoro, distanza, data_allenamento) values (marco, 'A2', 100, current_date); r := r || ' | gen scrive allenamento: PERMESSO (BUG)';
  exception when others then r := r || ' | gen scrive allenamento: bloccato'; end;
  n := public.chiedi_figli(array[coach]); r := r || ' | gen chiede il coach=' || n;
  perform set_config('request.jwt.claims', json_build_object('sub', luca, 'role','authenticated')::text, true);
  begin perform public.admin_crea_squadra('Squadra Hacker', null); r := r || E'\natleta crea squadra: PERMESSO (BUG)';
  exception when others then r := r || E'\natleta crea squadra: bloccato'; end;
  perform set_config('request.jwt.claims', json_build_object('sub', adm, 'role','authenticated')::text, true);
  sid := public.admin_crea_squadra('  Esordienti  ', null); select nome into t from squadre where id = sid; r := r || ' | crea senza coach ok "' || t || '"';
  begin perform public.admin_crea_squadra('esordienti', null); r := r || ' | doppione: PERMESSO (BUG)'; exception when others then r := r || ' | doppione bloccato'; end;
  begin perform public.admin_crea_squadra('   ', null); r := r || ' | vuoto: PERMESSO (BUG)'; exception when others then r := r || ' | vuoto bloccato'; end;
  begin perform public.admin_crea_squadra('Master', coach); r := r || ' | coach impegnato: PERMESSO (BUG)'; exception when others then r := r || ' | coach impegnato bloccato'; end;
  sid := public.admin_crea_squadra('Master', luca);
  select role || ' in ' || (select nome from squadre where id = squadra_id) into t from profiles where id = luca; r := r || ' | Luca ' || t;
  raise exception E'VERIFICA 03 (annullata)\n%', r;
end $$;
