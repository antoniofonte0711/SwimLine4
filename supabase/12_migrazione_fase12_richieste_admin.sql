-- ============================================
-- SwimLine4 — Migrazione fase 12 (l'admin è anche atleta: entra in squadra solo accettando)
-- Incolla tutto nell'SQL Editor di Supabase e premi Run (si può rieseguire).
-- Richiede le fasi 10 e 11. Aggiunge una tabella nuova, non tocca i dati esistenti.
--  - I coach trovano anche gli account admin nella ricerca (l'admin è prima di tutto un atleta)
--  - Un admin non si aggiunge direttamente: il coach gli manda una richiesta e lui accetta o rifiuta
--  - Atleti e genitori restano come prima (li aggiunge direttamente il coach)
-- ============================================

create table if not exists richieste_squadra (
  id uuid primary key default gen_random_uuid(),
  squadra_id uuid not null references squadre(id) on delete cascade,
  persona_id uuid not null references profiles(id) on delete cascade,
  richiesta_da uuid references profiles(id) on delete set null,
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'accettata', 'rifiutata')),
  created_at timestamp with time zone default now(),
  risposta_il timestamp with time zone
);
-- Una sola richiesta in attesa per persona e squadra
create unique index if not exists richieste_squadra_una_in_attesa
  on richieste_squadra (squadra_id, persona_id) where stato = 'in_attesa';
alter table richieste_squadra enable row level security;

-- La vede chi la riceve e il coach della squadra; si scrive solo con le funzioni qui sotto
drop policy if exists "richieste lettura" on richieste_squadra;
create policy "richieste lettura" on richieste_squadra for select
  using (persona_id = auth.uid() or public.sono_coach_squadra(squadra_id));

-- Ricerca: come la fase 11, più gli account admin (trovabili da tutti i coach) e lo stato della richiesta
drop function if exists public.cerca_persone(text, uuid);
create function public.cerca_persone(p_testo text, p_squadra uuid)
returns table (id uuid, nome text, cognome text, ruolo text, squadra_id uuid, squadra_nome text, richiesta_in_attesa boolean)
language plpgsql security definer stable set search_path = public as $$
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
end $$;
grant execute on function public.cerca_persone(text, uuid) to authenticated;

-- Aggiunta diretta: atleti e genitori; un admin solo se aggiunge sé stesso
create or replace function public.aggiungi_a_squadra(p_persona uuid, p_squadra uuid)
returns text
language plpgsql security definer set search_path = public as $$
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
end $$;
grant execute on function public.aggiungi_a_squadra(uuid, uuid) to authenticated;

-- Il coach chiede a un admin di entrare nella sua squadra
create or replace function public.chiedi_ingresso(p_persona uuid, p_squadra uuid)
returns void
language plpgsql security definer set search_path = public as $$
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
end $$;
grant execute on function public.chiedi_ingresso(uuid, uuid) to authenticated;

-- Le richieste in attesa per me, con squadra e coach
create or replace function public.mie_richieste()
returns table (id uuid, squadra_id uuid, squadra_nome text, coach_nome text, created_at timestamp with time zone)
language sql security definer stable set search_path = public as $$
  select r.id, r.squadra_id, s.nome, trim(coalesce(c.nome, '') || ' ' || coalesce(c.cognome, '')), r.created_at
  from richieste_squadra r
  join squadre s on s.id = r.squadra_id
  left join profiles c on c.id = coalesce(r.richiesta_da, s.coach_id)
  where r.persona_id = auth.uid() and r.stato = 'in_attesa'
  order by r.created_at desc
$$;
grant execute on function public.mie_richieste() to authenticated;

-- Accetto (entro in squadra) o rifiuto una richiesta ricevuta
create or replace function public.rispondi_richiesta(p_richiesta uuid, p_accetta boolean)
returns text
language plpgsql security definer set search_path = public as $$
declare v_squadra uuid; v_nome text;
begin
  select squadra_id into v_squadra from richieste_squadra
    where id = p_richiesta and persona_id = auth.uid() and stato = 'in_attesa';
  if v_squadra is null then raise exception 'Richiesta non trovata o già gestita'; end if;
  update richieste_squadra
    set stato = case when p_accetta then 'accettata' else 'rifiutata' end, risposta_il = now()
    where id = p_richiesta;
  if p_accetta then
    update profiles set squadra_id = v_squadra where id = auth.uid();
  end if;
  select nome into v_nome from squadre where id = v_squadra;
  return v_nome;
end $$;
grant execute on function public.rispondi_richiesta(uuid, boolean) to authenticated;
