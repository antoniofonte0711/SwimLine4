-- ============================================
-- SwimLine4 — 22: vasca corta (25 m) e lunga (50 m) nelle gare (11 ottobre 2026)
-- Un 100 SL in vasca da 25 e uno in vasca da 50 sono tempi diversi: record, miglioramenti
-- e punti confrontano solo gare nella stessa vasca. Le gare già salvate restano a 25 m.
-- Si può rieseguire.
-- ============================================
alter table public.gare add column if not exists vasca smallint not null default 25;
do $$ begin
  alter table public.gare add constraint gare_vasca_valida check (vasca in (25, 50));
exception when duplicate_object then null; end $$;

-- record personali di gara: solo nella stessa vasca (e il testo dice quale)
create or replace function public.trg_record_gare()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nuovo numeric; v_prima numeric; v_nome text; v_cosa text;
begin
  if new.tempo is null or (tg_op = 'UPDATE' and old.tempo is not distinct from new.tempo) then return new; end if;
  v_nuovo := tempo_sec(new.tempo);
  if v_nuovo is null then return new; end if;
  select min(tempo_sec(g.tempo)) into v_prima from gare g
    where g.atleta_id = new.atleta_id and g.distanza = new.distanza and g.stile = new.stile and g.vasca = new.vasca
      and g.id <> new.id and g.tempo is not null;
  if v_prima is null or v_nuovo >= v_prima then return new; end if;
  select nome into v_nome from profiles where id = new.atleta_id;
  v_cosa := 'i ' || new.distanza || ' ' || stile_breve(new.stile) || ' in gara (vasca ' || new.vasca || ') in ' || tempo_testo(v_nuovo)
    || ', -' || tempo_testo(v_prima - v_nuovo) || ' rispetto al record precedente.';
  perform notifica_famiglia(new.atleta_id, 'record', 'Nuovo primato!', 'Hai nuotato ' || v_cosa,
    coalesce(v_nome, 'Tuo figlio') || ' ha nuotato ' || v_cosa, '/gare', 'record:' || new.id);
  return new;
end $$;

-- punti "tempo migliorato": confronto nella stessa vasca
create or replace function public.trg_punti_gare()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nuovo numeric; v_prima numeric;
begin
  if new.tempo is null then return new; end if;
  perform public.punti_assegna(new.atleta_id, 'gara', 'gara:' || new.id::text, new.data_gara);
  v_nuovo := public.tempo_sec(new.tempo);
  if v_nuovo is not null then
    select min(public.tempo_sec(g.tempo)) into v_prima from gare g
      where g.atleta_id = new.atleta_id and g.distanza = new.distanza and g.stile = new.stile and g.vasca = new.vasca
        and g.id <> new.id and g.tempo is not null and g.data_gara <= new.data_gara;
    if v_prima is not null and v_nuovo < v_prima then
      perform public.punti_assegna(new.atleta_id, 'miglioramento', 'miglioramento:' || new.id::text, new.data_gara);
    end if;
  end if;
  return new;
end $$;

revoke all on function public.trg_record_gare() from public, anon, authenticated;
revoke all on function public.trg_punti_gare() from public, anon, authenticated;
