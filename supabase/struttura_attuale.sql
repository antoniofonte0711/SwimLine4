-- ============================================
-- SwimLine4 — Struttura completa del database (generata dal database vero l'8 ottobre 2026)
-- con supabase/esporta_struttura.sql. Su un progetto Supabase NUOVO e vuoto basta eseguire questo file.
-- Le modifiche successive vanno in file numerati da 15 in poi.
-- ============================================

set check_function_bodies = off;

-- estensione presente: pg_stat_statements 1.11

-- estensione presente: pgcrypto 1.3

-- estensione presente: plpgsql 1.0

-- estensione presente: supabase_vault 0.3.1

-- estensione presente: uuid-ossp 1.1

create table if not exists public.accessi_admin (
  id uuid default gen_random_uuid() not null,
  admin_id uuid not null,
  target_id uuid not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.allenamenti (
  id uuid default gen_random_uuid() not null,
  atleta_id uuid,
  tipo_lavoro text,
  distanza integer,
  parziale_50 text,
  tempo_totale text,
  commento text,
  video_url text,
  created_at timestamp with time zone default now(),
  ripetizioni integer,
  stile text,
  passaggi jsonb default '[]'::jsonb not null,
  data_allenamento date default CURRENT_DATE
);

create table if not exists public.allenamenti_squadra (
  id uuid default gen_random_uuid() not null,
  squadra_id uuid not null,
  coach_id uuid,
  data date not null,
  titolo text,
  righe jsonb default '[]'::jsonb not null,
  visibilita text default 'squadra'::text not null,
  pubblicato boolean default false not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.atleta_riferimenti (
  atleta_id uuid not null,
  categoria text,
  id_fin text,
  id_uisp text,
  certificato_scadenza date,
  certificato_path text,
  tesserino_path text,
  note text,
  updated_at timestamp with time zone default now()
);

create table if not exists public.gare (
  id uuid default gen_random_uuid() not null,
  atleta_id uuid,
  nome_gara text,
  distanza integer,
  stile text,
  tempo text,
  data_gara date,
  created_at timestamp with time zone default now(),
  passaggi jsonb default '[]'::jsonb not null,
  orario text,
  tempo_iscrizione text,
  ordine smallint default 0
);

create table if not exists public.premi_atleta (
  id uuid default gen_random_uuid() not null,
  atleta_id uuid not null,
  squadra_id uuid,
  premio_nome text not null,
  ottenuto_il timestamp with time zone default now(),
  usato boolean default false not null,
  usato_il timestamp with time zone
);

create table if not exists public.premi_catalogo (
  id uuid default gen_random_uuid() not null,
  squadra_id uuid not null,
  nome text not null,
  peso integer default 3 not null,
  attivo boolean default true not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.presenze (
  id uuid default gen_random_uuid() not null,
  atleta_id uuid not null,
  data date not null,
  stato text not null,
  segnato_da uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.profiles (
  id uuid not null,
  nome text,
  cognome text,
  data_nascita date,
  role text default 'atleta'::text not null,
  created_at timestamp with time zone default now(),
  squadra_id uuid
);

create table if not exists public.punti_config (
  squadra_id uuid not null,
  punti_presenza integer default 10 not null,
  punti_risultati integer default 5 not null,
  punti_gara integer default 15 not null,
  punti_miglioramento integer default 10 not null,
  soglia_premio integer default 100 not null
);

create table if not exists public.punti_movimenti (
  id uuid default gen_random_uuid() not null,
  atleta_id uuid not null,
  squadra_id uuid,
  punti integer not null,
  motivo text not null,
  riferimento text not null,
  data date default CURRENT_DATE,
  created_at timestamp with time zone default now()
);

create table if not exists public.richieste_squadra (
  id uuid default gen_random_uuid() not null,
  squadra_id uuid not null,
  persona_id uuid not null,
  richiesta_da uuid,
  stato text default 'in_attesa'::text not null,
  created_at timestamp with time zone default now(),
  risposta_il timestamp with time zone,
  tipo text default 'invito'::text not null
);

create table if not exists public.squadre (
  id uuid default gen_random_uuid() not null,
  nome text not null,
  coach_id uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.video (
  id uuid default gen_random_uuid() not null,
  atleta_id uuid,
  tipo text default 'allenamento'::text not null,
  riferimento_id uuid,
  data date default CURRENT_DATE,
  commento text,
  video_url text,
  nome_file text,
  created_at timestamp with time zone default now()
);

alter table accessi_admin add constraint accessi_admin_pkey PRIMARY KEY (id);

alter table allenamenti_squadra add constraint allenamenti_squadra_pkey PRIMARY KEY (id);

alter table allenamenti_squadra add constraint allenamenti_squadra_squadra_id_data_key UNIQUE (squadra_id, data);

alter table allenamenti_squadra add constraint allenamenti_squadra_visibilita_check CHECK ((visibilita = ANY (ARRAY['coach'::text, 'squadra'::text])));

alter table allenamenti add constraint allenamenti_pkey PRIMARY KEY (id);

alter table atleta_riferimenti add constraint atleta_riferimenti_pkey PRIMARY KEY (atleta_id);

alter table gare add constraint gare_pkey PRIMARY KEY (id);

alter table premi_atleta add constraint premi_atleta_pkey PRIMARY KEY (id);

alter table premi_catalogo add constraint premi_catalogo_peso_check CHECK (((peso >= 1) AND (peso <= 10)));

alter table premi_catalogo add constraint premi_catalogo_pkey PRIMARY KEY (id);

alter table presenze add constraint presenze_atleta_id_data_key UNIQUE (atleta_id, data);

alter table presenze add constraint presenze_pkey PRIMARY KEY (id);

alter table presenze add constraint presenze_stato_check CHECK ((stato = ANY (ARRAY['presente'::text, 'assente'::text, 'non_penale'::text])));

alter table profiles add constraint profiles_pkey PRIMARY KEY (id);

alter table profiles add constraint profiles_role_check CHECK ((role = ANY (ARRAY['atleta'::text, 'coach'::text, 'coach_in_attesa'::text, 'genitore'::text, 'admin'::text])));

alter table punti_config add constraint punti_config_pkey PRIMARY KEY (squadra_id);

alter table punti_config add constraint punti_config_soglia_premio_check CHECK ((soglia_premio > 0));

alter table punti_movimenti add constraint punti_movimenti_atleta_id_riferimento_key UNIQUE (atleta_id, riferimento);

alter table punti_movimenti add constraint punti_movimenti_pkey PRIMARY KEY (id);

alter table richieste_squadra add constraint richieste_squadra_pkey PRIMARY KEY (id);

alter table richieste_squadra add constraint richieste_squadra_stato_check CHECK ((stato = ANY (ARRAY['in_attesa'::text, 'accettata'::text, 'rifiutata'::text])));

alter table richieste_squadra add constraint richieste_squadra_tipo_check CHECK ((tipo = ANY (ARRAY['invito'::text, 'domanda'::text])));

alter table squadre add constraint squadre_pkey PRIMARY KEY (id);

alter table video add constraint video_pkey PRIMARY KEY (id);

alter table accessi_admin add constraint accessi_admin_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table accessi_admin add constraint accessi_admin_target_id_fkey FOREIGN KEY (target_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table allenamenti_squadra add constraint allenamenti_squadra_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES profiles(id);

alter table allenamenti_squadra add constraint allenamenti_squadra_squadra_id_fkey FOREIGN KEY (squadra_id) REFERENCES squadre(id) ON DELETE CASCADE;

alter table allenamenti add constraint allenamenti_atleta_id_fkey FOREIGN KEY (atleta_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table atleta_riferimenti add constraint atleta_riferimenti_atleta_id_fkey FOREIGN KEY (atleta_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table gare add constraint gare_atleta_id_fkey FOREIGN KEY (atleta_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table premi_atleta add constraint premi_atleta_atleta_id_fkey FOREIGN KEY (atleta_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table premi_atleta add constraint premi_atleta_squadra_id_fkey FOREIGN KEY (squadra_id) REFERENCES squadre(id) ON DELETE SET NULL;

alter table premi_catalogo add constraint premi_catalogo_squadra_id_fkey FOREIGN KEY (squadra_id) REFERENCES squadre(id) ON DELETE CASCADE;

alter table presenze add constraint presenze_atleta_id_fkey FOREIGN KEY (atleta_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table presenze add constraint presenze_segnato_da_fkey FOREIGN KEY (segnato_da) REFERENCES profiles(id);

alter table profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table profiles add constraint profiles_squadra_id_fkey FOREIGN KEY (squadra_id) REFERENCES squadre(id);

alter table punti_config add constraint punti_config_squadra_id_fkey FOREIGN KEY (squadra_id) REFERENCES squadre(id) ON DELETE CASCADE;

alter table punti_movimenti add constraint punti_movimenti_atleta_id_fkey FOREIGN KEY (atleta_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table punti_movimenti add constraint punti_movimenti_squadra_id_fkey FOREIGN KEY (squadra_id) REFERENCES squadre(id) ON DELETE SET NULL;

alter table richieste_squadra add constraint richieste_squadra_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table richieste_squadra add constraint richieste_squadra_richiesta_da_fkey FOREIGN KEY (richiesta_da) REFERENCES profiles(id) ON DELETE SET NULL;

alter table richieste_squadra add constraint richieste_squadra_squadra_id_fkey FOREIGN KEY (squadra_id) REFERENCES squadre(id) ON DELETE CASCADE;

alter table squadre add constraint squadre_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES profiles(id) ON DELETE CASCADE;

alter table video add constraint video_atleta_id_fkey FOREIGN KEY (atleta_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.aggiungi_a_squadra(p_persona uuid, p_squadra uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ruolo text; v_attuale uuid; v_nome_attuale text; v_nome text;
  v_admin boolean := coalesce(public.is_admin(), false);
begin
  if not public.sono_coach_squadra(p_squadra) then
    raise exception 'Non puoi gestire questa squadra';
  end if;
  select role, squadra_id into v_ruolo, v_attuale from profiles where id = p_persona;
  if v_ruolo is null then raise exception 'Persona non trovata'; end if;
  if v_ruolo = 'admin' and p_persona <> auth.uid() then
    raise exception 'Questa persona entra solo se accetta: usa "Invia richiesta"';
  end if;
  if not (v_ruolo in ('atleta', 'genitore') or (p_persona = auth.uid() and v_admin)) then
    raise exception 'Si possono aggiungere solo atleti e genitori';
  end if;
  if v_attuale is not null and v_attuale <> p_squadra and not v_admin then
    select nome into v_nome_attuale from squadre where id = v_attuale;
    raise exception 'È già nella squadra %: può uscirne dal suo Profilo, oppure chiedi all''admin di spostarlo', coalesce(v_nome_attuale, '');
  end if;
  update profiles set squadra_id = p_squadra where id = p_persona;
  select nome into v_nome from squadre where id = p_squadra;
  return v_nome;
end $function$
;

CREATE OR REPLACE FUNCTION public.aggiungi_atleta_squadra(p_atleta uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_squadra uuid;
begin
  if not exists (select 1 from profiles me where me.id = auth.uid() and me.role in ('coach', 'admin')) then
    raise exception 'Non hai i permessi per aggiungere atleti';
  end if;
  select id into v_squadra from squadre where coach_id = auth.uid() limit 1;
  if v_squadra is null then
    raise exception 'Nessuna squadra: creala prima dal Profilo';
  end if;
  if not exists (
    select 1 from profiles
    where id = p_atleta
      and (
        (role = 'atleta' and (squadra_id is null or squadra_id = v_squadra or coalesce(public.is_admin(), false)))
        or (id = auth.uid() and coalesce(public.is_admin(), false))
      )
  ) then
    raise exception 'Questo atleta non è disponibile (è già in un''altra squadra)';
  end if;
  update profiles set squadra_id = v_squadra where id = p_atleta;
end $function$
;

CREATE OR REPLACE FUNCTION public.approva_coach(p_persona uuid, p_accetta boolean, p_nome_squadra text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_squadra uuid; v_nome text;
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  if not exists (select 1 from profiles where id = p_persona and role = 'coach_in_attesa') then
    raise exception 'Questa persona non è in attesa di approvazione';
  end if;
  if not p_accetta then
    update profiles set role = 'atleta' where id = p_persona;
    return null;
  end if;
  select coalesce(nullif(trim(p_nome_squadra), ''), nullif(trim(u.raw_user_meta_data->>'nome_squadra'), ''),
                  'Squadra di ' || coalesce(p.nome, 'nuovo coach'))
    into v_nome
    from profiles p join auth.users u on u.id = p.id where p.id = p_persona;
  insert into squadre (nome, coach_id) values (v_nome, p_persona) returning id into v_squadra;
  update profiles set role = 'coach', squadra_id = v_squadra where id = p_persona;
  return v_nome;
end $function$
;

CREATE OR REPLACE FUNCTION public.apri_premio()
 RETURNS premi_atleta
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_sq uuid; v_soglia int; v_tot bigint; v_gia bigint; v_nome text; r premi_atleta;
begin
  select squadra_id into v_sq from profiles where id = auth.uid();
  if v_sq is null then raise exception 'Non sei in una squadra'; end if;
  select coalesce((select soglia_premio from punti_config where squadra_id = v_sq), 100) into v_soglia;
  select coalesce(sum(punti), 0) into v_tot from punti_movimenti where atleta_id = auth.uid();
  select count(*) into v_gia from premi_atleta where atleta_id = auth.uid();
  if v_tot / v_soglia <= v_gia then raise exception 'Non hai ancora un premio da aprire'; end if;
  select nome into v_nome from (
    select nome, -ln(1 - random()) / peso as k
    from premi_catalogo where squadra_id = v_sq and attivo and peso > 0
    order by k limit 1
  ) x;
  if v_nome is null then raise exception 'Il coach non ha ancora inserito premi'; end if;
  insert into premi_atleta (atleta_id, squadra_id, premio_nome) values (auth.uid(), v_sq, v_nome) returning * into r;
  return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.atleti_disponibili()
 RETURNS TABLE(id uuid, nome text, cognome text, nella_mia_squadra boolean, sono_io boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.nome, p.cognome,
         (p.squadra_id is not null and p.squadra_id in (select s.id from squadre s where s.coach_id = auth.uid())),
         (p.id = auth.uid())
  from profiles p
  where (p.role = 'atleta' or (p.id = auth.uid() and coalesce(public.is_admin(), false)))
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role in ('coach', 'admin'))
    and (
      p.squadra_id is null
      or p.squadra_id in (select s.id from squadre s where s.coach_id = auth.uid())
      or coalesce(public.is_admin(), false)
    )
  order by (p.id = auth.uid()) desc, p.cognome, p.nome
$function$
;

CREATE OR REPLACE FUNCTION public.cerca_persone(p_testo text, p_squadra uuid)
 RETURNS TABLE(id uuid, nome text, cognome text, ruolo text, squadra_id uuid, squadra_nome text, richiesta_in_attesa boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    where p.role in ('atleta', 'genitore', 'admin')
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
end $function$
;

CREATE OR REPLACE FUNCTION public.chiedi_di_entrare(p_nome text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_ruolo text; v_attuale uuid; v_squadra uuid; v_nome text;
begin
  select role, squadra_id into v_ruolo, v_attuale from profiles where id = auth.uid();
  if v_ruolo is null or v_ruolo not in ('atleta', 'genitore', 'admin') then
    raise exception 'Solo atleti e genitori possono chiedere di entrare in una squadra';
  end if;
  select id, nome into v_squadra, v_nome from squadre where lower(trim(nome)) = lower(trim(coalesce(p_nome, ''))) limit 1;
  if v_squadra is null then raise exception 'Nessuna squadra con questo nome'; end if;
  if v_attuale = v_squadra then raise exception 'Sei già in questa squadra'; end if;
  insert into richieste_squadra (squadra_id, persona_id, richiesta_da, tipo)
  values (v_squadra, auth.uid(), auth.uid(), 'domanda')
  on conflict (squadra_id, persona_id) where stato = 'in_attesa' do nothing;
  return v_nome;
end $function$
;

CREATE OR REPLACE FUNCTION public.chiedi_ingresso(p_persona uuid, p_squadra uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_ruolo text; v_attuale uuid;
begin
  if not public.sono_coach_squadra(p_squadra) then
    raise exception 'Non puoi gestire questa squadra';
  end if;
  select role, squadra_id into v_ruolo, v_attuale from profiles where id = p_persona;
  if v_ruolo is null then raise exception 'Persona non trovata'; end if;
  if v_ruolo <> 'admin' then raise exception 'La richiesta serve solo per gli account admin: aggiungilo direttamente'; end if;
  if p_persona = auth.uid() then raise exception 'Puoi aggiungerti direttamente'; end if;
  if v_attuale = p_squadra then raise exception 'È già in questa squadra'; end if;
  insert into richieste_squadra (squadra_id, persona_id, richiesta_da)
    values (p_squadra, p_persona, auth.uid())
    on conflict (squadra_id, persona_id) where stato = 'in_attesa' do nothing;
end $function$
;

CREATE OR REPLACE FUNCTION public.coach_da_approvare()
 RETURNS TABLE(id uuid, nome text, cognome text, email text, nome_squadra text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  return query
    select p.id, p.nome, p.cognome, u.email::text, u.raw_user_meta_data->>'nome_squadra', p.created_at
    from profiles p join auth.users u on u.id = p.id
    where p.role = 'coach_in_attesa'
    order by p.created_at;
end $function$
;

CREATE OR REPLACE FUNCTION public.domande_squadra(p_squadra uuid)
 RETURNS TABLE(id uuid, persona_id uuid, nome text, cognome text, ruolo text, squadra_attuale text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.sono_coach_squadra(p_squadra) then raise exception 'Non puoi gestire questa squadra'; end if;
  return query
    select r.id, p.id, p.nome, p.cognome, p.role, s.nome, r.created_at
    from richieste_squadra r
    join profiles p on p.id = r.persona_id
    left join squadre s on s.id = p.squadra_id
    where r.squadra_id = p_squadra and r.tipo = 'domanda' and r.stato = 'in_attesa'
    order by r.created_at;
end $function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ruolo text := new.raw_user_meta_data->>'role';
  v_squadra uuid;
begin
  if v_ruolo = 'coach' then
    v_ruolo := 'coach_in_attesa'; -- la squadra nasce quando l'admin approva
  elsif v_ruolo is null or v_ruolo not in ('atleta', 'genitore') then
    v_ruolo := 'atleta';
  end if;
  insert into public.profiles (id, nome, cognome, data_nascita, role)
  values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'cognome',
    (new.raw_user_meta_data->>'data_nascita')::date,
    v_ruolo
  )
  on conflict (id) do nothing;

  -- squadra scelta in registrazione: diventa una domanda per il coach
  if v_ruolo in ('atleta', 'genitore') and new.raw_user_meta_data->>'squadra_id' is not null then
    select id into v_squadra from public.squadre where id::text = new.raw_user_meta_data->>'squadra_id';
    if v_squadra is not null then
      insert into public.richieste_squadra (squadra_id, persona_id, richiesta_da, tipo)
      values (v_squadra, new.id, new.id, 'domanda')
      on conflict (squadra_id, persona_id) where stato = 'in_attesa' do nothing;
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.imposta_nome_squadra(p_nome text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_nome text := trim(coalesce(p_nome, ''));
begin
  if length(v_nome) < 2 then raise exception 'Scrivi un nome di almeno 2 lettere'; end if;
  update squadre set nome = v_nome
  where id = (select id from squadre where coach_id = auth.uid() order by created_at limit 1);
  if not found then raise exception 'Nessuna squadra: viene creata quando l''amministratore approva il tuo account coach'; end if;
  return v_nome;
end $function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.mia_squadra()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select squadra_id from profiles where id = auth.uid()
$function$
;

CREATE OR REPLACE FUNCTION public.mie_richieste()
 RETURNS TABLE(id uuid, squadra_id uuid, squadra_nome text, coach_nome text, created_at timestamp with time zone, tipo text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r.id, r.squadra_id, s.nome,
    trim(coalesce(c.nome, '') || ' ' || coalesce(c.cognome, '')), r.created_at, r.tipo
  from richieste_squadra r
  join squadre s on s.id = r.squadra_id
  left join profiles c on c.id = case when r.tipo = 'invito' then coalesce(r.richiesta_da, s.coach_id) else s.coach_id end
  where r.persona_id = auth.uid() and r.stato = 'in_attesa'
  order by r.created_at desc
$function$
;

CREATE OR REPLACE FUNCTION public.punti_assegna(p_atleta uuid, p_evento text, p_rif text, p_data date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_sq uuid; v_pres int; v_ris int; v_gara int; v_migl int; v_p int; v_mot text;
begin
  select squadra_id into v_sq from profiles where id = p_atleta;
  if v_sq is null then return; end if;
  select coalesce(c.punti_presenza, 10), coalesce(c.punti_risultati, 5), coalesce(c.punti_gara, 15), coalesce(c.punti_miglioramento, 10)
    into v_pres, v_ris, v_gara, v_migl
    from (select 1) x left join punti_config c on c.squadra_id = v_sq;
  if p_evento = 'presenza' then v_p := v_pres; v_mot := 'Presenza all''allenamento';
  elsif p_evento = 'risultati' then v_p := v_ris; v_mot := 'Risultati inseriti';
  elsif p_evento = 'gara' then v_p := v_gara; v_mot := 'Gara completata';
  elsif p_evento = 'miglioramento' then v_p := v_migl; v_mot := 'Tempo migliorato';
  else return; end if;
  if v_p <= 0 then return; end if;
  insert into punti_movimenti (atleta_id, squadra_id, punti, motivo, riferimento, data)
    values (p_atleta, v_sq, v_p, v_mot, p_rif, coalesce(p_data, current_date))
    on conflict (atleta_id, riferimento) do nothing;
end $function$
;

CREATE OR REPLACE FUNCTION public.rispondi_domanda(p_richiesta uuid, p_accetta boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_squadra uuid; v_persona uuid; v_nome text;
begin
  select squadra_id, persona_id into v_squadra, v_persona from richieste_squadra
  where id = p_richiesta and tipo = 'domanda' and stato = 'in_attesa';
  if v_squadra is null then raise exception 'Domanda non trovata o già gestita'; end if;
  if not public.sono_coach_squadra(v_squadra) then raise exception 'Non puoi gestire questa squadra'; end if;
  update richieste_squadra set stato = case when p_accetta then 'accettata' else 'rifiutata' end, risposta_il = now()
  where id = p_richiesta;
  if p_accetta then update profiles set squadra_id = v_squadra where id = v_persona; end if;
  select trim(coalesce(nome, '') || ' ' || coalesce(cognome, '')) into v_nome from profiles where id = v_persona;
  return v_nome;
end $function$
;

CREATE OR REPLACE FUNCTION public.rispondi_richiesta(p_richiesta uuid, p_accetta boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_squadra uuid; v_nome text;
begin
  select squadra_id into v_squadra from richieste_squadra
  where id = p_richiesta and persona_id = auth.uid() and stato = 'in_attesa' and tipo = 'invito';
  if v_squadra is null then raise exception 'Richiesta non trovata o già gestita'; end if;
  update richieste_squadra set stato = case when p_accetta then 'accettata' else 'rifiutata' end, risposta_il = now()
  where id = p_richiesta;
  if p_accetta then update profiles set squadra_id = v_squadra where id = auth.uid(); end if;
  select nome into v_nome from squadre where id = v_squadra;
  return v_nome;
end $function$
;

CREATE OR REPLACE FUNCTION public.sono_coach_di(atleta uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(public.is_admin(), false) or exists (
    select 1 from profiles p
    join squadre s on s.id = p.squadra_id
    where p.id = atleta and s.coach_id = auth.uid()
  )
$function$
;

CREATE OR REPLACE FUNCTION public.sono_coach_squadra(p_squadra uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from squadre where id = p_squadra and coach_id = auth.uid())
      or coalesce(public.is_admin(), false)
$function$
;

CREATE OR REPLACE FUNCTION public.sono_in_squadra(p_squadra uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from profiles where id = auth.uid() and squadra_id = p_squadra)
$function$
;

CREATE OR REPLACE FUNCTION public.tempo_sec(t text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare m text[];
begin
  if t is null then return null; end if;
  m := regexp_match(t, '^(\d{1,2})''([0-5]\d)"(\d{2})$');
  if m is not null then return m[1]::numeric * 60 + m[2]::numeric + m[3]::numeric / 100; end if;
  m := regexp_match(t, '^([0-5]?\d)"(\d{2})$');
  if m is not null then return m[1]::numeric + m[2]::numeric / 100; end if;
  m := regexp_match(t, '^(\d+):(\d+)\.(\d+)$');
  if m is not null then return m[1]::numeric * 60 + m[2]::numeric + m[3]::numeric / power(10, length(m[3])); end if;
  return null;
end $function$
;

CREATE OR REPLACE FUNCTION public.togli_da_squadra(p_persona uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_squadra uuid; v_ruolo text;
begin
  select squadra_id, role into v_squadra, v_ruolo from profiles where id = p_persona;
  if v_squadra is null then return; end if;
  if not public.sono_coach_squadra(v_squadra) then
    raise exception 'Non puoi gestire questa squadra';
  end if;
  if v_ruolo = 'coach' then
    raise exception 'Il coach non si toglie da qui';
  end if;
  update profiles set squadra_id = null where id = p_persona;
end $function$
;

CREATE OR REPLACE FUNCTION public.trg_punti_allenamenti()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(jsonb_array_length(new.passaggi), 0) > 0 or new.tempo_totale is not null then
    perform public.punti_assegna(new.atleta_id, 'risultati', 'risultati:' || new.data_allenamento::text, new.data_allenamento);
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.trg_punti_gare()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_nuovo numeric; v_prima numeric;
begin
  if new.tempo is null then return new; end if;
  perform public.punti_assegna(new.atleta_id, 'gara', 'gara:' || new.id::text, new.data_gara);
  v_nuovo := public.tempo_sec(new.tempo);
  if v_nuovo is not null then
    select min(public.tempo_sec(g.tempo)) into v_prima from gare g
      where g.atleta_id = new.atleta_id and g.distanza = new.distanza and g.stile = new.stile
        and g.id <> new.id and g.tempo is not null and g.data_gara <= new.data_gara;
    if v_prima is not null and v_nuovo < v_prima then
      perform public.punti_assegna(new.atleta_id, 'miglioramento', 'miglioramento:' || new.id::text, new.data_gara);
    end if;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.trg_punti_presenze()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.stato = 'presente' then
    perform public.punti_assegna(new.atleta_id, 'presenza', 'presenza:' || new.data::text, new.data);
  else
    delete from punti_movimenti where atleta_id = new.atleta_id and riferimento = 'presenza:' || new.data::text;
  end if;
  return new;
end $function$
;

create or replace view public.compagni_squadra as  SELECT id,
    nome,
    cognome,
    squadra_id
   FROM profiles
  WHERE ((role = ANY (ARRAY['atleta'::text, 'admin'::text])) AND (squadra_id IS NOT NULL) AND (squadra_id = mia_squadra()));

CREATE UNIQUE INDEX richieste_squadra_una_in_attesa ON public.richieste_squadra USING btree (squadra_id, persona_id) WHERE (stato = 'in_attesa'::text);

alter table public.accessi_admin enable row level security;

alter table public.allenamenti enable row level security;

alter table public.allenamenti_squadra enable row level security;

alter table public.atleta_riferimenti enable row level security;

alter table public.gare enable row level security;

alter table public.premi_atleta enable row level security;

alter table public.premi_catalogo enable row level security;

alter table public.presenze enable row level security;

alter table public.profiles enable row level security;

alter table public.punti_config enable row level security;

alter table public.punti_movimenti enable row level security;

alter table public.richieste_squadra enable row level security;

alter table public.squadre enable row level security;

alter table public.video enable row level security;

drop policy if exists "admin legge gli accessi" on public.accessi_admin;
create policy "admin legge gli accessi" on public.accessi_admin as PERMISSIVE for SELECT to public
  using (is_admin());

drop policy if exists "atleta vede il piano pubblicato" on public.allenamenti_squadra;
create policy "atleta vede il piano pubblicato" on public.allenamenti_squadra as PERMISSIVE for SELECT to public
  using (((pubblicato = true) AND (visibilita = 'squadra'::text) AND (squadra_id = mia_squadra())));

drop policy if exists "coach gestisce il piano della squadra" on public.allenamenti_squadra;
create policy "coach gestisce il piano della squadra" on public.allenamenti_squadra as PERMISSIVE for ALL to public
  using ((COALESCE(is_admin(), false) OR (EXISTS ( SELECT 1
   FROM squadre s
  WHERE ((s.id = allenamenti_squadra.squadra_id) AND (s.coach_id = auth.uid()))))))
  with check ((COALESCE(is_admin(), false) OR (EXISTS ( SELECT 1
   FROM squadre s
  WHERE ((s.id = allenamenti_squadra.squadra_id) AND (s.coach_id = auth.uid()))))));

drop policy if exists "atleta elimina i propri allenamenti" on public.allenamenti;
create policy "atleta elimina i propri allenamenti" on public.allenamenti as PERMISSIVE for DELETE to public
  using ((auth.uid() = atleta_id));

drop policy if exists "atleta inserisce i propri allenamenti" on public.allenamenti;
create policy "atleta inserisce i propri allenamenti" on public.allenamenti as PERMISSIVE for INSERT to public
  with check ((auth.uid() = atleta_id));

drop policy if exists "atleta vede i propri allenamenti" on public.allenamenti;
create policy "atleta vede i propri allenamenti" on public.allenamenti as PERMISSIVE for SELECT to public
  using ((auth.uid() = atleta_id));

drop policy if exists "coach elimina gli allenamenti della squadra" on public.allenamenti;
create policy "coach elimina gli allenamenti della squadra" on public.allenamenti as PERMISSIVE for DELETE to public
  using (sono_coach_di(atleta_id));

drop policy if exists "coach inserisce allenamenti alla squadra" on public.allenamenti;
create policy "coach inserisce allenamenti alla squadra" on public.allenamenti as PERMISSIVE for INSERT to public
  with check (sono_coach_di(atleta_id));

drop policy if exists "coach modifica gli allenamenti della squadra" on public.allenamenti;
create policy "coach modifica gli allenamenti della squadra" on public.allenamenti as PERMISSIVE for UPDATE to public
  using (sono_coach_di(atleta_id));

drop policy if exists "coach vede gli allenamenti della squadra" on public.allenamenti;
create policy "coach vede gli allenamenti della squadra" on public.allenamenti as PERMISSIVE for SELECT to public
  using (sono_coach_di(atleta_id));

drop policy if exists "atleta vede i propri riferimenti" on public.atleta_riferimenti;
create policy "atleta vede i propri riferimenti" on public.atleta_riferimenti as PERMISSIVE for SELECT to public
  using ((auth.uid() = atleta_id));

drop policy if exists "coach inserisce i riferimenti della squadra" on public.atleta_riferimenti;
create policy "coach inserisce i riferimenti della squadra" on public.atleta_riferimenti as PERMISSIVE for INSERT to public
  with check (sono_coach_di(atleta_id));

drop policy if exists "coach modifica i riferimenti della squadra" on public.atleta_riferimenti;
create policy "coach modifica i riferimenti della squadra" on public.atleta_riferimenti as PERMISSIVE for UPDATE to public
  using (sono_coach_di(atleta_id));

drop policy if exists "coach vede i riferimenti della squadra" on public.atleta_riferimenti;
create policy "coach vede i riferimenti della squadra" on public.atleta_riferimenti as PERMISSIVE for SELECT to public
  using (sono_coach_di(atleta_id));

drop policy if exists "atleta elimina le proprie gare" on public.gare;
create policy "atleta elimina le proprie gare" on public.gare as PERMISSIVE for DELETE to public
  using ((auth.uid() = atleta_id));

drop policy if exists "atleta inserisce le proprie gare" on public.gare;
create policy "atleta inserisce le proprie gare" on public.gare as PERMISSIVE for INSERT to public
  with check ((auth.uid() = atleta_id));

drop policy if exists "atleta vede le gare dei compagni" on public.gare;
create policy "atleta vede le gare dei compagni" on public.gare as PERMISSIVE for SELECT to public
  using ((atleta_id IN ( SELECT compagni_squadra.id
   FROM compagni_squadra)));

drop policy if exists "atleta vede le proprie gare" on public.gare;
create policy "atleta vede le proprie gare" on public.gare as PERMISSIVE for SELECT to public
  using ((auth.uid() = atleta_id));

drop policy if exists "coach elimina le gare della squadra" on public.gare;
create policy "coach elimina le gare della squadra" on public.gare as PERMISSIVE for DELETE to public
  using (sono_coach_di(atleta_id));

drop policy if exists "coach inserisce gare alla squadra" on public.gare;
create policy "coach inserisce gare alla squadra" on public.gare as PERMISSIVE for INSERT to public
  with check (sono_coach_di(atleta_id));

drop policy if exists "coach modifica le gare della squadra" on public.gare;
create policy "coach modifica le gare della squadra" on public.gare as PERMISSIVE for UPDATE to public
  using (sono_coach_di(atleta_id));

drop policy if exists "coach vede le gare della squadra" on public.gare;
create policy "coach vede le gare della squadra" on public.gare as PERMISSIVE for SELECT to public
  using (sono_coach_di(atleta_id));

drop policy if exists "premi coach conferma" on public.premi_atleta;
create policy "premi coach conferma" on public.premi_atleta as PERMISSIVE for UPDATE to public
  using (sono_coach_di(atleta_id));

drop policy if exists "premi lettura" on public.premi_atleta;
create policy "premi lettura" on public.premi_atleta as PERMISSIVE for SELECT to public
  using (((auth.uid() = atleta_id) OR sono_coach_di(atleta_id)));

drop policy if exists "catalogo coach" on public.premi_catalogo;
create policy "catalogo coach" on public.premi_catalogo as PERMISSIVE for ALL to public
  using (sono_coach_squadra(squadra_id))
  with check (sono_coach_squadra(squadra_id));

drop policy if exists "catalogo lettura" on public.premi_catalogo;
create policy "catalogo lettura" on public.premi_catalogo as PERMISSIVE for SELECT to public
  using ((sono_coach_squadra(squadra_id) OR sono_in_squadra(squadra_id)));

drop policy if exists "atleta vede le proprie presenze" on public.presenze;
create policy "atleta vede le proprie presenze" on public.presenze as PERMISSIVE for SELECT to public
  using ((auth.uid() = atleta_id));

drop policy if exists "coach elimina le presenze della squadra" on public.presenze;
create policy "coach elimina le presenze della squadra" on public.presenze as PERMISSIVE for DELETE to public
  using (sono_coach_di(atleta_id));

drop policy if exists "coach modifica le presenze della squadra" on public.presenze;
create policy "coach modifica le presenze della squadra" on public.presenze as PERMISSIVE for UPDATE to public
  using (sono_coach_di(atleta_id));

drop policy if exists "coach segna le presenze della squadra" on public.presenze;
create policy "coach segna le presenze della squadra" on public.presenze as PERMISSIVE for INSERT to public
  with check (sono_coach_di(atleta_id));

drop policy if exists "coach vede le presenze della squadra" on public.presenze;
create policy "coach vede le presenze della squadra" on public.presenze as PERMISSIVE for SELECT to public
  using (sono_coach_di(atleta_id));

drop policy if exists "admin modifica tutti i profili" on public.profiles;
create policy "admin modifica tutti i profili" on public.profiles as PERMISSIVE for UPDATE to public
  using (is_admin());

drop policy if exists "admin vede tutti i profili" on public.profiles;
create policy "admin vede tutti i profili" on public.profiles as PERMISSIVE for SELECT to public
  using (is_admin());

drop policy if exists "coach vede gli atleti della sua squadra" on public.profiles;
create policy "coach vede gli atleti della sua squadra" on public.profiles as PERMISSIVE for SELECT to public
  using ((squadra_id IN ( SELECT squadre.id
   FROM squadre
  WHERE (squadre.coach_id = auth.uid()))));

drop policy if exists "un utente crea il proprio profilo" on public.profiles;
create policy "un utente crea il proprio profilo" on public.profiles as PERMISSIVE for INSERT to public
  with check ((auth.uid() = id));

drop policy if exists "vedi il tuo profilo" on public.profiles;
create policy "vedi il tuo profilo" on public.profiles as PERMISSIVE for SELECT to public
  using ((auth.uid() = id));

drop policy if exists "punti_config coach" on public.punti_config;
create policy "punti_config coach" on public.punti_config as PERMISSIVE for ALL to public
  using (sono_coach_squadra(squadra_id))
  with check (sono_coach_squadra(squadra_id));

drop policy if exists "punti_config lettura" on public.punti_config;
create policy "punti_config lettura" on public.punti_config as PERMISSIVE for SELECT to public
  using ((sono_coach_squadra(squadra_id) OR sono_in_squadra(squadra_id)));

drop policy if exists "movimenti bonus coach" on public.punti_movimenti;
create policy "movimenti bonus coach" on public.punti_movimenti as PERMISSIVE for INSERT to public
  with check (sono_coach_di(atleta_id));

drop policy if exists "movimenti lettura" on public.punti_movimenti;
create policy "movimenti lettura" on public.punti_movimenti as PERMISSIVE for SELECT to public
  using (((auth.uid() = atleta_id) OR sono_coach_di(atleta_id)));

drop policy if exists "richieste lettura" on public.richieste_squadra;
create policy "richieste lettura" on public.richieste_squadra as PERMISSIVE for SELECT to public
  using (((persona_id = auth.uid()) OR sono_coach_squadra(squadra_id)));

drop policy if exists "coach crea la propria squadra" on public.squadre;
create policy "coach crea la propria squadra" on public.squadre as PERMISSIVE for INSERT to public
  with check (((auth.uid() = coach_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['coach'::text, 'admin'::text])))))));

drop policy if exists "tutti vedono le squadre" on public.squadre;
create policy "tutti vedono le squadre" on public.squadre as PERMISSIVE for SELECT to public
  using (true);

drop policy if exists "atleta elimina i propri video" on public.video;
create policy "atleta elimina i propri video" on public.video as PERMISSIVE for DELETE to public
  using ((auth.uid() = atleta_id));

drop policy if exists "atleta inserisce i propri video" on public.video;
create policy "atleta inserisce i propri video" on public.video as PERMISSIVE for INSERT to public
  with check ((auth.uid() = atleta_id));

drop policy if exists "atleta vede i propri video" on public.video;
create policy "atleta vede i propri video" on public.video as PERMISSIVE for SELECT to public
  using ((auth.uid() = atleta_id));

drop policy if exists "coach vede i video della squadra" on public.video;
create policy "coach vede i video della squadra" on public.video as PERMISSIVE for SELECT to public
  using (sono_coach_di(atleta_id));

drop policy if exists "atleta vede i propri documenti" on storage.objects;
create policy "atleta vede i propri documenti" on storage.objects as PERMISSIVE for SELECT to public
  using (((bucket_id = 'documenti-atleti'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

drop policy if exists "coach gestisce i documenti degli atleti" on storage.objects;
create policy "coach gestisce i documenti degli atleti" on storage.objects as PERMISSIVE for ALL to public
  using (((bucket_id = 'documenti-atleti'::text) AND sono_coach_di(((storage.foldername(name))[1])::uuid)))
  with check (((bucket_id = 'documenti-atleti'::text) AND sono_coach_di(((storage.foldername(name))[1])::uuid)));

drop trigger if exists punti_allenamenti on allenamenti;
CREATE TRIGGER punti_allenamenti AFTER INSERT OR UPDATE ON public.allenamenti FOR EACH ROW EXECUTE FUNCTION trg_punti_allenamenti();

drop trigger if exists punti_gare on gare;
CREATE TRIGGER punti_gare AFTER INSERT OR UPDATE OF tempo ON public.gare FOR EACH ROW EXECUTE FUNCTION trg_punti_gare();

drop trigger if exists punti_presenze on presenze;
CREATE TRIGGER punti_presenze AFTER INSERT OR UPDATE ON public.presenze FOR EACH ROW EXECUTE FUNCTION trg_punti_presenze();

revoke all on function aggiungi_a_squadra(uuid,uuid) from public, anon, authenticated;
grant execute on function aggiungi_a_squadra(uuid,uuid) to authenticated;
grant execute on function aggiungi_a_squadra(uuid,uuid) to service_role;

revoke all on function aggiungi_atleta_squadra(uuid) from public, anon, authenticated;
grant execute on function aggiungi_atleta_squadra(uuid) to authenticated;
grant execute on function aggiungi_atleta_squadra(uuid) to service_role;

revoke all on function approva_coach(uuid,boolean,text) from public, anon, authenticated;
grant execute on function approva_coach(uuid,boolean,text) to authenticated;
grant execute on function approva_coach(uuid,boolean,text) to service_role;

revoke all on function apri_premio() from public, anon, authenticated;
grant execute on function apri_premio() to authenticated;
grant execute on function apri_premio() to service_role;

revoke all on function atleti_disponibili() from public, anon, authenticated;
grant execute on function atleti_disponibili() to authenticated;
grant execute on function atleti_disponibili() to service_role;

revoke all on function cerca_persone(text,uuid) from public, anon, authenticated;
grant execute on function cerca_persone(text,uuid) to authenticated;
grant execute on function cerca_persone(text,uuid) to service_role;

revoke all on function chiedi_di_entrare(text) from public, anon, authenticated;
grant execute on function chiedi_di_entrare(text) to authenticated;
grant execute on function chiedi_di_entrare(text) to service_role;

revoke all on function chiedi_ingresso(uuid,uuid) from public, anon, authenticated;
grant execute on function chiedi_ingresso(uuid,uuid) to authenticated;
grant execute on function chiedi_ingresso(uuid,uuid) to service_role;

revoke all on function coach_da_approvare() from public, anon, authenticated;
grant execute on function coach_da_approvare() to authenticated;
grant execute on function coach_da_approvare() to service_role;

revoke all on function domande_squadra(uuid) from public, anon, authenticated;
grant execute on function domande_squadra(uuid) to authenticated;
grant execute on function domande_squadra(uuid) to service_role;

revoke all on function handle_new_user() from public, anon, authenticated;
grant execute on function handle_new_user() to service_role;

revoke all on function imposta_nome_squadra(text) from public, anon, authenticated;
grant execute on function imposta_nome_squadra(text) to authenticated;
grant execute on function imposta_nome_squadra(text) to service_role;

revoke all on function is_admin() from public, anon, authenticated;
grant execute on function is_admin() to public;
grant execute on function is_admin() to anon;
grant execute on function is_admin() to authenticated;
grant execute on function is_admin() to service_role;

revoke all on function mia_squadra() from public, anon, authenticated;
grant execute on function mia_squadra() to public;
grant execute on function mia_squadra() to anon;
grant execute on function mia_squadra() to authenticated;
grant execute on function mia_squadra() to service_role;

revoke all on function mie_richieste() from public, anon, authenticated;
grant execute on function mie_richieste() to authenticated;
grant execute on function mie_richieste() to service_role;

revoke all on function punti_assegna(uuid,text,text,date) from public, anon, authenticated;
grant execute on function punti_assegna(uuid,text,text,date) to service_role;

revoke all on function rispondi_domanda(uuid,boolean) from public, anon, authenticated;
grant execute on function rispondi_domanda(uuid,boolean) to authenticated;
grant execute on function rispondi_domanda(uuid,boolean) to service_role;

revoke all on function rispondi_richiesta(uuid,boolean) from public, anon, authenticated;
grant execute on function rispondi_richiesta(uuid,boolean) to authenticated;
grant execute on function rispondi_richiesta(uuid,boolean) to service_role;

revoke all on function sono_coach_di(uuid) from public, anon, authenticated;
grant execute on function sono_coach_di(uuid) to public;
grant execute on function sono_coach_di(uuid) to anon;
grant execute on function sono_coach_di(uuid) to authenticated;
grant execute on function sono_coach_di(uuid) to service_role;

revoke all on function sono_coach_squadra(uuid) from public, anon, authenticated;
grant execute on function sono_coach_squadra(uuid) to public;
grant execute on function sono_coach_squadra(uuid) to anon;
grant execute on function sono_coach_squadra(uuid) to authenticated;
grant execute on function sono_coach_squadra(uuid) to service_role;

revoke all on function sono_in_squadra(uuid) from public, anon, authenticated;
grant execute on function sono_in_squadra(uuid) to public;
grant execute on function sono_in_squadra(uuid) to anon;
grant execute on function sono_in_squadra(uuid) to authenticated;
grant execute on function sono_in_squadra(uuid) to service_role;

revoke all on function tempo_sec(text) from public, anon, authenticated;
grant execute on function tempo_sec(text) to public;
grant execute on function tempo_sec(text) to anon;
grant execute on function tempo_sec(text) to authenticated;
grant execute on function tempo_sec(text) to service_role;

revoke all on function togli_da_squadra(uuid) from public, anon, authenticated;
grant execute on function togli_da_squadra(uuid) to authenticated;
grant execute on function togli_da_squadra(uuid) to service_role;

revoke all on function trg_punti_allenamenti() from public, anon, authenticated;
grant execute on function trg_punti_allenamenti() to service_role;

revoke all on function trg_punti_gare() from public, anon, authenticated;
grant execute on function trg_punti_gare() to service_role;

revoke all on function trg_punti_presenze() from public, anon, authenticated;
grant execute on function trg_punti_presenze() to service_role;

revoke all on public.accessi_admin from anon, authenticated;
grant INSERT on public.accessi_admin to anon;
grant SELECT on public.accessi_admin to anon;
grant UPDATE on public.accessi_admin to anon;
grant DELETE on public.accessi_admin to anon;
grant TRUNCATE on public.accessi_admin to anon;
grant REFERENCES on public.accessi_admin to anon;
grant TRIGGER on public.accessi_admin to anon;
grant MAINTAIN on public.accessi_admin to anon;
grant INSERT on public.accessi_admin to authenticated;
grant SELECT on public.accessi_admin to authenticated;
grant UPDATE on public.accessi_admin to authenticated;
grant DELETE on public.accessi_admin to authenticated;
grant TRUNCATE on public.accessi_admin to authenticated;
grant REFERENCES on public.accessi_admin to authenticated;
grant TRIGGER on public.accessi_admin to authenticated;
grant MAINTAIN on public.accessi_admin to authenticated;

revoke all on public.allenamenti from anon, authenticated;
grant INSERT on public.allenamenti to anon;
grant SELECT on public.allenamenti to anon;
grant UPDATE on public.allenamenti to anon;
grant DELETE on public.allenamenti to anon;
grant TRUNCATE on public.allenamenti to anon;
grant REFERENCES on public.allenamenti to anon;
grant TRIGGER on public.allenamenti to anon;
grant MAINTAIN on public.allenamenti to anon;
grant INSERT on public.allenamenti to authenticated;
grant SELECT on public.allenamenti to authenticated;
grant UPDATE on public.allenamenti to authenticated;
grant DELETE on public.allenamenti to authenticated;
grant TRUNCATE on public.allenamenti to authenticated;
grant REFERENCES on public.allenamenti to authenticated;
grant TRIGGER on public.allenamenti to authenticated;
grant MAINTAIN on public.allenamenti to authenticated;

revoke all on public.allenamenti_squadra from anon, authenticated;
grant INSERT on public.allenamenti_squadra to anon;
grant SELECT on public.allenamenti_squadra to anon;
grant UPDATE on public.allenamenti_squadra to anon;
grant DELETE on public.allenamenti_squadra to anon;
grant TRUNCATE on public.allenamenti_squadra to anon;
grant REFERENCES on public.allenamenti_squadra to anon;
grant TRIGGER on public.allenamenti_squadra to anon;
grant MAINTAIN on public.allenamenti_squadra to anon;
grant INSERT on public.allenamenti_squadra to authenticated;
grant SELECT on public.allenamenti_squadra to authenticated;
grant UPDATE on public.allenamenti_squadra to authenticated;
grant DELETE on public.allenamenti_squadra to authenticated;
grant TRUNCATE on public.allenamenti_squadra to authenticated;
grant REFERENCES on public.allenamenti_squadra to authenticated;
grant TRIGGER on public.allenamenti_squadra to authenticated;
grant MAINTAIN on public.allenamenti_squadra to authenticated;

revoke all on public.atleta_riferimenti from anon, authenticated;
grant INSERT on public.atleta_riferimenti to anon;
grant SELECT on public.atleta_riferimenti to anon;
grant UPDATE on public.atleta_riferimenti to anon;
grant DELETE on public.atleta_riferimenti to anon;
grant TRUNCATE on public.atleta_riferimenti to anon;
grant REFERENCES on public.atleta_riferimenti to anon;
grant TRIGGER on public.atleta_riferimenti to anon;
grant MAINTAIN on public.atleta_riferimenti to anon;
grant INSERT on public.atleta_riferimenti to authenticated;
grant SELECT on public.atleta_riferimenti to authenticated;
grant UPDATE on public.atleta_riferimenti to authenticated;
grant DELETE on public.atleta_riferimenti to authenticated;
grant TRUNCATE on public.atleta_riferimenti to authenticated;
grant REFERENCES on public.atleta_riferimenti to authenticated;
grant TRIGGER on public.atleta_riferimenti to authenticated;
grant MAINTAIN on public.atleta_riferimenti to authenticated;

revoke all on public.compagni_squadra from anon, authenticated;
grant SELECT on public.compagni_squadra to authenticated;

revoke all on public.gare from anon, authenticated;
grant INSERT on public.gare to anon;
grant SELECT on public.gare to anon;
grant UPDATE on public.gare to anon;
grant DELETE on public.gare to anon;
grant TRUNCATE on public.gare to anon;
grant REFERENCES on public.gare to anon;
grant TRIGGER on public.gare to anon;
grant MAINTAIN on public.gare to anon;
grant INSERT on public.gare to authenticated;
grant SELECT on public.gare to authenticated;
grant UPDATE on public.gare to authenticated;
grant DELETE on public.gare to authenticated;
grant TRUNCATE on public.gare to authenticated;
grant REFERENCES on public.gare to authenticated;
grant TRIGGER on public.gare to authenticated;
grant MAINTAIN on public.gare to authenticated;

revoke all on public.premi_atleta from anon, authenticated;
grant INSERT on public.premi_atleta to anon;
grant SELECT on public.premi_atleta to anon;
grant UPDATE on public.premi_atleta to anon;
grant DELETE on public.premi_atleta to anon;
grant TRUNCATE on public.premi_atleta to anon;
grant REFERENCES on public.premi_atleta to anon;
grant TRIGGER on public.premi_atleta to anon;
grant MAINTAIN on public.premi_atleta to anon;
grant INSERT on public.premi_atleta to authenticated;
grant SELECT on public.premi_atleta to authenticated;
grant UPDATE on public.premi_atleta to authenticated;
grant DELETE on public.premi_atleta to authenticated;
grant TRUNCATE on public.premi_atleta to authenticated;
grant REFERENCES on public.premi_atleta to authenticated;
grant TRIGGER on public.premi_atleta to authenticated;
grant MAINTAIN on public.premi_atleta to authenticated;

revoke all on public.premi_catalogo from anon, authenticated;
grant INSERT on public.premi_catalogo to anon;
grant SELECT on public.premi_catalogo to anon;
grant UPDATE on public.premi_catalogo to anon;
grant DELETE on public.premi_catalogo to anon;
grant TRUNCATE on public.premi_catalogo to anon;
grant REFERENCES on public.premi_catalogo to anon;
grant TRIGGER on public.premi_catalogo to anon;
grant MAINTAIN on public.premi_catalogo to anon;
grant INSERT on public.premi_catalogo to authenticated;
grant SELECT on public.premi_catalogo to authenticated;
grant UPDATE on public.premi_catalogo to authenticated;
grant DELETE on public.premi_catalogo to authenticated;
grant TRUNCATE on public.premi_catalogo to authenticated;
grant REFERENCES on public.premi_catalogo to authenticated;
grant TRIGGER on public.premi_catalogo to authenticated;
grant MAINTAIN on public.premi_catalogo to authenticated;

revoke all on public.presenze from anon, authenticated;
grant INSERT on public.presenze to anon;
grant SELECT on public.presenze to anon;
grant UPDATE on public.presenze to anon;
grant DELETE on public.presenze to anon;
grant TRUNCATE on public.presenze to anon;
grant REFERENCES on public.presenze to anon;
grant TRIGGER on public.presenze to anon;
grant MAINTAIN on public.presenze to anon;
grant INSERT on public.presenze to authenticated;
grant SELECT on public.presenze to authenticated;
grant UPDATE on public.presenze to authenticated;
grant DELETE on public.presenze to authenticated;
grant TRUNCATE on public.presenze to authenticated;
grant REFERENCES on public.presenze to authenticated;
grant TRIGGER on public.presenze to authenticated;
grant MAINTAIN on public.presenze to authenticated;

revoke all on public.profiles from anon, authenticated;
grant INSERT on public.profiles to anon;
grant SELECT on public.profiles to anon;
grant UPDATE on public.profiles to anon;
grant DELETE on public.profiles to anon;
grant TRUNCATE on public.profiles to anon;
grant REFERENCES on public.profiles to anon;
grant TRIGGER on public.profiles to anon;
grant MAINTAIN on public.profiles to anon;
grant INSERT on public.profiles to authenticated;
grant SELECT on public.profiles to authenticated;
grant UPDATE on public.profiles to authenticated;
grant DELETE on public.profiles to authenticated;
grant TRUNCATE on public.profiles to authenticated;
grant REFERENCES on public.profiles to authenticated;
grant TRIGGER on public.profiles to authenticated;
grant MAINTAIN on public.profiles to authenticated;

revoke all on public.punti_config from anon, authenticated;
grant INSERT on public.punti_config to anon;
grant SELECT on public.punti_config to anon;
grant UPDATE on public.punti_config to anon;
grant DELETE on public.punti_config to anon;
grant TRUNCATE on public.punti_config to anon;
grant REFERENCES on public.punti_config to anon;
grant TRIGGER on public.punti_config to anon;
grant MAINTAIN on public.punti_config to anon;
grant INSERT on public.punti_config to authenticated;
grant SELECT on public.punti_config to authenticated;
grant UPDATE on public.punti_config to authenticated;
grant DELETE on public.punti_config to authenticated;
grant TRUNCATE on public.punti_config to authenticated;
grant REFERENCES on public.punti_config to authenticated;
grant TRIGGER on public.punti_config to authenticated;
grant MAINTAIN on public.punti_config to authenticated;

revoke all on public.punti_movimenti from anon, authenticated;
grant INSERT on public.punti_movimenti to anon;
grant SELECT on public.punti_movimenti to anon;
grant UPDATE on public.punti_movimenti to anon;
grant DELETE on public.punti_movimenti to anon;
grant TRUNCATE on public.punti_movimenti to anon;
grant REFERENCES on public.punti_movimenti to anon;
grant TRIGGER on public.punti_movimenti to anon;
grant MAINTAIN on public.punti_movimenti to anon;
grant INSERT on public.punti_movimenti to authenticated;
grant SELECT on public.punti_movimenti to authenticated;
grant UPDATE on public.punti_movimenti to authenticated;
grant DELETE on public.punti_movimenti to authenticated;
grant TRUNCATE on public.punti_movimenti to authenticated;
grant REFERENCES on public.punti_movimenti to authenticated;
grant TRIGGER on public.punti_movimenti to authenticated;
grant MAINTAIN on public.punti_movimenti to authenticated;

revoke all on public.richieste_squadra from anon, authenticated;
grant INSERT on public.richieste_squadra to anon;
grant SELECT on public.richieste_squadra to anon;
grant UPDATE on public.richieste_squadra to anon;
grant DELETE on public.richieste_squadra to anon;
grant TRUNCATE on public.richieste_squadra to anon;
grant REFERENCES on public.richieste_squadra to anon;
grant TRIGGER on public.richieste_squadra to anon;
grant MAINTAIN on public.richieste_squadra to anon;
grant INSERT on public.richieste_squadra to authenticated;
grant SELECT on public.richieste_squadra to authenticated;
grant UPDATE on public.richieste_squadra to authenticated;
grant DELETE on public.richieste_squadra to authenticated;
grant TRUNCATE on public.richieste_squadra to authenticated;
grant REFERENCES on public.richieste_squadra to authenticated;
grant TRIGGER on public.richieste_squadra to authenticated;
grant MAINTAIN on public.richieste_squadra to authenticated;

revoke all on public.squadre from anon, authenticated;
grant INSERT on public.squadre to anon;
grant SELECT on public.squadre to anon;
grant UPDATE on public.squadre to anon;
grant DELETE on public.squadre to anon;
grant TRUNCATE on public.squadre to anon;
grant REFERENCES on public.squadre to anon;
grant TRIGGER on public.squadre to anon;
grant MAINTAIN on public.squadre to anon;
grant INSERT on public.squadre to authenticated;
grant SELECT on public.squadre to authenticated;
grant UPDATE on public.squadre to authenticated;
grant DELETE on public.squadre to authenticated;
grant TRUNCATE on public.squadre to authenticated;
grant REFERENCES on public.squadre to authenticated;
grant TRIGGER on public.squadre to authenticated;
grant MAINTAIN on public.squadre to authenticated;

revoke all on public.video from anon, authenticated;
grant INSERT on public.video to anon;
grant SELECT on public.video to anon;
grant UPDATE on public.video to anon;
grant DELETE on public.video to anon;
grant TRUNCATE on public.video to anon;
grant REFERENCES on public.video to anon;
grant TRIGGER on public.video to anon;
grant MAINTAIN on public.video to anon;
grant INSERT on public.video to authenticated;
grant SELECT on public.video to authenticated;
grant UPDATE on public.video to authenticated;
grant DELETE on public.video to authenticated;
grant TRUNCATE on public.video to authenticated;
grant REFERENCES on public.video to authenticated;
grant TRIGGER on public.video to authenticated;
grant MAINTAIN on public.video to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('documenti-atleti', 'documenti-atleti', false, null, null) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('video-allenamenti', 'video-allenamenti', false, null, null) on conflict (id) do nothing;
