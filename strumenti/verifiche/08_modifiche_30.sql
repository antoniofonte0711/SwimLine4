-- VERIFICA 08 — Migrazione 30 (11/10/2026 sera): notifiche nuove, silenzio, domanda di squadra annullabile,
-- allenamento fuori piano, categorie FIN ai compagni, account eliminato e ripristinato.
-- SOLO ANTEPRIMA (gpxteehblkitzfniqobm), execute_sql; tutto annullato alla fine.
-- Atteso: categorie ok | compagni: categoria sì, data di nascita no | domanda → notifica coach=1 | annulla ok, domanda=0
--   | risposta coach → notifica=1 | tempi dal coach (2 righe) → notifiche=1 | tempo gara dal coach → 1 | atleta da sé → 0
--   | fuori piano → notifica coach=1, doppione bloccato, Marco non lo vede, Marco non risponde, coach accetta → notifica=1
--   | segnalazione → admin=1 | silenzio sempre=2999, riattiva=null | sesso: io sì, compagno no, coach sì
--   | email recupero → notifica=1 | elimina: nascosto al coach e ai compagni, genitore non vede, niente notifiche, bloccato
--   | ripristino: torna in squadra, sbloccato
-- Risultato dell'11/10/2026 sera: tutto come atteso (Giulia 2012 F = Juniores nella stagione 2026/27).
do $$
declare
  coach uuid := 'a0000000-0000-4000-8000-000000000001';
  giulia uuid := 'a0000000-0000-4000-8000-000000000011';
  marco uuid := 'a0000000-0000-4000-8000-000000000012';
  sofia uuid := 'a0000000-0000-4000-8000-000000000013';
  adm uuid := 'a0000000-0000-4000-8000-000000000017';
  gen uuid := 'a0000000-0000-4000-8000-000000000021';
  sq uuid := 'b0000000-0000-4000-8000-000000000001';
  nome_sq text; r text := ''; x int; t text; rid uuid; eid uuid; d timestamptz;
  imposta text := 'select set_config(''request.jwt.claims'', json_build_object(''sub'', $1, ''role'', ''authenticated'')::text, true)';
begin
  select nome into nome_sq from squadre where id = sq;
  update profiles set role = 'admin' where id = adm;
  update profiles set data_nascita = '2012-05-01', sesso = 'F' where id = giulia;
  update profiles set data_nascita = '2010-05-01', sesso = null where id = marco;
  insert into genitori_figli (genitore_id, atleta_id, stato) values (gen, giulia, 'approvato') on conflict (genitore_id, atleta_id) do update set stato = 'approvato';

  -- categorie FIN (stagione 2025/26)
  r := 'categorie: ' || categoria_fin('2010-05-01', 'M', '2026-03-01') || ', ' || categoria_fin('2010-05-01', 'F', '2026-03-01')
    || ', ' || categoria_fin('2010-05-01', null, '2026-03-01');

  execute 'set local role authenticated';
  -- compagni: Sofia vede la categoria di Giulia, la colonna data di nascita non esiste
  execute imposta using sofia;
  select categoria into t from compagni_squadra where id = giulia; r := r || E'\ncompagni: Giulia=' || coalesce(t, 'null');
  select count(*) into x from information_schema.columns where table_name = 'compagni_squadra' and column_name = 'data_nascita';
  r := r || ', colonna data_nascita=' || x;

  -- domanda di entrare: Sofia esce dalla squadra e chiede di rientrare
  reset role; update profiles set squadra_id = null where id = sofia; execute 'set local role authenticated';
  execute imposta using sofia;
  perform chiedi_di_entrare(nome_sq);
  select id into rid from richieste_squadra where persona_id = sofia and stato = 'in_attesa';
  reset role; select count(*) into x from notifiche where destinatario_id = coach and tipo = 'domanda_squadra'; execute 'set local role authenticated';
  r := r || E'\ndomanda → notifica coach=' || x;
  execute imposta using marco;
  begin perform annulla_mia_domanda(rid); r := r || ' | Marco annulla quella di Sofia: PERMESSO (BUG)';
  exception when others then r := r || ' | Marco non la annulla'; end;
  execute imposta using sofia;
  perform annulla_mia_domanda(rid);
  reset role; select count(*) into x from richieste_squadra where id = rid; execute 'set local role authenticated';
  r := r || ' | annullata, domanda=' || x;
  execute imposta using sofia;
  perform chiedi_di_entrare(nome_sq);
  select id into rid from richieste_squadra where persona_id = sofia and stato = 'in_attesa';
  execute imposta using coach;
  perform rispondi_domanda(rid, true);
  reset role; select count(*) into x from notifiche where destinatario_id = sofia and tipo = 'squadra'; execute 'set local role authenticated';
  r := r || ' | risposta coach → notifica=' || x;

  -- tempi inseriti dal coach: una notifica sola per l'allenamento, una per la gara; quelli dell'atleta no
  execute imposta using coach;
  insert into allenamenti (atleta_id, tipo_lavoro, distanza, passaggi, data_allenamento) values
    (marco, 'A2', 100, '["1''10\"00"]', current_date), (marco, 'A2', 100, '["1''09\"00"]', current_date);
  insert into gare (atleta_id, nome_gara, distanza, stile, tempo, data_gara) values (marco, 'Prova', 100, 'Stile libero', '1''05"00', current_date);
  execute imposta using giulia;
  insert into allenamenti (atleta_id, tipo_lavoro, distanza, passaggi, data_allenamento) values (giulia, 'A2', 100, '["1''12\"00"]', current_date);
  reset role;
  select count(*) into x from notifiche where destinatario_id = marco and tipo = 'tempi' and link = '/progressi'; r := r || E'\ntempi dal coach (2 righe) → ' || x;
  select count(*) into x from notifiche where destinatario_id = marco and tipo = 'tempi' and link = '/gare'; r := r || ' | gara → ' || x;
  select count(*) into x from notifiche where destinatario_id = giulia and tipo = 'tempi'; r := r || ' | atleta da sé → ' || x;
  execute 'set local role authenticated';

  -- allenamento fuori piano
  execute imposta using giulia;
  eid := proponi_allenamento_extra(current_date - 1, 3000, 60, '10x100 A2');
  reset role; select count(*) into x from notifiche where destinatario_id = coach and tipo = 'fuori_piano'; execute 'set local role authenticated';
  r := r || E'\nfuori piano → notifica coach=' || x;
  execute imposta using giulia;
  begin perform proponi_allenamento_extra(current_date - 1, 2000, null, null); r := r || ' | doppione: PERMESSO (BUG)';
  exception when others then r := r || ' | doppione bloccato'; end;
  begin perform proponi_allenamento_extra(current_date + 1, 2000, null, null); r := r || ' | futuro: PERMESSO (BUG)';
  exception when others then r := r || ' | futuro bloccato'; end;
  execute imposta using marco;
  select count(*) into x from allenamenti_extra where id = eid; r := r || ' | Marco lo vede=' || x;
  begin perform rispondi_allenamento_extra(eid, true); r := r || ' | Marco risponde: PERMESSO (BUG)';
  exception when others then r := r || ' | Marco non risponde'; end;
  execute imposta using gen;
  select count(*) into x from allenamenti_extra where id = eid; r := r || ' | genitore lo vede=' || x;
  execute imposta using coach;
  perform rispondi_allenamento_extra(eid, true);
  reset role; select count(*) into x from notifiche where destinatario_id = giulia and tipo = 'fuori_piano_esito'; execute 'set local role authenticated';
  r := r || ' | accettato → notifica=' || x;

  -- segnalazione → admin
  execute imposta using marco;
  insert into segnalazioni (autore_id, testo) values (marco, 'Prova segnalazione');
  reset role; select count(*) into x from notifiche where destinatario_id = adm and tipo = 'segnalazione'; execute 'set local role authenticated';
  r := r || E'\nsegnalazione → admin=' || x;

  -- silenzio
  execute imposta using marco;
  d := silenzia_notifiche(-1); r := r || ' | silenzio sempre=' || extract(year from d);
  d := silenzia_notifiche(8); r := r || ', 8 ore=' || round(extract(epoch from d - now()) / 3600);
  d := silenzia_notifiche(null); r := r || ', riattiva=' || coalesce(d::text, 'null');

  -- sesso per la categoria
  perform imposta_sesso(marco, 'M');
  begin perform imposta_sesso(giulia, 'M'); r := r || E'\nsesso di un compagno: PERMESSO (BUG)';
  exception when others then r := r || E'\nsesso: compagno no'; end;
  execute imposta using coach;
  perform imposta_sesso(giulia, 'F'); r := r || ', coach sì';

  -- email di recupero → notifica
  reset role;
  update auth.users set recovery_sent_at = now() where id = marco;
  select count(*) into x from notifiche where destinatario_id = marco and tipo = 'email'; r := r || E'\nemail recupero → notifica=' || x;
  execute 'set local role authenticated';

  -- Giulia elimina l'account
  execute imposta using giulia;
  perform elimina_mio_account();
  execute imposta using coach;
  select count(*) into x from profiles where id = giulia; r := r || E'\nelimina: coach vede=' || x;
  execute imposta using marco;
  select count(*) into x from compagni_squadra where id = giulia; r := r || ', compagni vedono=' || x;
  execute imposta using gen;
  select count(*) into x from allenamenti where atleta_id = giulia; r := r || ', genitore vede allenamenti=' || x;
  select count(*) into x from genitori_figli where atleta_id = giulia; r := r || ', collegamento visibile=' || x;
  reset role;
  perform crea_notifica(giulia, 'avviso', 'Prova', 'Prova', null, null);
  select count(*) into x from notifiche where destinatario_id = giulia and tipo = 'avviso'; r := r || ', notifiche nuove=' || x;
  select extract(year from banned_until)::text into t from auth.users where id = giulia; r := r || ', bloccato fino al ' || coalesce(t, 'MAI (BUG)');
  execute 'set local role authenticated';
  execute imposta using marco;
  begin perform admin_ripristina_account(giulia); r := r || ' | Marco ripristina: PERMESSO (BUG)';
  exception when others then r := r || ' | Marco non ripristina'; end;
  execute imposta using adm;
  select count(*) into x from admin_account_eliminati(); r := r || E'\nadmin vede eliminati=' || x;
  perform admin_ripristina_account(giulia);
  reset role;
  select coalesce((select nome from squadre where id = squadra_id), 'senza squadra (BUG)') into t from profiles where id = giulia; r := r || ' | ripristinata in ' || t;
  select coalesce(banned_until::text, 'sbloccata') into t from auth.users where id = giulia; r := r || ', ' || t;

  raise exception E'VERIFICA 08 (annullata)\n%', r;
end $$;
