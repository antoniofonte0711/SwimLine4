-- 49: Riscaldamenti gara. Ogni atleta tiene il suo riscaldamento per ogni gara (es. "100 Stile libero")
-- o uno valido per tutte ("Tutte le gare"). Ogni salvataggio è una versione nuova: l'ultima è quella in uso,
-- le altre sono lo storico. "giorni" = i giorni di gara in cui l'atleta lo usa (lo trova nella schermata Oggi).

create table if not exists public.riscaldamenti (
  id uuid default gen_random_uuid() primary key,
  atleta_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  gara text not null check (length(trim(gara)) between 1 and 80),
  righe jsonb not null default '[]'::jsonb check (jsonb_typeof(righe) = 'array' and jsonb_array_length(righe) <= 60),
  note text check (length(note) <= 1000),
  giorni date[] not null default '{}',
  created_at timestamp with time zone not null default now()
);
create index if not exists riscaldamenti_atleta on public.riscaldamenti (atleta_id, gara, created_at desc);

alter table public.riscaldamenti enable row level security;

-- lo legge l'atleta, il suo coach (e l'admin, tramite sono_coach_di) e i genitori collegati
drop policy if exists "riscaldamenti lettura" on public.riscaldamenti;
create policy "riscaldamenti lettura" on public.riscaldamenti for select to authenticated
  using (atleta_id = (select auth.uid()) or sono_coach_di(atleta_id) or sono_genitore_di(atleta_id));

-- solo l'atleta scrive i suoi
drop policy if exists "riscaldamenti inserimento" on public.riscaldamenti;
create policy "riscaldamenti inserimento" on public.riscaldamenti for insert to authenticated
  with check (atleta_id = (select auth.uid()));

drop policy if exists "riscaldamenti modifica" on public.riscaldamenti;
create policy "riscaldamenti modifica" on public.riscaldamenti for update to authenticated
  using (atleta_id = (select auth.uid())) with check (atleta_id = (select auth.uid()));

drop policy if exists "riscaldamenti eliminazione" on public.riscaldamenti;
create policy "riscaldamenti eliminazione" on public.riscaldamenti for delete to authenticated
  using (atleta_id = (select auth.uid()));
