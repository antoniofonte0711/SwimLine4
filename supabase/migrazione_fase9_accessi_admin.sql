-- ============================================
-- SwimLine4 — Migrazione fase 9
-- Registro degli accessi fatti dall'admin con "Accedi come". Si può rieseguire.
-- ============================================
create table if not exists accessi_admin (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id) on delete cascade,
  target_id uuid not null references profiles(id) on delete cascade,
  created_at timestamp with time zone default now()
);
alter table accessi_admin enable row level security;

-- Lo scrive solo la funzione (service_role); lo legge solo l'admin
drop policy if exists "admin legge gli accessi" on accessi_admin;
create policy "admin legge gli accessi" on accessi_admin for select using (public.is_admin());
