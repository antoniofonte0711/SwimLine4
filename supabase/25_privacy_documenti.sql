-- ============================================
-- SwimLine4 — 25: chi chiude l'account si porta via anche i documenti — 11 ottobre 2026
-- Certificato medico e tesserini stanno nello spazio file "documenti-atleti", cartella = id dell'atleta.
-- Il database li dimentica da solo (cancellazione a cascata), lo spazio file no: l'app li toglie
-- prima di chiudere l'account, e per farlo l'atleta deve poter cancellare la propria cartella.
-- Si può rieseguire. Prima sull'anteprima, poi sul database vero.
-- ============================================

drop policy if exists "atleta elimina i propri documenti" on storage.objects;
create policy "atleta elimina i propri documenti" on storage.objects for DELETE to authenticated
  using (bucket_id = 'documenti-atleti' and (storage.foldername(name))[1] = (select auth.uid())::text);
