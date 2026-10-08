-- ============================================
-- SwimLine4 — 15: crea il profilo quando qualcuno si registra
-- Dal 27 settembre 2026 l'app non inserisce più il profilo da sola: lo fa il database con
-- handle_new_user() (ruolo, coach in attesa, domanda alla squadra scelta). Il collegamento
-- su auth.users però mancava (controllo dell'8 ottobre 2026): chi si registrava restava senza profilo.
-- Si può rieseguire.
-- ============================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
