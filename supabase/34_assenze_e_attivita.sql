-- ============================================
-- SwimLine4 — 34: assenze ai genitori, tempo di attività, "Attivazione" di base (18 ottobre 2026)
-- - assenza segnata dal coach → notifica ai genitori approvati (sul telefono solo questa, i primati e gli avvisi)
-- - attivita_giornaliera: minuti e aperture per persona e giorno; li legge solo l'admin
-- - "Attivazione" diventa un lavoro di base (peso 0,5): il lavoro con lo stesso nome creato da una squadra si toglie
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

-- ---------- "Attivazione" è ora di base ----------
delete from public.tipi_lavoro_squadra where lower(trim(sigla)) = 'attivazione';
delete from public.tipi_lavoro where lower(trim(sigla)) = 'attivazione';

-- ---------- interruttore del Pannello per le assenze ----------
create or replace function public.notifica_attiva(p_tipo text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (valore ->> case
      when p_tipo = 'record' then 'record'
      when p_tipo like 'gara\_%' then 'gare'
      when p_tipo in ('richiesta_genitore', 'risposta_genitore') then 'genitori'
      when p_tipo = 'incoraggiamento' then 'incoraggiamenti'
      when p_tipo = 'assenza' then 'assenza'
      when p_tipo in ('domanda_squadra', 'squadra') then 'squadra'
      when p_tipo = 'tempi' then 'tempi'
      when p_tipo like 'fuori\_piano%' then 'fuori_piano'
      when p_tipo = 'segnalazione' then 'segnalazioni'
      when p_tipo = 'email' then 'email'
      else '__nessuna' end)::boolean
    from impostazioni_app where chiave = 'notifiche'), true)
$$;

-- ---------- assenza segnata → genitori ----------
create or replace function public.trg_notifica_assenza()
returns trigger language plpgsql security definer set search_path = public as $$
declare g record; v_nome text;
begin
  if new.stato = 'assente' and (tg_op = 'INSERT' or old.stato is distinct from 'assente') then
    begin
      select coalesce(nullif(trim(nome), ''), 'Tuo figlio') into v_nome from profiles where id = new.atleta_id;
      for g in select genitore_id from genitori_figli where atleta_id = new.atleta_id and stato = 'approvato' loop
        perform crea_notifica(g.genitore_id, 'assenza', 'Assenza segnata',
          'Assenza di ' || v_nome || ' all''allenamento del ' || to_char(new.data, 'DD/MM') || '.',
          '/dashboard', 'assenza:' || new.atleta_id || ':' || new.data);
      end loop;
    exception when others then null; -- mai bloccare il segnare le presenze
    end;
  end if;
  return new;
end $$;
drop trigger if exists notifica_assenza on public.presenze;
create trigger notifica_assenza after insert or update of stato on public.presenze
  for each row execute function public.trg_notifica_assenza();

-- ---------- tempo di attività ----------
create table if not exists public.attivita_giornaliera (
  utente_id uuid not null references public.profiles(id) on delete cascade,
  giorno date not null,
  minuti integer not null default 0,
  aperture integer not null default 0,
  ultimo_segnale timestamp with time zone not null default now(),
  primary key (utente_id, giorno)
);
alter table public.attivita_giornaliera enable row level security; -- nessuna policy: si passa solo dalle funzioni

-- L'app, aperta e in primo piano, la chiama ogni minuto. Conta 1 minuto se è passato quasi un minuto dall'ultimo segnale.
create or replace function public.segnala_attivita(p_apertura boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_oggi date := (now() at time zone 'Europe/Rome')::date;
begin
  if auth.uid() is null then return; end if;
  insert into attivita_giornaliera (utente_id, giorno, minuti, aperture, ultimo_segnale)
  values (auth.uid(), v_oggi, 1, case when p_apertura then 1 else 0 end, now())
  on conflict (utente_id, giorno) do update set
    minuti = attivita_giornaliera.minuti + case when now() - attivita_giornaliera.ultimo_segnale >= interval '45 seconds' then 1 else 0 end,
    aperture = attivita_giornaliera.aperture + case when p_apertura then 1 else 0 end,
    ultimo_segnale = now();
  -- teniamo 90 giorni
  delete from attivita_giornaliera where utente_id = auth.uid() and giorno < v_oggi - 90;
end $$;
revoke all on function public.segnala_attivita(boolean) from public, anon;
grant execute on function public.segnala_attivita(boolean) to authenticated;

-- Per l'admin: per ogni persona, gli ultimi p_giorni giorni
create or replace function public.admin_attivita(p_giorni integer default 7)
returns table(persona_id uuid, giorni_attivi integer, minuti_totali integer, aperture integer, ultimo_segnale timestamp with time zone)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'Solo l''amministratore'; end if;
  return query
    select a.utente_id, count(*)::integer, sum(a.minuti)::integer, sum(a.aperture)::integer, max(a.ultimo_segnale)
    from attivita_giornaliera a
    where a.giorno > (now() at time zone 'Europe/Rome')::date - greatest(least(p_giorni, 90), 1)
    group by a.utente_id;
end $$;
revoke all on function public.admin_attivita(integer) from public, anon;
grant execute on function public.admin_attivita(integer) to authenticated;
