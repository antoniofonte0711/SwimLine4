-- ============================================
-- SwimLine4 — 43: voci di punti del coach e premi a scelta (26 ottobre 2026)
-- - Il coach può aggiungere voci di punti sue (es. "Allenamento extra": 20) e darle a mano agli atleti
--   (gli inserimenti passano dalla regola "movimenti bonus coach" già esistente).
-- - Ogni premio ha un costo (di solito 90-100% della soglia) e una probabilità (peso).
-- - Arrivato alla soglia, l'atleta riceve 3 premi estratti (i più probabili escono più spesso),
--   ne sceglie uno e paga il suo costo; i punti che avanzano restano.
--   Le 3 proposte restano ferme finché non sceglie (ricaricare la pagina non le cambia).
-- - Il vecchio premio a sorpresa (apri_premio) non si usa più.
-- Si può rieseguire.
-- ============================================

create table if not exists public.punti_voci (
  id uuid primary key default gen_random_uuid(),
  squadra_id uuid not null references public.squadre(id) on delete cascade,
  nome text not null,
  punti int not null check (punti > 0),
  created_at timestamptz default now()
);
create index if not exists punti_voci_squadra on public.punti_voci (squadra_id);
alter table public.punti_voci enable row level security;
drop policy if exists "voci lettura" on public.punti_voci;
create policy "voci lettura" on public.punti_voci for select to authenticated
  using (sono_coach_squadra(squadra_id) or sono_in_squadra(squadra_id));
drop policy if exists "voci coach" on public.punti_voci;
create policy "voci coach" on public.punti_voci for all to authenticated
  using (sono_coach_squadra(squadra_id)) with check (sono_coach_squadra(squadra_id));

alter table public.premi_catalogo add column if not exists costo int check (costo is null or costo > 0);
alter table public.premi_atleta add column if not exists costo int;

-- le 3 proposte in attesa di scelta, una riga per atleta
create table if not exists public.premi_proposte (
  atleta_id uuid primary key references public.profiles(id) on delete cascade,
  squadra_id uuid not null references public.squadre(id) on delete cascade,
  opzioni jsonb not null,
  created_at timestamptz default now()
);
alter table public.premi_proposte enable row level security;
drop policy if exists "proposte lettura" on public.premi_proposte;
create policy "proposte lettura" on public.premi_proposte for select to authenticated
  using ((select auth.uid()) = atleta_id);

-- punti ancora da spendere: guadagnati meno il costo dei premi presi (i vecchi premi senza costo valgono una soglia)
create or replace function public.saldo_punti(p_atleta uuid, p_soglia int)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce((select sum(punti) from punti_movimenti where atleta_id = p_atleta), 0)
       - coalesce((select sum(coalesce(costo, p_soglia)) from premi_atleta where atleta_id = p_atleta), 0)
$$;
revoke all on function public.saldo_punti(uuid, int) from public, anon, authenticated;

-- le 3 proposte (le crea se l'atleta è arrivato alla soglia e non ne ha già)
create or replace function public.proponi_premi()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_sq uuid; v_soglia int; v_op jsonb;
begin
  select squadra_id into v_sq from profiles where id = auth.uid();
  if v_sq is null then raise exception 'Non sei in una squadra'; end if;
  select opzioni into v_op from premi_proposte where atleta_id = auth.uid() and squadra_id = v_sq;
  if v_op is not null then return v_op; end if;
  select coalesce((select soglia_premio from punti_config where squadra_id = v_sq), 1000) into v_soglia;
  if saldo_punti(auth.uid(), v_soglia) < v_soglia then raise exception 'Non hai ancora abbastanza punti'; end if;
  select jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'costo', coalesce(costo, v_soglia))) into v_op
  from (
    select id, nome, costo from premi_catalogo
    where squadra_id = v_sq and attivo and peso > 0
    order by -ln(1 - random()) / peso
    limit 3
  ) x;
  if v_op is null then raise exception 'Il coach non ha ancora inserito premi'; end if;
  insert into premi_proposte (atleta_id, squadra_id, opzioni) values (auth.uid(), v_sq, v_op)
    on conflict (atleta_id) do update set squadra_id = excluded.squadra_id, opzioni = excluded.opzioni, created_at = now();
  return v_op;
end $$;

-- l'atleta sceglie uno dei 3: paga il costo, il premio va al coach da confermare
create or replace function public.scegli_premio(p_premio uuid)
returns premi_atleta language plpgsql security definer set search_path = public as $$
declare v_sq uuid; v_soglia int; v_op jsonb; v_scelta jsonb; r premi_atleta;
begin
  select squadra_id into v_sq from profiles where id = auth.uid();
  select opzioni into v_op from premi_proposte where atleta_id = auth.uid() and squadra_id = v_sq;
  if v_op is null then raise exception 'Nessun premio da scegliere'; end if;
  select e into v_scelta from jsonb_array_elements(v_op) e where e->>'id' = p_premio::text;
  if v_scelta is null then raise exception 'Questo premio non è tra quelli proposti'; end if;
  select coalesce((select soglia_premio from punti_config where squadra_id = v_sq), 1000) into v_soglia;
  if saldo_punti(auth.uid(), v_soglia) < (v_scelta->>'costo')::int then raise exception 'Non hai abbastanza punti per questo premio'; end if;
  insert into premi_atleta (atleta_id, squadra_id, premio_nome, costo)
    values (auth.uid(), v_sq, v_scelta->>'nome', (v_scelta->>'costo')::int) returning * into r;
  delete from premi_proposte where atleta_id = auth.uid();
  return r;
end $$;

-- il vecchio premio a sorpresa non si usa più
create or replace function public.apri_premio()
returns premi_atleta language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Aggiorna la pagina: ora i premi si scelgono tra 3 proposte';
end $$;

revoke all on function public.proponi_premi() from public, anon;
revoke all on function public.scegli_premio(uuid) from public, anon;
grant execute on function public.proponi_premi() to authenticated;
grant execute on function public.scegli_premio(uuid) to authenticated;
