-- ============================================
-- SwimLine4 — 20: premio grande raro (11 ottobre 2026)
-- I premi piccoli escono a ogni apertura (ogni soglia di punti, di solito 100).
-- Il premio grande (es. saltare un 400, decidere l'ultima parte dell'allenamento) è bloccato
-- finché l'atleta non ha aperto 6 premi piccoli dal suo ultimo premio grande; da lì esce col 40%
-- a ogni apertura. Con presenza piena (~1 premio a settimana) arriva in media ogni 2-3 mesi.
-- Si può rieseguire.
-- ============================================
alter table public.premi_catalogo add column if not exists grande boolean not null default false;
alter table public.premi_atleta add column if not exists grande boolean not null default false;

create or replace function public.apri_premio()
returns premi_atleta language plpgsql security definer set search_path = public as $$
declare v_sq uuid; v_soglia int; v_tot bigint; v_gia bigint; v_piccoli bigint; v_ultimo timestamptz;
  v_nome text; v_grande boolean := false; r premi_atleta;
begin
  select squadra_id into v_sq from profiles where id = auth.uid();
  if v_sq is null then raise exception 'Non sei in una squadra'; end if;
  select coalesce((select soglia_premio from punti_config where squadra_id = v_sq), 100) into v_soglia;
  select coalesce(sum(punti), 0) into v_tot from punti_movimenti where atleta_id = auth.uid();
  select count(*) into v_gia from premi_atleta where atleta_id = auth.uid();
  if v_tot / v_soglia <= v_gia then raise exception 'Non hai ancora un premio da aprire'; end if;

  -- premi piccoli aperti dall'ultimo premio grande
  select max(ottenuto_il) into v_ultimo from premi_atleta where atleta_id = auth.uid() and grande;
  select count(*) into v_piccoli from premi_atleta
    where atleta_id = auth.uid() and not grande and (v_ultimo is null or ottenuto_il > v_ultimo);

  if v_piccoli >= 6 and random() < 0.4 then
    select nome into v_nome from (
      select nome, -ln(1 - random()) / peso as k
      from premi_catalogo where squadra_id = v_sq and attivo and peso > 0 and grande
      order by k limit 1
    ) x;
    v_grande := v_nome is not null;
  end if;
  if v_nome is null then
    select nome into v_nome from (
      select nome, -ln(1 - random()) / peso as k
      from premi_catalogo where squadra_id = v_sq and attivo and peso > 0 and not grande
      order by k limit 1
    ) x;
  end if;
  if v_nome is null then raise exception 'Il coach non ha ancora inserito premi'; end if;

  insert into premi_atleta (atleta_id, squadra_id, premio_nome, grande) values (auth.uid(), v_sq, v_nome, v_grande) returning * into r;
  return r;
end $$;
revoke all on function public.apri_premio() from public, anon;
grant execute on function public.apri_premio() to authenticated;
