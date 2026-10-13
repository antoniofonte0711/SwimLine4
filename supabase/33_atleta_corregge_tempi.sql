-- 33 (13/10/2026): l'atleta può correggere i SUOI tempi già salvati (prima poteva solo aggiungere o eliminare).
-- Solo le proprie righe, e non può passarle a un altro atleta. I punti "risultati" restano uno per giorno
-- (punti_assegna ignora i doppioni per atleta + giorno), quindi correggere non dà punti in più.
drop policy if exists "atleta modifica i propri allenamenti" on public.allenamenti;
create policy "atleta modifica i propri allenamenti" on public.allenamenti for update
  using ((select auth.uid()) = atleta_id)
  with check ((select auth.uid()) = atleta_id);
