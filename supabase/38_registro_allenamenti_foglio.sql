-- Migrazione 38 (23/10/2026): registro allenamenti su Google Fogli.
-- Stessa chiave del registro presenze (tabella registro_fogli, migrazione 37): il foglio legge con
-- =IMPORTDATA("…/api/registro-presenze?k=CHIAVE&tipo=allenamenti"). Solo gli allenamenti pubblicati alla squadra.

create or replace function public.registro_allenamenti(p_chiave text)
returns table (data date, titolo text, righe jsonb)
language sql stable security definer set search_path = public as $$
  select a.data, a.titolo, a.righe
  from allenamenti_squadra a join registro_fogli r on r.squadra_id = a.squadra_id
  where r.chiave = p_chiave and length(p_chiave) >= 32 and a.pubblicato and a.visibilita = 'squadra'
  order by a.data
$$;
revoke all on function public.registro_allenamenti(text) from public;
grant execute on function public.registro_allenamenti(text) to anon, authenticated;
