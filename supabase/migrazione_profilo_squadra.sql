-- ============================================
-- SwimLine4 — Squadra dal Profilo
-- Incolla tutto nell'SQL Editor di Supabase e premi Run (si può rieseguire).
-- Funzioni sicure: ognuno cambia solo la PROPRIA squadra, mai il proprio ruolo.
-- ============================================

-- Atleta / genitore: collegarsi a una squadra scrivendo il nome (vuoto = esci dalla squadra)
create or replace function public.scegli_squadra(p_nome text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_nome text; v_ruolo text;
begin
  select role into v_ruolo from profiles where id = auth.uid();
  if v_ruolo is null then raise exception 'Profilo non trovato'; end if;
  if v_ruolo not in ('atleta', 'genitore') then
    raise exception 'Solo atleti e genitori possono scegliere una squadra';
  end if;
  if trim(coalesce(p_nome, '')) = '' then
    update profiles set squadra_id = null where id = auth.uid();
    return '';
  end if;
  select id, nome into v_id, v_nome from squadre
    where lower(trim(nome)) = lower(trim(p_nome)) limit 1;
  if v_id is null then raise exception 'Nessuna squadra con questo nome'; end if;
  update profiles set squadra_id = v_id where id = auth.uid();
  return v_nome;
end $$;

-- Coach (e admin): crea la propria squadra o ne cambia il nome
create or replace function public.imposta_nome_squadra(p_nome text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ruolo text; v_nome text := trim(coalesce(p_nome, ''));
begin
  select role into v_ruolo from profiles where id = auth.uid();
  if v_ruolo not in ('coach', 'admin') then
    raise exception 'Solo il coach può impostare il nome della squadra';
  end if;
  if v_nome = '' then raise exception 'Scrivi il nome della squadra'; end if;
  if exists (select 1 from squadre
             where lower(trim(nome)) = lower(v_nome) and coach_id is distinct from auth.uid()) then
    raise exception 'Questo nome è già usato da un''altra squadra';
  end if;
  select id into v_id from squadre where coach_id = auth.uid() limit 1;
  if v_id is null then
    insert into squadre (nome, coach_id) values (v_nome, auth.uid()) returning id into v_id;
  else
    update squadre set nome = v_nome where id = v_id;
  end if;
  update profiles set squadra_id = v_id where id = auth.uid();
  return v_nome;
end $$;

grant execute on function public.scegli_squadra(text) to authenticated;
grant execute on function public.imposta_nome_squadra(text) to authenticated;
