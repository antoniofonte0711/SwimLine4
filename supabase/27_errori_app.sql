-- ============================================
-- SwimLine4 — 27: registro degli errori dell'app — 11 ottobre 2026
-- Quando l'app va in errore sul telefono di qualcuno, l'errore arriva qui (gratis, niente servizi esterni)
-- e l'admin lo vede nel Pannello › Segnalazioni, senza aspettare che qualcuno lo segnali.
-- - si scrive solo con registra_errore(): testi accorciati, stesso errore nelle 24 ore = un contatore,
--   al massimo 200 errori nuovi all'ora in tutto (freno contro chi volesse riempire la tabella)
-- - si tengono 60 giorni; li legge e li cancella solo l'admin
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

create table if not exists public.errori_app (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  ultima_volta timestamp with time zone not null default now(),
  volte integer not null default 1,
  utente_id uuid references public.profiles(id) on delete set null,
  pagina text,
  messaggio text not null,
  dettagli text,
  dispositivo text,
  versione text
);
create index if not exists errori_app_quando on public.errori_app (ultima_volta desc);
create index if not exists errori_app_utente on public.errori_app (utente_id);

alter table public.errori_app enable row level security;
drop policy if exists "errori_app admin legge" on public.errori_app;
create policy "errori_app admin legge" on public.errori_app for SELECT to authenticated using ((select is_admin()));
drop policy if exists "errori_app admin elimina" on public.errori_app;
create policy "errori_app admin elimina" on public.errori_app for DELETE to authenticated using ((select is_admin()));

create or replace function public.registra_errore(p_messaggio text, p_dettagli text, p_pagina text, p_dispositivo text, p_versione text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_utente uuid := auth.uid();
  v_msg text := left(coalesce(trim(p_messaggio), ''), 500);
  v_pagina text := left(coalesce(p_pagina, ''), 200);
  v_id uuid;
begin
  if v_msg = '' then return; end if;
  if v_utente is not null and not exists (select 1 from profiles where id = v_utente) then v_utente := null; end if;
  -- stesso errore, stessa pagina nelle ultime 24 ore: si conta e basta
  update errori_app set volte = volte + 1, ultima_volta = now()
    where id = (select id from errori_app where messaggio = v_msg and coalesce(pagina, '') = v_pagina
                  and ultima_volta > now() - interval '24 hours' order by ultima_volta desc limit 1)
    returning id into v_id;
  if v_id is not null then return; end if;
  if (select count(*) from errori_app where created_at > now() - interval '1 hour') >= 200 then return; end if;
  insert into errori_app (utente_id, pagina, messaggio, dettagli, dispositivo, versione)
  values (v_utente, nullif(v_pagina, ''), v_msg, left(p_dettagli, 4000), left(p_dispositivo, 300), left(p_versione, 20));
  delete from errori_app where ultima_volta < now() - interval '60 days';
end $$;
revoke all on function public.registra_errore(text, text, text, text, text) from public;
grant execute on function public.registra_errore(text, text, text, text, text) to anon, authenticated;
