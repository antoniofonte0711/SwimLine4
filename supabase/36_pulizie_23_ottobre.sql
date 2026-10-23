-- Migrazione 36 (23/10/2026): pulizie dopo il controllo prima dell'ingresso dei ragazzi.
-- Già applicata in produzione.

-- toglie la copia dei dati di prova dell'11/10 (tenuta "per qualche giorno")
drop schema if exists ripristino_20261011 cascade;

-- la funzione del trigger delle assenze non deve essere richiamabile da fuori
revoke all on function public.trg_notifica_assenza() from public, anon, authenticated;
