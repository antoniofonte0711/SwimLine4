-- ============================================
-- SwimLine4 — 55: le gare scritte dall'atleta valgono come primato solo dopo il coach — 28 novembre 2026
-- Pentest del 12/11, punto rimasto: un atleta poteva inserire gare false (es. 100 SL in 40")
-- e la famiglia riceveva "Nuovo primato!", e il tempo finiva nei record della squadra.
-- Ora:
-- - la gara (o il tempo) scritta dall'atleta stesso è "da confermare" (colonna gare.da_confermare);
--   l'atleta la vede comunque nelle sue gare, con la scritta "da confermare".
-- - una gara da confermare non manda "Nuovo primato!", non conta come record precedente
--   e i compagni non la vedono. Punti: restano quelli già limitati dalla 48 (max 6 al giorno).
-- - il coach la conferma salvando il risultato (Oggi › Gare di oggi, o Gare › Risultati) o col tasto "Conferma":
--   solo allora parte l'eventuale "Nuovo primato!".
-- - le gare scritte dal coach, dall'admin o dal sistema sono confermate subito, come prima.
-- Le gare già salvate restano confermate. Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

alter table public.gare add column if not exists da_confermare boolean not null default false;

-- Chi scrive decide lo stato: l'atleta non può confermarsi da solo
create or replace function public.trg_gare_da_confermare()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_atleta_da_solo boolean;
begin
  v_atleta_da_solo := auth.uid() is not null and auth.uid() = new.atleta_id and not coalesce(public.is_admin(), false);
  if tg_op = 'INSERT' then
    -- una gara senza tempo (iscrizione) non ha niente da confermare
    new.da_confermare := v_atleta_da_solo and new.tempo is not null;
  elsif v_atleta_da_solo then
    if new.tempo is distinct from old.tempo or new.data_gara is distinct from old.data_gara
       or new.distanza is distinct from old.distanza or new.stile is distinct from old.stile or new.vasca is distinct from old.vasca then
      new.da_confermare := new.tempo is not null;
    else
      new.da_confermare := old.da_confermare;
    end if;
  elsif auth.uid() is not null and new.tempo is distinct from old.tempo then
    -- il coach che scrive o corregge il tempo lo conferma
    new.da_confermare := false;
  end if;
  return new;
end $$;
revoke all on function public.trg_gare_da_confermare() from public, anon, authenticated;
drop trigger if exists gare_da_confermare on public.gare;
create trigger gare_da_confermare before insert or update on public.gare
  for each row execute function public.trg_gare_da_confermare();

-- "Nuovo primato!" solo per gare confermate, confrontate con gare confermate
create or replace function public.trg_record_gare()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nuovo numeric; v_prima numeric; v_nome text; v_cosa text;
begin
  if new.tempo is null or new.da_confermare or new.data_gara > current_date then return new; end if;
  -- stesso tempo e già confermata prima: niente di nuovo
  if tg_op = 'UPDATE' and old.tempo is not distinct from new.tempo and not old.da_confermare then return new; end if;
  v_nuovo := tempo_sec(new.tempo);
  if v_nuovo is null then return new; end if;
  select min(tempo_sec(g.tempo)) into v_prima from gare g
    where g.atleta_id = new.atleta_id and g.distanza = new.distanza and g.stile = new.stile and g.vasca = new.vasca
      and g.id <> new.id and g.tempo is not null and not g.da_confermare;
  if v_prima is null or v_nuovo >= v_prima then return new; end if;
  select nome into v_nome from profiles where id = new.atleta_id;
  v_cosa := 'i ' || new.distanza || ' ' || stile_breve(new.stile) || ' in gara (vasca ' || new.vasca || ') in ' || tempo_testo(v_nuovo)
    || ', -' || tempo_testo(v_prima - v_nuovo) || ' rispetto al record precedente.';
  perform notifica_famiglia(new.atleta_id, 'record', 'Nuovo primato!', 'Hai nuotato ' || v_cosa,
    coalesce(v_nome, 'Tuo figlio') || ' ha nuotato ' || v_cosa, '/gare', 'record:' || new.id);
  return new;
end $$;
revoke all on function public.trg_record_gare() from public, anon, authenticated;
drop trigger if exists record_gare on public.gare;
create trigger record_gare after insert or update of tempo, da_confermare on public.gare
  for each row execute function public.trg_record_gare();

-- Punti "tempo migliorato": il confronto si fa solo con gare confermate (una gara finta lenta non regala miglioramenti)
create or replace function public.trg_punti_gare()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nuovo numeric; v_prima numeric; v_da_solo boolean; v_oggi int;
begin
  if new.tempo is null or new.data_gara > current_date then return new; end if;
  v_da_solo := auth.uid() is not null and auth.uid() = new.atleta_id;
  if v_da_solo then
    select count(*) into v_oggi from punti_movimenti
      where atleta_id = new.atleta_id and riferimento like 'gara:%' and created_at >= date_trunc('day', now());
    if v_oggi >= 6 then return new; end if;
  end if;
  perform public.punti_assegna(new.atleta_id, 'gara', 'gara:' || new.id::text, new.data_gara);
  v_nuovo := public.tempo_sec(new.tempo);
  if v_nuovo is not null then
    select min(public.tempo_sec(g.tempo)) into v_prima from gare g
      where g.atleta_id = new.atleta_id and g.distanza = new.distanza and g.stile = new.stile and g.vasca = new.vasca
        and g.id <> new.id and g.tempo is not null and g.data_gara <= new.data_gara and not g.da_confermare;
    if v_prima is not null and v_nuovo < v_prima then
      perform public.punti_assegna(new.atleta_id, 'miglioramento', 'miglioramento:' || new.id::text, new.data_gara);
    end if;
  end if;
  return new;
end $$;
revoke all on function public.trg_punti_gare() from public, anon, authenticated;

-- I compagni vedono solo le gare confermate
drop policy if exists "atleta vede le gare dei compagni" on public.gare;
create policy "atleta vede le gare dei compagni" on public.gare as PERMISSIVE for SELECT to public
  using (not da_confermare and atleta_id in (select compagni_squadra.id from compagni_squadra where compagni_squadra.tempi_visibili));
