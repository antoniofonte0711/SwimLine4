-- 51: Gare FIN, il coach conferma la presenza di ogni atleta (null = non ancora confermata).
-- La scrive il coach con la policy "iscrizioni fin coach" già esistente (migrazione 50).
alter table public.iscrizioni_fin add column if not exists presente boolean;
