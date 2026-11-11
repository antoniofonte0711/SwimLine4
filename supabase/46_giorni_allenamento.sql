-- 46: il coach sceglie i giorni di allenamento della sua squadra.
-- giorni = { "1": "si", ..., "6": "avolte" } con 0 = domenica ... 6 = sabato. Giorno assente = niente allenamento.
-- Vuoto (null) = come prima: lunedì-venerdì.
alter table public.impostazioni_squadra add column if not exists giorni jsonb;

create or replace function public.imposta_giorni_squadra(p_squadra uuid, p_giorni jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare k text; v text;
begin
  if not (is_admin() or sono_coach_squadra(p_squadra)) then
    raise exception 'Solo il coach della squadra può scegliere i giorni di allenamento';
  end if;
  if jsonb_typeof(p_giorni) <> 'object' then
    raise exception 'Giorni non validi';
  end if;
  for k, v in select key, value from jsonb_each_text(p_giorni) loop
    if k not in ('0', '1', '2', '3', '4', '5', '6') or v not in ('si', 'avolte') then
      raise exception 'Giorni non validi';
    end if;
  end loop;
  if not exists (select 1 from jsonb_each_text(p_giorni) where value = 'si') then
    raise exception 'Scegli almeno un giorno fisso di allenamento';
  end if;
  insert into impostazioni_squadra (squadra_id, giorni, aggiornato)
  values (p_squadra, p_giorni, now())
  on conflict (squadra_id) do update set giorni = excluded.giorni, aggiornato = now();
end $$;
revoke all on function public.imposta_giorni_squadra(uuid, jsonb) from public, anon;
grant execute on function public.imposta_giorni_squadra(uuid, jsonb) to authenticated;
