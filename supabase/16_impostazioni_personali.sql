-- ============================================
-- SwimLine4 — 16: impostazioni personali (Profilo) — 10 ottobre 2026
-- - nome e cognome modificabili da ognuno (solo quelli: il ruolo no)
-- - privacy: "i compagni vedono le mie gare" (sì di base)
-- - segnalazioni di problemi, lette dall'admin
-- - elimina il mio account (atleti e genitori; un coach si rivolge all'admin
--   perché cancellarlo cancellerebbe tutta la squadra)
-- - notifiche push: iscrizioni dei telefoni e chiavi del server
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero quando si pubblica.
-- ============================================

-- Privacy: i compagni vedono le mie gare
alter table public.profiles add column if not exists tempi_visibili boolean not null default true;

create or replace view public.compagni_squadra as  SELECT id,
    nome,
    cognome,
    squadra_id,
    tempi_visibili
   FROM profiles
  WHERE ((role = ANY (ARRAY['atleta'::text, 'admin'::text])) AND (squadra_id IS NOT NULL) AND (squadra_id = mia_squadra()));

drop policy if exists "atleta vede le gare dei compagni" on public.gare;
create policy "atleta vede le gare dei compagni" on public.gare as PERMISSIVE for SELECT to public
  using ((atleta_id IN ( SELECT compagni_squadra.id
   FROM compagni_squadra
  WHERE compagni_squadra.tempi_visibili)));

-- Nome, cognome e privacy: ognuno cambia solo i suoi (il resto del profilo resta all'admin)
create or replace function public.aggiorna_mio_profilo(p_nome text, p_cognome text, p_tempi_visibili boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Non autenticato'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Il nome non può essere vuoto'; end if;
  if length(p_nome) > 60 or length(coalesce(p_cognome, '')) > 60 then raise exception 'Nome troppo lungo'; end if;
  update profiles
     set nome = trim(p_nome),
         cognome = nullif(trim(coalesce(p_cognome, '')), ''),
         tempi_visibili = coalesce(p_tempi_visibili, tempi_visibili)
   where id = auth.uid();
end $$;
revoke all on function public.aggiorna_mio_profilo(text, text, boolean) from public, anon;
grant execute on function public.aggiorna_mio_profilo(text, text, boolean) to authenticated;

-- Segnalazioni di problemi
create table if not exists public.segnalazioni (
  id uuid default gen_random_uuid() primary key,
  autore_id uuid references public.profiles(id) on delete set null,
  testo text not null check (length(testo) between 1 and 2000),
  pagina text,
  dispositivo text,
  created_at timestamp with time zone default now()
);
alter table public.segnalazioni enable row level security;
drop policy if exists "segnalazioni invio" on public.segnalazioni;
create policy "segnalazioni invio" on public.segnalazioni for INSERT to authenticated
  with check (autore_id = auth.uid());
drop policy if exists "segnalazioni admin legge" on public.segnalazioni;
create policy "segnalazioni admin legge" on public.segnalazioni for SELECT to authenticated
  using (is_admin());
drop policy if exists "segnalazioni admin elimina" on public.segnalazioni;
create policy "segnalazioni admin elimina" on public.segnalazioni for DELETE to authenticated
  using (is_admin());

-- Elimina il mio account: cancella l'utente, e a cascata profilo, tempi, gare, presenze, punti, video
create or replace function public.elimina_mio_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_ruolo text;
begin
  if auth.uid() is null then raise exception 'Non autenticato'; end if;
  select role into v_ruolo from public.profiles where id = auth.uid();
  if v_ruolo is not null and v_ruolo not in ('atleta', 'genitore') then
    raise exception 'Un account coach o admin si chiude chiedendo all''amministratore';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.elimina_mio_account() from public, anon;
grant execute on function public.elimina_mio_account() to authenticated;

-- Notifiche push: un'iscrizione per ogni telefono/browser
create table if not exists public.push_iscrizioni (
  id uuid default gen_random_uuid() primary key,
  utente_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default now()
);
alter table public.push_iscrizioni enable row level security;
drop policy if exists "push le mie iscrizioni" on public.push_iscrizioni;
create policy "push le mie iscrizioni" on public.push_iscrizioni for ALL to authenticated
  using (utente_id = auth.uid())
  with check (utente_id = auth.uid());

-- Chiavi del server per le notifiche (le crea la funzione "notifiche" al primo uso).
-- Nessuna regola di accesso: le legge solo il server con la chiave service_role.
create table if not exists public.segreti (
  chiave text primary key,
  valore text not null
);
alter table public.segreti enable row level security;
