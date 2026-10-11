-- VERIFICA 01 — Pannello di controllo: solo l'admin può usarlo.
-- Da eseguire SOLO sul database di ANTEPRIMA (gpxteehblkitzfniqobm) con execute_sql: tutto viene annullato alla fine
-- (l'ultima riga solleva un errore apposta e il risultato si legge nel messaggio).
-- Utenti di prova dell'anteprima: coach ...01, atleta Marco ...12, genitore ...21, Alice ...17 (promossa admin solo qui).
do $$
declare
  persone uuid[] := array['a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000021']::uuid[];
  nomi text[] := array['coach', 'atleta', 'genitore'];
  alice uuid := 'a0000000-0000-4000-8000-000000000017';
  marco uuid := 'a0000000-0000-4000-8000-000000000012';
  r text := ''; x int; i int; chi uuid; esito text;
begin
  update profiles set role = 'admin' where id = alice; -- solo dentro questa prova
  execute 'set local role authenticated';
  for i in 1 .. 3 loop
    chi := persone[i];
    perform set_config('request.jwt.claims', json_build_object('sub', chi, 'role', 'authenticated')::text, true);
    esito := '';
    begin perform public.admin_statistiche(); esito := esito || ' statistiche:SI'; exception when others then esito := esito || ' statistiche:no'; end;
    begin perform public.admin_avviso('prova', 'tutti', null); esito := esito || ' avviso:SI'; exception when others then esito := esito || ' avviso:no'; end;
    begin perform public.coach_da_approvare(); esito := esito || ' coach_da_approvare:SI'; exception when others then esito := esito || ' coach_da_approvare:no'; end;
    begin perform public.approva_coach(marco, true, 'X'); esito := esito || ' approva_coach:SI'; exception when others then esito := esito || ' approva_coach:no'; end;
    begin perform public.admin_crea_squadra('Squadra pirata ' || i, null); esito := esito || ' crea_squadra:SI'; exception when others then esito := esito || ' crea_squadra:no'; end;
    update profiles set role = 'admin' where id = chi; get diagnostics x = row_count; esito := esito || ' si_fa_admin:' || case when x > 0 then 'SI' else 'no' end;
    update profiles set role = 'coach' where id = marco and chi <> marco; get diagnostics x = row_count; esito := esito || ' cambia_ruolo_altri:' || case when x > 0 then 'SI' else 'no' end;
    begin insert into impostazioni_app (chiave, valore) values ('funzioni', '{"punti": false}') on conflict (chiave) do update set valore = excluded.valore; get diagnostics x = row_count; esito := esito || ' impostazioni_app:' || case when x > 0 then 'SI' else 'no' end;
    exception when others then esito := esito || ' impostazioni_app:no'; end;
    begin insert into impostazioni_squadra (squadra_id, permessi) select id, '{}' from squadre limit 1 on conflict (squadra_id) do update set permessi = excluded.permessi; get diagnostics x = row_count; esito := esito || ' permessi_squadra:' || case when x > 0 then 'SI' else 'no' end;
    exception when others then esito := esito || ' permessi_squadra:no'; end;
    select count(*) into x from segnalazioni; esito := esito || ' legge_segnalazioni:' || x;
    select count(*) into x from accessi_admin; esito := esito || ' legge_accessi_admin:' || x;
    begin select count(*) into x from segreti; esito := esito || ' legge_segreti:' || x; exception when others then esito := esito || ' legge_segreti:no'; end;
    r := r || nomi[i] || ' ->' || esito || E'\n';
  end loop;
  -- per confronto: l'admin vero può
  perform set_config('request.jwt.claims', json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  esito := '';
  begin perform public.admin_statistiche(); esito := esito || ' statistiche:SI'; exception when others then esito := esito || ' statistiche:no(' || sqlerrm || ')'; end;
  begin perform public.coach_da_approvare(); esito := esito || ' coach_da_approvare:SI'; exception when others then esito := esito || ' coach_da_approvare:no'; end;
  select count(*) into x from segnalazioni; esito := esito || ' legge_segnalazioni:' || x;
  r := r || 'ADMIN ->' || esito;
  raise exception E'VERIFICA 01 (annullata)\n%', r;
end $$;
