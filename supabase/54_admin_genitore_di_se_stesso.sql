-- ============================================
-- SwimLine4 — 54: l'admin può collegarsi come genitore a se stesso — 28 novembre 2026
-- Serve a provare la parte genitore con un solo account ("Vedi l'app come"): chiede da Genitore,
-- approva da Atleta. Per tutti gli altri resta vietato. Per togliere il collegamento: "Scollega".
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

create or replace function public.chiedi_figli(p_atleti uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare v_io record; v_atleta record; n integer := 0;
begin
  select id, nome, cognome, role, squadra_id into v_io from profiles where id = auth.uid();
  if v_io.id is null then raise exception 'Non autenticato'; end if;
  if v_io.role not in ('genitore', 'admin') then raise exception 'Solo i genitori possono collegarsi a un atleta'; end if;
  if v_io.squadra_id is not null and regola_squadra(v_io.squadra_id, 's_genitori') then
    raise exception 'In questa squadra i collegamenti dei genitori sono chiusi: chiedi al coach';
  end if;
  for v_atleta in select id, nome from profiles
    where id = any(p_atleti) and role in ('atleta', 'admin') and squadra_id is not null and squadra_id = v_io.squadra_id and (id <> v_io.id or v_io.role = 'admin')
  loop
    insert into genitori_figli (genitore_id, atleta_id) values (v_io.id, v_atleta.id)
    on conflict (genitore_id, atleta_id) do update set stato = 'in_attesa', created_at = now(), risposta_il = null
      where genitori_figli.stato = 'rifiutato';
    if found then
      n := n + 1;
      perform crea_notifica(v_atleta.id, 'richiesta_genitore', 'Un genitore vuole seguirti',
        trim(coalesce(v_io.nome, '') || ' ' || coalesce(v_io.cognome, '')) || ' chiede di vedere i tuoi progressi. Approva o rifiuta dal tuo Profilo.',
        '/profilo', 'richiesta:' || v_io.id);
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.chiedi_figli(uuid[]) from public, anon;
grant execute on function public.chiedi_figli(uuid[]) to authenticated;
