-- 52: una gara non può mai comparire due volte per lo stesso atleta (stesso giorno, distanza e stile).
-- Succedeva quando la stessa manifestazione FIN veniva cercata due volte, o quando una gara messa a mano
-- coincideva con quella dei comunicati.

-- 1) pulizia: di ogni doppione resta una sola gara (quella col tempo, altrimenti la più vecchia)
delete from public.gare g using (
  select id, row_number() over (partition by atleta_id, data_gara, distanza, stile order by (tempo is not null) desc, created_at, id) rn
  from public.gare
) d where g.id = d.id and d.rn > 1;

-- le iscrizioni FIN rimaste senza gara si ricollegano a quella che esiste già
update public.iscrizioni_fin i set gara_id = g.id
from public.gare g
where i.gara_id is null and i.stato = 'confermata'
  and g.atleta_id = i.atleta_id and g.data_gara = i.data and g.distanza = i.distanza and g.stile = i.stile;

-- 2) blocco: il database rifiuta il doppione
create unique index if not exists gare_senza_doppioni on public.gare (atleta_id, data_gara, distanza, stile);

-- 3) crea_gare_fin: se la gara c'è già (messa a mano o da un'altra manifestazione) non la rifà, la collega
create or replace function public.crea_gare_fin(p_manifestazione uuid, p_atleta uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_m record; v_i record; v_id uuid; v_n integer := 0;
begin
  select * into v_m from manifestazioni_fin where id = p_manifestazione;
  if v_m.id is null or not v_m.pubblicata then return 0; end if;
  for v_i in
    select * from iscrizioni_fin where manifestazione_id = p_manifestazione and stato = 'confermata' and gara_id is null
      and (p_atleta is null or atleta_id = p_atleta)
    order by atleta_id, data nulls last, orario nulls last
  loop
    select id into v_id from gare
      where atleta_id = v_i.atleta_id and data_gara = coalesce(v_i.data, current_date)
        and distanza = v_i.distanza and stile = v_i.stile
      limit 1;
    if v_id is null then
      insert into gare (atleta_id, nome_gara, distanza, stile, data_gara, orario, luogo, vasca, tempo_iscrizione, passaggi, ordine, note)
      values (v_i.atleta_id, v_m.nome, v_i.distanza, v_i.stile, coalesce(v_i.data, current_date), v_i.orario,
        v_m.citta || coalesce(' · ' || v_m.impianto, ''), v_m.vasca, v_i.tempo_iscrizione, '[]'::jsonb,
        (select count(*) from iscrizioni_fin x where x.manifestazione_id = p_manifestazione and x.atleta_id = v_i.atleta_id
          and x.gara_id is not null)::smallint,
        'FIN · ' || coalesce(v_i.societa, ''))
      returning id into v_id;
      v_n := v_n + 1;
    end if;
    update iscrizioni_fin set gara_id = v_id where id = v_i.id;
    v_id := null;
  end loop;
  return v_n;
end $$;
revoke all on function public.crea_gare_fin(uuid, uuid) from public, anon, authenticated;
