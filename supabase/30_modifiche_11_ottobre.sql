-- ============================================
-- SwimLine4 — 30: modifiche chieste l'11 ottobre 2026 (sera)
-- - notifiche: richiesta di entrare → al coach; tempi messi dal coach → all'atleta; segnalazione → all'admin;
--   "Password dimenticata" → avviso sui telefoni già usati; ognuno può silenziarle (1 ora … per sempre)
-- - chi ha chiesto di entrare può annullare la domanda
-- - allenamento fuori piano: l'atleta lo propone, il coach lo accetta o lo rifiuta (notifica silenziosa)
-- - compagni di squadra con la categoria FIN (l'anno di nascita lo vede solo il coach); sesso per le categorie
-- - "Elimina il mio account": l'account si chiude ma resta recuperabile dall'admin per 30 giorni, poi si cancella
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- Dopo, una tantum: pubblicare la funzione "pulizia" (supabase/functions/pulizia) e la nuova "notifiche".
-- ============================================

-- ---------- nuove colonne del profilo ----------
alter table public.profiles add column if not exists notifiche_silenzio_fino timestamp with time zone;
alter table public.profiles add column if not exists sesso text;
alter table public.profiles add column if not exists eliminato_il timestamp with time zone;
alter table public.profiles add column if not exists squadra_prima uuid references public.squadre(id) on delete set null;
do $$ begin
  alter table public.profiles add constraint profiles_sesso_check check (sesso in ('M', 'F'));
exception when duplicate_object then null; end $$;

-- account chiuso dal suo proprietario (in attesa di cancellazione definitiva)?
create or replace function public.account_eliminato(p_persona uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = p_persona and eliminato_il is not null)
$$;

-- ---------- categorie FIN (Regolamento Settore Nuoto 2025/26) ----------
-- Contano gli anni compiuti nell'anno in cui finisce la stagione (1 ottobre → 30 settembre).
-- Maschi: ES B 10-11, ES A 12-13, Ragazzi 14-16, Juniores 17-18, Cadetti 19-20, Seniores da 21.
-- Femmine: ES B 9-10, ES A 11-12, Ragazzi 13-14, Juniores 15-16, Cadetti 17-18, Seniores da 19.
-- Sesso non indicato: se le due categorie sono diverse le scrive entrambe ("Ragazzi o Juniores").
create or replace function public.categoria_fin(p_nascita date, p_sesso text, p_oggi date default current_date)
returns text language plpgsql stable set search_path = public as $$
declare v_anni int; m text; f text;
begin
  if p_nascita is null then return null; end if;
  v_anni := extract(year from p_oggi)::int + case when extract(month from p_oggi) >= 10 then 1 else 0 end
            - extract(year from p_nascita)::int;
  m := case when v_anni < 10 then 'Propaganda' when v_anni <= 11 then 'Esordienti B' when v_anni <= 13 then 'Esordienti A'
            when v_anni <= 16 then 'Ragazzi' when v_anni <= 18 then 'Juniores' when v_anni <= 20 then 'Cadetti' else 'Seniores' end;
  f := case when v_anni < 9 then 'Propaganda' when v_anni <= 10 then 'Esordienti B' when v_anni <= 12 then 'Esordienti A'
            when v_anni <= 14 then 'Ragazzi' when v_anni <= 16 then 'Juniores' when v_anni <= 18 then 'Cadetti' else 'Seniores' end;
  if p_sesso = 'M' then return m; end if;
  if p_sesso = 'F' then return f; end if;
  return case when m = f then m else m || ' o ' || f end;
end $$;

-- Compagni di squadra: nome, categoria (quella scritta dal coach nei Riferimenti, altrimenti calcolata).
-- Mai la data di nascita: quella la vede solo il coach.
create or replace view public.compagni_squadra as
  select p.id, p.nome, p.cognome, p.squadra_id, p.tempi_visibili,
         coalesce(nullif(trim(r.categoria), ''), public.categoria_fin(p.data_nascita, p.sesso)) as categoria
  from public.profiles p
  left join public.atleta_riferimenti r on r.atleta_id = p.id
  where p.role in ('atleta', 'admin') and p.squadra_id is not null and p.squadra_id = public.mia_squadra()
    and p.eliminato_il is null;

-- Sesso per le categorie: lo sceglie l'atleta (Profilo) o il suo coach (Riferimenti)
create or replace function public.imposta_sesso(p_persona uuid, p_sesso text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non autenticato'; end if;
  if p_persona <> auth.uid() and not sono_coach_di(p_persona) then raise exception 'Non puoi cambiarlo per questa persona'; end if;
  if p_sesso is not null and p_sesso not in ('M', 'F') then raise exception 'Valore non valido'; end if;
  update profiles set sesso = p_sesso where id = p_persona;
end $$;
revoke all on function public.imposta_sesso(uuid, text) from public, anon;
grant execute on function public.imposta_sesso(uuid, text) to authenticated;

-- ---------- notifiche: tipi nuovi negli interruttori del Pannello ----------
create or replace function public.notifica_attiva(p_tipo text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (valore ->> case
      when p_tipo = 'record' then 'record'
      when p_tipo like 'gara\_%' then 'gare'
      when p_tipo in ('richiesta_genitore', 'risposta_genitore') then 'genitori'
      when p_tipo = 'incoraggiamento' then 'incoraggiamenti'
      when p_tipo = 'allenamento' then 'allenamento'
      when p_tipo in ('domanda_squadra', 'squadra') then 'squadra'
      when p_tipo = 'tempi' then 'tempi'
      when p_tipo like 'fuori\_piano%' then 'fuori_piano'
      when p_tipo = 'segnalazione' then 'segnalazioni'
      when p_tipo = 'email' then 'email'
      else '__nessuna' end)::boolean
    from impostazioni_app where chiave = 'notifiche'), true)
$$;

-- a chi ha chiuso l'account non arriva più niente
create or replace function public.crea_notifica(p_dest uuid, p_tipo text, p_titolo text, p_testo text, p_link text, p_chiave text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_dest is null or not notifica_attiva(p_tipo) or account_eliminato(p_dest) then return; end if;
  if p_chiave is not null and exists (
    select 1 from notifiche where destinatario_id = p_dest and chiave = p_chiave and created_at > now() - interval '10 minutes'
  ) then return; end if;
  insert into notifiche (destinatario_id, tipo, titolo, testo, link, chiave)
  values (p_dest, p_tipo, p_titolo, p_testo, p_link, p_chiave);
end $$;
revoke all on function public.crea_notifica(uuid, text, text, text, text, text) from public, anon, authenticated;

-- Silenzio: le notifiche restano nella campanella ma non suonano sul telefono.
-- p_ore: null = riattiva, -1 = per sempre, altrimenti per quante ore
create or replace function public.silenzia_notifiche(p_ore integer)
returns timestamp with time zone language plpgsql security definer set search_path = public as $$
declare v_fino timestamp with time zone;
begin
  if auth.uid() is null then raise exception 'Non autenticato'; end if;
  -- "per sempre" = una data lontanissima (le date infinite non le leggono tutti i programmi)
  v_fino := case when p_ore is null then null when p_ore < 0 then '2999-12-31 00:00:00+00'::timestamptz
                 else now() + make_interval(hours => least(p_ore, 24 * 365)) end;
  update profiles set notifiche_silenzio_fino = v_fino where id = auth.uid();
  return v_fino;
end $$;
revoke all on function public.silenzia_notifiche(integer) from public, anon;
grant execute on function public.silenzia_notifiche(integer) to authenticated;

-- ---------- richieste di entrare in squadra: avviso al coach ----------
create or replace function public.avvisa_coach_domanda(p_squadra uuid, p_persona uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_coach uuid; v_squadra text; v_chi text; v_ruolo text;
begin
  select coach_id, nome into v_coach, v_squadra from squadre where id = p_squadra;
  select trim(coalesce(nome, '') || ' ' || coalesce(cognome, '')), role into v_chi, v_ruolo from profiles where id = p_persona;
  perform crea_notifica(v_coach, 'domanda_squadra', 'Nuova richiesta di entrare',
    coalesce(nullif(v_chi, ''), 'Una persona') || case when v_ruolo = 'genitore' then ' (genitore)' else '' end
      || ' chiede di entrare in ' || coalesce(v_squadra, 'squadra') || '. Approva o rifiuta dalla pagina Oggi.',
    '/dashboard', 'domanda:' || p_persona || ':' || p_squadra);
end $$;
revoke all on function public.avvisa_coach_domanda(uuid, uuid) from public, anon, authenticated;

create or replace function public.chiedi_di_entrare(p_nome text)
returns text language plpgsql security definer set search_path = public as $$
declare v_ruolo text; v_attuale uuid; v_squadra uuid; v_nome text;
begin
  select role, squadra_id into v_ruolo, v_attuale from profiles where id = auth.uid();
  if v_ruolo is null or v_ruolo not in ('atleta', 'genitore', 'admin') then
    raise exception 'Solo atleti e genitori possono chiedere di entrare in una squadra';
  end if;
  select id, nome into v_squadra, v_nome from squadre where lower(trim(nome)) = lower(trim(coalesce(p_nome, ''))) limit 1;
  if v_squadra is null then raise exception 'Nessuna squadra con questo nome'; end if;
  if v_attuale = v_squadra then raise exception 'Sei già in questa squadra'; end if;
  if regola_squadra(v_squadra, 's_iscrizioni') then raise exception 'Questa squadra al momento non accetta nuove iscrizioni'; end if;
  insert into richieste_squadra (squadra_id, persona_id, richiesta_da, tipo)
  values (v_squadra, auth.uid(), auth.uid(), 'domanda')
  on conflict (squadra_id, persona_id) where stato = 'in_attesa' do nothing;
  if found then perform avvisa_coach_domanda(v_squadra, auth.uid()); end if;
  return v_nome;
end $$;

-- Il coach risponde: chi aveva chiesto lo sa subito (notifica)
create or replace function public.rispondi_domanda(p_richiesta uuid, p_accetta boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_squadra uuid; v_persona uuid; v_nome text; v_nome_squadra text;
begin
  select squadra_id, persona_id into v_squadra, v_persona from richieste_squadra
  where id = p_richiesta and tipo = 'domanda' and stato = 'in_attesa';
  if v_squadra is null then raise exception 'Domanda non trovata o già gestita'; end if;
  if not public.sono_coach_squadra(v_squadra) then raise exception 'Non puoi gestire questa squadra'; end if;
  update richieste_squadra set stato = case when p_accetta then 'accettata' else 'rifiutata' end, risposta_il = now()
  where id = p_richiesta;
  if p_accetta then update profiles set squadra_id = v_squadra where id = v_persona; end if;
  select nome into v_nome_squadra from squadre where id = v_squadra;
  perform crea_notifica(v_persona, 'squadra',
    case when p_accetta then 'Sei nella squadra ' || coalesce(v_nome_squadra, '') else 'Richiesta non accettata' end,
    case when p_accetta then 'Il coach ha accettato la tua richiesta: da ora valgono le impostazioni di ' || coalesce(v_nome_squadra, 'squadra') || '.'
         else 'Il coach di ' || coalesce(v_nome_squadra, 'questa squadra') || ' non ha accettato la richiesta. Se è uno sbaglio, parlane con lui.' end,
    '/dashboard', 'risposta_domanda:' || p_richiesta);
  select trim(coalesce(nome, '') || ' ' || coalesce(cognome, '')) into v_nome from profiles where id = v_persona;
  return v_nome;
end $$;

-- Chi ha chiesto di entrare ci ripensa: la domanda sparisce anche dalla lista del coach
create or replace function public.annulla_mia_domanda(p_richiesta uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from richieste_squadra
  where id = p_richiesta and persona_id = auth.uid() and tipo = 'domanda' and stato = 'in_attesa';
  if not found then raise exception 'Richiesta non trovata o già gestita dal coach'; end if;
end $$;
revoke all on function public.annulla_mia_domanda(uuid) from public, anon;
grant execute on function public.annulla_mia_domanda(uuid) to authenticated;

-- Registrazione: profilo (con il sesso, se indicato) e domanda per la squadra scelta, con avviso al coach
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ruolo text := new.raw_user_meta_data->>'role';
  v_sesso text := new.raw_user_meta_data->>'sesso';
  v_squadra uuid;
begin
  if v_ruolo = 'coach' then
    v_ruolo := 'coach_in_attesa'; -- la squadra nasce quando l'admin approva
  elsif v_ruolo is null or v_ruolo not in ('atleta', 'genitore') then
    v_ruolo := 'atleta';
  end if;
  insert into public.profiles (id, nome, cognome, data_nascita, role, sesso)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'cognome',
    (new.raw_user_meta_data->>'data_nascita')::date,
    v_ruolo,
    case when v_sesso in ('M', 'F') then v_sesso end
  )
  on conflict (id) do nothing;

  -- squadra scelta in registrazione: diventa una domanda per il coach
  if v_ruolo in ('atleta', 'genitore') and new.raw_user_meta_data->>'squadra_id' is not null then
    select id into v_squadra from public.squadre where id::text = new.raw_user_meta_data->>'squadra_id';
    if v_squadra is not null then
      insert into public.richieste_squadra (squadra_id, persona_id, richiesta_da, tipo)
      values (v_squadra, new.id, new.id, 'domanda')
      on conflict (squadra_id, persona_id) where stato = 'in_attesa' do nothing;
      -- l'avviso non deve mai bloccare la registrazione
      begin
        perform public.avvisa_coach_domanda(v_squadra, new.id);
      exception when others then null;
      end;
    end if;
  end if;
  return new;
end;
$$;

-- ---------- tempi inseriti dal coach: avviso all'atleta (e ai genitori) ----------
create or replace function public.trg_tempi_dal_coach()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nome text; v_cosa text;
begin
  if auth.uid() is null or auth.uid() = new.atleta_id then return null; end if;
  select nome into v_nome from profiles where id = new.atleta_id;
  if tg_table_name = 'allenamenti' then
    v_cosa := 'i tempi dell''allenamento del ' || to_char(coalesce(new.data_allenamento, current_date), 'DD/MM');
    -- più righe salvate insieme = una notifica sola (stessa chiave per 10 minuti)
    perform notifica_famiglia(new.atleta_id, 'tempi', 'Nuovi tempi dal coach',
      'Il coach ha inserito ' || v_cosa || ': li trovi nei Progressi.',
      coalesce(v_nome, 'Tuo figlio') || ': il coach ha inserito ' || v_cosa || '.',
      '/progressi', 'tempi:' || new.atleta_id || ':' || coalesce(new.data_allenamento, current_date));
  else
    if new.tempo is null or (tg_op = 'UPDATE' and old.tempo is not distinct from new.tempo) then return null; end if;
    v_cosa := 'il tempo dei ' || new.distanza || ' ' || stile_breve(new.stile) || coalesce(' (' || nullif(new.nome_gara, '') || ')', '')
      || ': ' || new.tempo;
    perform notifica_famiglia(new.atleta_id, 'tempi', 'Tempo di gara dal coach',
      'Il coach ha inserito ' || v_cosa || '.', coalesce(v_nome, 'Tuo figlio') || ': il coach ha inserito ' || v_cosa || '.',
      '/gare', 'tempo_gara:' || new.id);
  end if;
  return null;
end $$;
drop trigger if exists tempi_dal_coach on public.allenamenti;
create trigger tempi_dal_coach after insert on public.allenamenti for each row execute function public.trg_tempi_dal_coach();
drop trigger if exists tempi_dal_coach on public.gare;
create trigger tempi_dal_coach after insert or update of tempo on public.gare for each row execute function public.trg_tempi_dal_coach();

-- ---------- allenamento fuori piano (fatto da solo): l'atleta lo propone, il coach decide ----------
create table if not exists public.allenamenti_extra (
  id uuid default gen_random_uuid() primary key,
  atleta_id uuid not null references public.profiles(id) on delete cascade,
  squadra_id uuid not null references public.squadre(id) on delete cascade,
  data date not null,
  metri integer not null check (metri between 100 and 30000),
  minuti integer check (minuti between 5 and 600),
  descrizione text check (length(descrizione) <= 1000),
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'accettato', 'rifiutato')),
  created_at timestamp with time zone default now(),
  risposta_il timestamp with time zone
);
create index if not exists allenamenti_extra_atleta on public.allenamenti_extra (atleta_id, data);
create index if not exists allenamenti_extra_squadra on public.allenamenti_extra (squadra_id, stato);
-- uno solo per giorno (se il coach lo rifiuta se ne può proporre un altro)
create unique index if not exists allenamenti_extra_uno_al_giorno on public.allenamenti_extra (atleta_id, data) where stato <> 'rifiutato';
alter table public.allenamenti_extra enable row level security;
drop policy if exists "extra lettura" on public.allenamenti_extra;
create policy "extra lettura" on public.allenamenti_extra for SELECT to authenticated
  using (atleta_id = (select auth.uid()) or sono_coach_squadra(squadra_id) or sono_genitore_di(atleta_id));
drop policy if exists "extra ritiro" on public.allenamenti_extra;
create policy "extra ritiro" on public.allenamenti_extra for DELETE to authenticated
  using (atleta_id = (select auth.uid()) and stato = 'in_attesa');

create or replace function public.proponi_allenamento_extra(p_data date, p_metri integer, p_minuti integer, p_descrizione text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_io record; v_coach uuid; v_id uuid;
begin
  select id, nome, cognome, role, squadra_id into v_io from profiles where id = auth.uid();
  if v_io.id is null then raise exception 'Non autenticato'; end if;
  if v_io.role not in ('atleta', 'admin') then raise exception 'Solo gli atleti propongono allenamenti'; end if;
  if v_io.squadra_id is null then raise exception 'Prima entra in una squadra: è il coach che approva'; end if;
  if regola_squadra(v_io.squadra_id, 's_sola') or not regola_squadra(v_io.squadra_id, 'a_tempi') then
    raise exception 'In questa squadra ora non si possono aggiungere allenamenti';
  end if;
  if p_data is null or p_data > current_date or p_data < current_date - 30 then
    raise exception 'Scegli un giorno degli ultimi 30 (non nel futuro)';
  end if;
  if coalesce(p_metri, 0) < 100 or p_metri > 30000 then raise exception 'Scrivi quanti metri hai fatto (da 100 a 30.000)'; end if;
  insert into allenamenti_extra (atleta_id, squadra_id, data, metri, minuti, descrizione)
  values (v_io.id, v_io.squadra_id, p_data, p_metri, nullif(p_minuti, 0), left(nullif(trim(p_descrizione), ''), 1000))
  returning id into v_id;
  select coach_id into v_coach from squadre where id = v_io.squadra_id;
  perform crea_notifica(v_coach, 'fuori_piano', 'Allenamento fuori piano',
    trim(coalesce(v_io.nome, '') || ' ' || coalesce(v_io.cognome, '')) || ' ha nuotato da solo ' || p_metri || ' m il '
      || to_char(p_data, 'DD/MM') || ': accettalo o rifiutalo dalla pagina Oggi.',
    '/dashboard', 'fuori_piano:' || v_id);
  return v_id;
exception when unique_violation then
  raise exception 'Per questo giorno hai già proposto un allenamento';
end $$;
revoke all on function public.proponi_allenamento_extra(date, integer, integer, text) from public, anon;
grant execute on function public.proponi_allenamento_extra(date, integer, integer, text) to authenticated;

create or replace function public.rispondi_allenamento_extra(p_id uuid, p_accetta boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_e record;
begin
  select * into v_e from allenamenti_extra where id = p_id and stato = 'in_attesa';
  if v_e.id is null then raise exception 'Proposta non trovata o già gestita'; end if;
  if not sono_coach_squadra(v_e.squadra_id) then raise exception 'Non puoi gestire questa squadra'; end if;
  update allenamenti_extra set stato = case when p_accetta then 'accettato' else 'rifiutato' end, risposta_il = now() where id = p_id;
  perform crea_notifica(v_e.atleta_id, 'fuori_piano_esito',
    case when p_accetta then 'Allenamento accettato' else 'Allenamento non accettato' end,
    'Il coach ' || case when p_accetta then 'ha accettato' else 'non ha accettato' end || ' il tuo allenamento fuori piano del '
      || to_char(v_e.data, 'DD/MM') || ' (' || v_e.metri || ' m)'
      || case when p_accetta then ': conta nei tuoi km.' else '.' end,
    '/dashboard?giorno=' || v_e.data, null);
end $$;
revoke all on function public.rispondi_allenamento_extra(uuid, boolean) from public, anon;
grant execute on function public.rispondi_allenamento_extra(uuid, boolean) to authenticated;

-- ---------- segnalazioni: avviso all'admin ----------
create or replace function public.trg_avvisa_segnalazione()
returns trigger language plpgsql security definer set search_path = public as $$
declare a record; v_chi text;
begin
  select trim(coalesce(nome, '') || ' ' || coalesce(cognome, '')) into v_chi from profiles where id = new.autore_id;
  for a in select id from profiles where role = 'admin' and id <> coalesce(new.autore_id, '00000000-0000-0000-0000-000000000000'::uuid) loop
    perform crea_notifica(a.id, 'segnalazione', 'Nuova segnalazione',
      coalesce(nullif(v_chi, ''), 'Un utente') || ': ' || left(new.testo, 140), '/admin?sezione=segnalazioni', null);
  end loop;
  return null;
end $$;
drop trigger if exists avvisa_segnalazione on public.segnalazioni;
create trigger avvisa_segnalazione after insert on public.segnalazioni for each row execute function public.trg_avvisa_segnalazione();

-- ---------- "Password dimenticata": avviso sui telefoni dove la persona ha già attivato le notifiche ----------
create or replace function public.trg_avviso_email_recupero()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.recovery_sent_at is not null and new.recovery_sent_at is distinct from old.recovery_sent_at then
    begin
      perform crea_notifica(new.id, 'email', 'Controlla la tua email',
        'Ti abbiamo mandato l''email per scegliere una nuova password (guarda anche nello spam). Se non l''hai chiesta tu, ignorala.',
        '/login', 'email:recupero');
    exception when others then null; -- mai bloccare l'invio dell'email
    end;
  end if;
  return new;
end $$;
drop trigger if exists avviso_email_recupero on auth.users;
create trigger avviso_email_recupero after update of recovery_sent_at on auth.users
  for each row execute function public.trg_avviso_email_recupero();

-- ---------- account chiuso dal proprietario: nascosto e bloccato, recuperabile dall'admin per 30 giorni ----------
create or replace function public.elimina_mio_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_ruolo text;
begin
  if auth.uid() is null then raise exception 'Non autenticato'; end if;
  select role into v_ruolo from public.profiles where id = auth.uid();
  if v_ruolo is not null and v_ruolo not in ('atleta', 'genitore') then
    raise exception 'Un account coach o admin si chiude chiedendo all''amministratore';
  end if;
  update public.profiles set eliminato_il = now(), squadra_prima = squadra_id, squadra_id = null,
    notifiche_silenzio_fino = null where id = auth.uid();
  delete from public.push_iscrizioni where utente_id = auth.uid();
  delete from public.richieste_squadra where persona_id = auth.uid() and stato = 'in_attesa';
  -- non può più entrare finché l'admin non lo ripristina
  update auth.users set banned_until = '2999-12-31 00:00:00+00' where id = auth.uid();
end $$;

create or replace function public.admin_account_eliminati()
returns table(id uuid, nome text, cognome text, email text, role text, squadra_nome text, eliminato_il timestamp with time zone)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  return query
    select p.id, p.nome, p.cognome, u.email::text, p.role, s.nome, p.eliminato_il
    from profiles p join auth.users u on u.id = p.id left join squadre s on s.id = p.squadra_prima
    where p.eliminato_il is not null order by p.eliminato_il desc;
end $$;
revoke all on function public.admin_account_eliminati() from public, anon;
grant execute on function public.admin_account_eliminati() to authenticated;

create or replace function public.admin_ripristina_account(p_persona uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  update profiles set eliminato_il = null,
    squadra_id = case when exists (select 1 from squadre where id = squadra_prima) then squadra_prima end,
    squadra_prima = null
  where id = p_persona and eliminato_il is not null;
  if not found then raise exception 'Questo account non è tra quelli eliminati'; end if;
  update auth.users set banned_until = null where id = p_persona;
end $$;
revoke all on function public.admin_ripristina_account(uuid) from public, anon;
grant execute on function public.admin_ripristina_account(uuid) to authenticated;

-- nessuno vede più i dati di un account chiuso (tranne l'admin, che può ripristinarlo)
create or replace function public.sono_genitore_di(p_atleta uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from genitori_figli g join profiles p on p.id = g.atleta_id
    where g.genitore_id = auth.uid() and g.atleta_id = p_atleta and g.stato = 'approvato' and p.eliminato_il is null)
$$;
drop policy if exists "genitori_figli lettura" on public.genitori_figli;
create policy "genitori_figli lettura" on public.genitori_figli for SELECT to authenticated
  using ((genitore_id = (select auth.uid()) or atleta_id = (select auth.uid()) or sono_coach_di(atleta_id))
         and not account_eliminato(atleta_id) and not account_eliminato(genitore_id));

create or replace function public.cerca_persone(p_testo text, p_squadra uuid)
returns table(id uuid, nome text, cognome text, ruolo text, squadra_id uuid, squadra_nome text, richiesta_in_attesa boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  t text := lower(trim(coalesce(p_testo, '')));
  v_admin boolean := coalesce(public.is_admin(), false);
begin
  if not public.sono_coach_squadra(p_squadra) then
    raise exception 'Non puoi gestire questa squadra';
  end if;
  if length(t) < 2 then return; end if;
  return query
    select p.id, p.nome, p.cognome, p.role, p.squadra_id, s.nome,
           exists (select 1 from richieste_squadra r
                   where r.squadra_id = p_squadra and r.persona_id = p.id and r.stato = 'in_attesa')
    from profiles p
    left join auth.users u on u.id = p.id
    left join squadre s on s.id = p.squadra_id
    where p.role in ('atleta', 'genitore', 'admin') and p.eliminato_il is null
      and (
        lower(u.email) = t
        or (
          (position(t in lower(coalesce(p.nome, '') || ' ' || coalesce(p.cognome, ''))) > 0
           or position(t in lower(coalesce(p.cognome, '') || ' ' || coalesce(p.nome, ''))) > 0)
          and (p.squadra_id is null or p.squadra_id = p_squadra or v_admin or p.role = 'admin')
        )
      )
    order by p.cognome, p.nome
    limit 20;
end $$;

create or replace function public.atleti_disponibili()
returns table(id uuid, nome text, cognome text, nella_mia_squadra boolean, sono_io boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.nome, p.cognome,
         (p.squadra_id is not null and p.squadra_id in (select s.id from squadre s where s.coach_id = auth.uid())),
         (p.id = auth.uid())
  from profiles p
  where (p.role = 'atleta' or (p.id = auth.uid() and coalesce(public.is_admin(), false)))
    and p.eliminato_il is null
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role in ('coach', 'admin'))
    and (
      p.squadra_id is null
      or p.squadra_id in (select s.id from squadre s where s.coach_id = auth.uid())
      or coalesce(public.is_admin(), false)
    )
  order by (p.id = auth.uid()) desc, p.cognome, p.nome
$$;

-- Dopo 30 giorni si cancella davvero. Lo fa la funzione "pulizia" (toglie anche i documenti dallo spazio file),
-- chiamata ogni notte da qui; l'admin può farlo subito dal Pannello.
create or replace function public.chiama_pulizia()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_chiave text;
begin
  if not exists (select 1 from profiles where eliminato_il < now() - interval '30 days') then return; end if;
  select valore into v_url from segreti where chiave = 'url_funzioni';
  select valore into v_chiave from segreti where chiave = 'chiave_interna';
  if v_url is null or v_chiave is null then return; end if;
  perform net.http_post(url := v_url || '/pulizia', body := jsonb_build_object('interno', v_chiave),
    headers := '{"Content-Type": "application/json"}'::jsonb);
end $$;
revoke all on function public.chiama_pulizia() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'swimline4-account-eliminati';
select cron.schedule('swimline4-account-eliminati', '15 2 * * *', 'select public.chiama_pulizia()');

-- ---------- funzioni interne: non richiamabili dall'esterno ----------
-- (i trigger partono comunque; account_eliminato serve alle regole di accesso, quindi resta agli utenti entrati)
revoke all on function public.trg_tempi_dal_coach() from public, anon, authenticated;
revoke all on function public.trg_avvisa_segnalazione() from public, anon, authenticated;
revoke all on function public.trg_avviso_email_recupero() from public, anon, authenticated;
revoke all on function public.account_eliminato(uuid) from public, anon;
grant execute on function public.account_eliminato(uuid) to authenticated;

-- ---------- copia notturna: anche la nuova tabella ----------
create or replace function copie.fai_copia()
returns text language plpgsql security definer set search_path = public, copie as $$
declare t text; oggi date := (now() at time zone 'Europe/Rome')::date; totale int := 0;
begin
  foreach t in array array['squadre', 'profiles', 'allenamenti_squadra', 'presenze', 'allenamenti', 'gare',
    'punti_movimenti', 'punti_config', 'premi_catalogo', 'premi_atleta', 'genitori_figli', 'incoraggiamenti',
    'notifiche', 'atleta_riferimenti', 'richieste_squadra', 'segnalazioni', 'accessi_admin', 'tipi_lavoro',
    'tipi_lavoro_squadra', 'impostazioni_app', 'impostazioni_squadra', 'errori_app', 'video', 'allenamenti_extra']
  loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('insert into copie.istantanee (giorno, tabella, righe, quante)
      select $1, $2, coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb), count(*) from public.%I x
      on conflict (giorno, tabella) do update set righe = excluded.righe, quante = excluded.quante, fatta_il = now()', t)
      using oggi, t;
    totale := totale + 1;
  end loop;
  delete from copie.istantanee where giorno < oggi - 14;
  return format('Copia del %s: %s tabelle', oggi, totale);
end $$;
revoke all on function copie.fai_copia() from public, anon, authenticated;
