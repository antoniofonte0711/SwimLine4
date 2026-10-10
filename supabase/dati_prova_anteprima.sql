-- ============================================
-- SwimLine4 — dati di PROVA per il database di ANTEPRIMA (mai sul database vero)
-- Tutto inventato: nomi ed email finte (@swimline4.test), nessun dato reale.
-- Gli account non hanno password: non si entra con loro. Servono a riempire la squadra;
-- per vederla si entra col proprio account admin → Profilo → Squadre → Entra, e "Vedi l'app come".
-- Si può rieseguire: cancella e ricrea solo i dati di prova (id che iniziano con a0000000/b0000000).
-- ============================================
begin;

-- tempo in secondi -> 1'05"30 / 59"80 (come li scrive l'app)
create or replace function pg_temp.t(sec numeric) returns text language sql immutable as $$
  select case when floor(sec / 60) = 0
    then floor(sec)::int || '"' || lpad((floor((sec - floor(sec)) * 100))::int::text, 2, '0')
    else floor(sec / 60)::int || '''' || lpad((floor(sec)::int % 60)::text, 2, '0') || '"' || lpad((floor((sec - floor(sec)) * 100))::int::text, 2, '0')
  end
$$;

-- pulizia dei dati di prova precedenti
update public.profiles set squadra_id = null where squadra_id = 'b0000000-0000-4000-8000-000000000001';
delete from public.squadre where id = 'b0000000-0000-4000-8000-000000000001';
delete from auth.users where id::text like 'a0000000-0000-4000-8000-%';

-- persone: 1 coach, 8 atleti, 1 genitore (velocità base sui 100 stile libero, in secondi)
create temp table persone (id uuid, nome text, cognome text, ruolo text, base numeric, stile text) on commit drop;
insert into persone values
  ('a0000000-0000-4000-8000-000000000001', 'Coach', 'Prova', 'coach', null, null),
  ('a0000000-0000-4000-8000-000000000011', 'Giulia', 'Prova', 'atleta', 62, 'Stile libero'),
  ('a0000000-0000-4000-8000-000000000012', 'Marco', 'Prova', 'atleta', 58, 'Farfalla'),
  ('a0000000-0000-4000-8000-000000000013', 'Sofia', 'Prova', 'atleta', 66, 'Dorso'),
  ('a0000000-0000-4000-8000-000000000014', 'Luca', 'Prova', 'atleta', 70, 'Rana'),
  ('a0000000-0000-4000-8000-000000000015', 'Emma', 'Prova', 'atleta', 64, 'Stile libero'),
  ('a0000000-0000-4000-8000-000000000016', 'Tommaso', 'Prova', 'atleta', 60, 'Misti'),
  ('a0000000-0000-4000-8000-000000000017', 'Alice', 'Prova', 'atleta', 72, 'Dorso'),
  ('a0000000-0000-4000-8000-000000000018', 'Pietro', 'Prova', 'atleta', 68, 'Rana'),
  ('a0000000-0000-4000-8000-000000000021', 'Genitore', 'Prova', 'genitore', null, null);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated',
  lower(nome) || '.' || right(id::text, 2) || '@swimline4.test', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now() - interval '60 days', now(),
  '', '', '', '', '', '', '', ''
from persone;

insert into public.squadre (id, nome, coach_id) values
  ('b0000000-0000-4000-8000-000000000001', 'Squadra di prova', 'a0000000-0000-4000-8000-000000000001');

insert into public.profiles (id, nome, cognome, role, squadra_id)
select id, nome, cognome, ruolo, 'b0000000-0000-4000-8000-000000000001' from persone
on conflict (id) do update set nome = excluded.nome, cognome = excluded.cognome, role = excluded.role, squadra_id = excluded.squadra_id;

insert into public.punti_config (squadra_id) values ('b0000000-0000-4000-8000-000000000001') on conflict do nothing;

-- allenamenti del coach: lunedì-venerdì dalle 3 settimane scorse alla prossima, tre programmi a rotazione
create temp table programmi (n int, titolo text, righe jsonb) on commit drop;
insert into programmi values
 (0, 'Aerobico', $j$[
  {"tipo_lavoro":"Riscaldamento","distanza":400,"ripetizioni":1,"stile":"Stile libero","note":"","minuti":8,"ripartenza":null,"ripartenze":null},
  {"tipo_lavoro":"A2","distanza":200,"ripetizioni":6,"stile":"Stile libero","note":"Respirazione ogni 3","minuti":null,"ripartenza":"3'30\"","ripartenze":null},
  {"tipo_lavoro":"Gambe","distanza":50,"ripetizioni":8,"stile":"Proprio stile","note":"Con tavoletta","minuti":null,"ripartenza":"1'10\"","ripartenze":null},
  {"tipo_lavoro":"B1","distanza":100,"ripetizioni":6,"stile":"Stile libero","note":"","minuti":null,"ripartenza":"1'50\"","ripartenze":null},
  {"tipo_lavoro":"Defaticamento","distanza":200,"ripetizioni":1,"stile":"Stile libero","note":"","minuti":5,"ripartenza":null,"ripartenze":null}]$j$),
 (1, 'Ritmo gara', $j$[
  {"tipo_lavoro":"Riscaldamento","distanza":300,"ripetizioni":1,"stile":"Misti","note":"","minuti":7,"ripartenza":null,"ripartenze":null},
  {"tipo_lavoro":"Tecnica","distanza":50,"ripetizioni":8,"stile":"Proprio stile","note":"Esercizi di bracciata","minuti":null,"ripartenza":"1'15\"","ripartenze":null},
  {"tipo_lavoro":"C1","distanza":100,"ripetizioni":6,"stile":"Stile libero","note":"Tutto forte","minuti":null,"ripartenza":"2'30\"","ripartenze":null},
  {"tipo_lavoro":"Passo gara 50","distanza":50,"ripetizioni":4,"stile":"Proprio stile","note":"","minuti":null,"ripartenza":"2'00\"","ripartenze":null},
  {"tipo_lavoro":"Defaticamento","distanza":300,"ripetizioni":1,"stile":"Stile libero","note":"","minuti":6,"ripartenza":null,"ripartenze":null}]$j$),
 (2, 'Soglia', $j$[
  {"tipo_lavoro":"Riscaldamento","distanza":400,"ripetizioni":1,"stile":"Stile libero","note":"","minuti":8,"ripartenza":null,"ripartenze":null},
  {"tipo_lavoro":"B2","distanza":400,"ripetizioni":3,"stile":"Stile libero","note":"","minuti":null,"ripartenza":"6'30\"","ripartenze":null},
  {"tipo_lavoro":"C2","distanza":100,"ripetizioni":4,"stile":"Proprio stile","note":"Recupero lungo","minuti":null,"ripartenza":"3'00\"","ripartenze":null},
  {"tipo_lavoro":"Sciolto","distanza":200,"ripetizioni":1,"stile":"Dorso","note":"","minuti":4,"ripartenza":null,"ripartenze":null}]$j$);

insert into public.allenamenti_squadra (squadra_id, coach_id, data, titolo, righe, visibilita, pubblicato)
select 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', g::date, p.titolo, p.righe, 'squadra', true
from generate_series(date_trunc('week', current_date) - interval '21 days', date_trunc('week', current_date) + interval '11 days', interval '1 day') g
join programmi p on p.n = (extract(doy from g)::int % 3)
where extract(isodow from g) between 1 and 5;

-- presenze dei giorni passati: 80% presente, qualche assente, qualche assenza non penale
insert into public.presenze (atleta_id, data, stato, segnato_da)
select id, data,
  case when r < 0.8 then 'presente' when r < 0.93 then 'assente' else 'non_penale' end,
  'a0000000-0000-4000-8000-000000000001'
from (
  select pe.id, a.data, random() as r
  from public.allenamenti_squadra a cross join persone pe
  where a.squadra_id = 'b0000000-0000-4000-8000-000000000001' and a.data < current_date and pe.ruolo = 'atleta'
) s;

-- tempi registrati negli allenamenti a cui erano presenti: 6x100 stile libero C1 (più veloci col passare dei giorni)
insert into public.allenamenti (atleta_id, tipo_lavoro, distanza, ripetizioni, stile, passaggi, data_allenamento)
select pr.atleta_id, 'C1', 100, 6, 'Stile libero',
  (select jsonb_agg(pg_temp.t(pe.base + 3 + (current_date - pr.data) * 0.08 + k * 0.35 + random()::numeric * 1.2) order by k)
     from generate_series(0, 5) k),
  pr.data
from public.presenze pr join persone pe on pe.id = pr.atleta_id
where pr.stato = 'presente' and extract(isodow from pr.data) in (1, 3, 5);

-- gare: 6 gare negli ultimi 3 mesi, con 50/100 stile libero e 100 nel proprio stile
insert into public.gare (atleta_id, nome_gara, distanza, stile, tempo, data_gara)
select pe.id, 'Trofeo di prova ' || n, d.distanza, d.stile,
  pg_temp.t(case d.distanza when 50 then pe.base * 0.46 else pe.base end
            * case when d.stile = 'Stile libero' then 1 else 1.12 end
            + (6 - n) * 0.4 + random()::numeric * 0.8),
  (current_date - (100 - n * 15))::date
from persone pe
cross join generate_series(1, 6) n
cross join lateral (values (50, 'Stile libero'), (100, 'Stile libero'), (100, coalesce(nullif(pe.stile, 'Stile libero'), 'Dorso'))) d(distanza, stile)
where pe.ruolo = 'atleta';

commit;
