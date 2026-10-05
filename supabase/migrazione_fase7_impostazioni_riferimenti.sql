-- ============================================
-- SwimLine4 — Migrazione fase 7
-- Incolla tutto nell'SQL Editor di Supabase e premi Run (si può rieseguire).
-- Richiede la fase 3 (funzioni sono_coach_di e is_admin).
-- 1) Impostazioni: il coach aggiunge atleti alla sua squadra
-- 2) Riferimenti atleta: categoria, tesserini, certificato medico
-- ============================================

-- 1) ATLETI DISPONIBILI: solo per coach e admin.
--    Il coach vede gli atleti senza squadra e quelli già nella sua; l'admin vede tutti.
create or replace function public.atleti_disponibili()
returns table (id uuid, nome text, cognome text, nella_mia_squadra boolean)
language sql security definer stable set search_path = public as $$
  select p.id, p.nome, p.cognome,
         (p.squadra_id is not null and p.squadra_id in (select s.id from squadre s where s.coach_id = auth.uid()))
  from profiles p
  where p.role = 'atleta'
    and exists (select 1 from profiles me where me.id = auth.uid() and me.role in ('coach', 'admin'))
    and (
      p.squadra_id is null
      or p.squadra_id in (select s.id from squadre s where s.coach_id = auth.uid())
      or coalesce(public.is_admin(), false)
    )
  order by p.cognome, p.nome
$$;
grant execute on function public.atleti_disponibili() to authenticated;

create or replace function public.aggiungi_atleta_squadra(p_atleta uuid)
returns void language plpgsql security definer set search_path = public as $$
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
    where id = p_atleta and role = 'atleta'
      and (squadra_id is null or squadra_id = v_squadra or coalesce(public.is_admin(), false))
  ) then
    raise exception 'Questo atleta non è disponibile (è già in un''altra squadra)';
  end if;
  update profiles set squadra_id = v_squadra where id = p_atleta;
end $$;
grant execute on function public.aggiungi_atleta_squadra(uuid) to authenticated;

-- 2) RIFERIMENTI ATLETA
create table if not exists atleta_riferimenti (
  atleta_id uuid primary key references profiles(id) on delete cascade,
  categoria text,
  id_fin text,
  id_uisp text,
  certificato_scadenza date,
  certificato_path text,
  tesserino_path text,
  note text,
  updated_at timestamp with time zone default now()
);
alter table atleta_riferimenti enable row level security;

drop policy if exists "coach vede i riferimenti della squadra" on atleta_riferimenti;
create policy "coach vede i riferimenti della squadra"
  on atleta_riferimenti for select using (public.sono_coach_di(atleta_id));
drop policy if exists "coach inserisce i riferimenti della squadra" on atleta_riferimenti;
create policy "coach inserisce i riferimenti della squadra"
  on atleta_riferimenti for insert with check (public.sono_coach_di(atleta_id));
drop policy if exists "coach modifica i riferimenti della squadra" on atleta_riferimenti;
create policy "coach modifica i riferimenti della squadra"
  on atleta_riferimenti for update using (public.sono_coach_di(atleta_id));
drop policy if exists "atleta vede i propri riferimenti" on atleta_riferimenti;
create policy "atleta vede i propri riferimenti"
  on atleta_riferimenti for select using (auth.uid() = atleta_id);

-- Bucket PRIVATO per certificati e tesserini (dati sensibili, anche di minorenni).
-- Ogni file sta in una cartella col codice dell'atleta: <atleta_id>/nomefile
insert into storage.buckets (id, name, public) values ('documenti-atleti', 'documenti-atleti', false)
  on conflict (id) do nothing;

drop policy if exists "coach gestisce i documenti degli atleti" on storage.objects;
create policy "coach gestisce i documenti degli atleti"
  on storage.objects for all
  using (bucket_id = 'documenti-atleti' and public.sono_coach_di(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'documenti-atleti' and public.sono_coach_di(((storage.foldername(name))[1])::uuid));

drop policy if exists "atleta vede i propri documenti" on storage.objects;
create policy "atleta vede i propri documenti"
  on storage.objects for select
  using (bucket_id = 'documenti-atleti' and (storage.foldername(name))[1] = auth.uid()::text);
