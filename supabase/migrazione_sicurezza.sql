-- Correzioni di sicurezza (controllo del 7 ottobre 2026)

-- 1. La vista dei compagni di squadra si può solo leggere.
--    Prima un atleta collegato poteva modificare o cancellare il profilo di un compagno
--    (la vista gira con i permessi del proprietario e scavalca le regole di accesso;
--    cancellare un profilo cancella a catena allenamenti, gare, presenze, punti e video).
revoke all on public.compagni_squadra from anon, authenticated;
grant select on public.compagni_squadra to authenticated;

-- 2. In registrazione si può scegliere solo atleta, coach o genitore.
--    Prima bastava mandare role = 'admin' nei dati di registrazione per diventare admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nuova_squadra_id uuid;
  v_ruolo text := new.raw_user_meta_data->>'role';
begin
  if v_ruolo is null or v_ruolo not in ('atleta', 'coach', 'genitore') then
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

  if v_ruolo = 'coach' and new.raw_user_meta_data->>'nome_squadra' is not null then
    insert into public.squadre (nome, coach_id)
    values (new.raw_user_meta_data->>'nome_squadra', new.id)
    returning id into nuova_squadra_id;
    update public.profiles set squadra_id = nuova_squadra_id where id = new.id;
  elsif new.raw_user_meta_data->>'squadra_id' is not null then
    update public.profiles set squadra_id = (new.raw_user_meta_data->>'squadra_id')::uuid where id = new.id;
  end if;
  return new;
end;
$$;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('atleta', 'coach', 'genitore', 'admin'));

-- 3. Un coach cancella allenamenti e gare solo della propria squadra (l'admin tutto).
--    Prima qualsiasi coach, anche appena registrato, poteva cancellare quelli di tutte le squadre.
--    Restano le regole "coach elimina ... della squadra" e "atleta elimina i propri ...".
drop policy if exists "coach e admin eliminano tutti gli allenamenti" on public.allenamenti;
drop policy if exists "coach e admin eliminano tutte le gare" on public.gare;

-- 4. I punti si assegnano solo in automatico (presenze, risultati, gare).
--    Prima chiunque, anche senza login, poteva regalarsi punti all'infinito chiamando la funzione.
revoke execute on function public.punti_assegna(uuid, text, text, date) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.trg_punti_allenamenti() from public, anon, authenticated;
revoke execute on function public.trg_punti_gare() from public, anon, authenticated;
revoke execute on function public.trg_punti_presenze() from public, anon, authenticated;

-- 5. Le funzioni dell'app si possono chiamare solo dopo il login.
revoke execute on function public.aggiungi_a_squadra(uuid, uuid) from public, anon;
revoke execute on function public.aggiungi_atleta_squadra(uuid) from public, anon;
revoke execute on function public.apri_premio() from public, anon;
revoke execute on function public.atleti_disponibili() from public, anon;
revoke execute on function public.cerca_persone(text, uuid) from public, anon;
revoke execute on function public.chiedi_ingresso(uuid, uuid) from public, anon;
revoke execute on function public.mie_richieste() from public, anon;
revoke execute on function public.rispondi_richiesta(uuid, boolean) from public, anon;
revoke execute on function public.togli_da_squadra(uuid) from public, anon;
grant execute on function public.aggiungi_a_squadra(uuid, uuid) to authenticated;
grant execute on function public.aggiungi_atleta_squadra(uuid) to authenticated;
grant execute on function public.apri_premio() to authenticated;
grant execute on function public.atleti_disponibili() to authenticated;
grant execute on function public.cerca_persone(text, uuid) to authenticated;
grant execute on function public.chiedi_ingresso(uuid, uuid) to authenticated;
grant execute on function public.mie_richieste() to authenticated;
grant execute on function public.rispondi_richiesta(uuid, boolean) to authenticated;
grant execute on function public.togli_da_squadra(uuid) to authenticated;

-- 6. Percorso di ricerca fisso per le funzioni rimaste senza.
alter function public.is_admin() set search_path = public;
alter function public.tempo_sec(text) set search_path = public;
