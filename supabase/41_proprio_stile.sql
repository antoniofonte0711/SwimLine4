-- Migrazione 41 (25/10/2026): il "proprio stile" (PS) di ogni atleta.
-- - profiles.proprio_stile: Dorso, Rana o Farfalla. L'atleta in squadra lo sceglie appena entra (o al prossimo accesso).
-- - I lavori "Proprio stile" del coach si salvano nella categoria dello stile dell'atleta (progressi, record).
-- - Scegliendolo, i tempi già salvati come "Proprio stile" passano nella categoria dello stile scelto.
-- Si può rieseguire.

alter table public.profiles add column if not exists proprio_stile text;
alter table public.profiles drop constraint if exists profiles_proprio_stile_check;
alter table public.profiles add constraint profiles_proprio_stile_check
  check (proprio_stile is null or proprio_stile in ('Dorso', 'Rana', 'Farfalla'));

-- Come imposta_sesso: la persona stessa o il suo coach
create or replace function public.imposta_proprio_stile(p_persona uuid, p_stile text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non autenticato'; end if;
  if p_persona <> auth.uid() and not sono_coach_di(p_persona) then raise exception 'Non puoi cambiarlo per questa persona'; end if;
  if p_stile is null or p_stile not in ('Dorso', 'Rana', 'Farfalla') then raise exception 'Scegli dorso, rana o farfalla'; end if;
  update profiles set proprio_stile = p_stile where id = p_persona;
  update allenamenti set stile = p_stile where atleta_id = p_persona and stile = 'Proprio stile';
end $$;
revoke all on function public.imposta_proprio_stile(uuid, text) from public, anon;
grant execute on function public.imposta_proprio_stile(uuid, text) to authenticated;
