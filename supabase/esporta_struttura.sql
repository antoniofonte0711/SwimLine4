-- ============================================
-- SwimLine4 — Esporta la STRUTTURA del database (non i dati)
-- Si esegue nell'SQL Editor del progetto vero: legge soltanto, non modifica nulla.
-- Il risultato (una sola cella, colonna "struttura") va salvato in supabase/struttura_attuale.sql
-- ============================================
with
tabelle as (
  select c.oid, c.relname from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
),
funzioni as (
  select p.oid from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prokind in ('f', 'p')
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),
parti(ord, sub, testo) as (
  select 0, '', 'set check_function_bodies = off;'

  -- Estensioni (solo come promemoria)
  union all
  select 1, extname, '-- estensione presente: ' || extname || ' ' || extversion from pg_extension

  -- Sequenze
  union all
  select 2, c.relname, format('create sequence if not exists public.%I;', c.relname)
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'

  -- Tabelle con colonne, valori predefiniti e not null
  union all
  select 3, t.relname, format(E'create table if not exists public.%I (\n%s\n);', t.relname,
    string_agg(format('  %I %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
      coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), ''),
      case when a.attnotnull then ' not null' else '' end), E',\n' order by a.attnum))
  from tabelle t
  join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = t.oid and d.adnum = a.attnum
  group by t.relname

  -- Vincoli: chiavi primarie, unique, check, poi chiavi esterne
  union all
  select 4 + case co.contype when 'f' then 1 else 0 end,
    co.conrelid::regclass::text || co.conname,
    format('alter table %s add constraint %I %s;', co.conrelid::regclass, co.conname, pg_get_constraintdef(co.oid))
  from pg_constraint co
  where co.connamespace = 'public'::regnamespace and co.contype in ('p', 'u', 'c', 'f', 'x')

  -- Funzioni
  union all
  select 6, p.oid::regprocedure::text, pg_get_functiondef(p.oid) || ';'
  from pg_proc p join funzioni f on f.oid = p.oid

  -- Viste
  union all
  select 7, c.relname, format('create or replace view public.%I%s as %s;', c.relname,
    case when c.reloptions is not null then ' with (' || array_to_string(c.reloptions, ', ') || ')' else '' end,
    rtrim(pg_get_viewdef(c.oid), '; ' || E'\n'))
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'

  -- Indici che non sono già vincoli
  union all
  select 8, i.indexname, i.indexdef || ';'
  from pg_indexes i
  where i.schemaname = 'public'
    and not exists (select 1 from pg_constraint co where co.conname = i.indexname and co.connamespace = 'public'::regnamespace)

  -- Sicurezza a livello di riga
  union all
  select 9, c.relname, format('alter table public.%I enable row level security;', c.relname)
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relrowsecurity

  -- Regole di accesso (policy) di public e dello storage
  union all
  select 10, p.schemaname || p.tablename || p.policyname,
    format('drop policy if exists %I on %I.%I;', p.policyname, p.schemaname, p.tablename) || E'\n' ||
    format('create policy %I on %I.%I as %s for %s to %s%s%s;', p.policyname, p.schemaname, p.tablename,
      p.permissive, p.cmd, array_to_string(p.roles, ', '),
      coalesce(E'\n  using (' || p.qual || ')', ''),
      coalesce(E'\n  with check (' || p.with_check || ')', ''))
  from pg_policies p
  where p.schemaname = 'public' or (p.schemaname = 'storage' and p.tablename = 'objects')

  -- Trigger (anche quelli su auth.users che usano funzioni dell'app)
  union all
  select 11, tg.tgname, format('drop trigger if exists %I on %s;', tg.tgname, tg.tgrelid::regclass) || E'\n' ||
    pg_get_triggerdef(tg.oid) || ';'
  from pg_trigger tg join pg_proc p on p.oid = tg.tgfoid
  where not tg.tgisinternal and p.pronamespace = 'public'::regnamespace

  -- Permessi sulle funzioni (chi può chiamarle)
  union all
  select 12, p.oid::regprocedure::text,
    format('revoke all on function %s from public, anon, authenticated;', p.oid::regprocedure) ||
    coalesce((select string_agg(format(E'\ngrant execute on function %s to %s;', p.oid::regprocedure,
        case when x.grantee = 0 then 'public' else x.grantee::regrole::text end), '')
      from aclexplode(p.proacl) x
      where x.privilege_type = 'EXECUTE'
        and (x.grantee = 0 or x.grantee::regrole::text in ('anon', 'authenticated', 'service_role'))), '')
  from pg_proc p join funzioni f on f.oid = p.oid
  where p.proacl is not null

  -- Permessi su tabelle e viste
  union all
  select 13, c.relname,
    format('revoke all on public.%I from anon, authenticated;', c.relname) ||
    coalesce((select string_agg(format(E'\ngrant %s on public.%I to %s;', x.privilege_type, c.relname, x.grantee::regrole), '')
      from aclexplode(c.relacl) x
      where x.grantee <> 0 and x.grantee::regrole::text in ('anon', 'authenticated')), '')
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v') and c.relacl is not null

  -- Cartelle dello storage (bucket)
  union all
  select 14, b.id, format('insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (%L, %L, %s, %s, %L) on conflict (id) do nothing;',
    b.id, b.name, b.public::text, coalesce(b.file_size_limit::text, 'null'), b.allowed_mime_types)
  from storage.buckets b
)
select string_agg(testo, E'\n\n' order by ord, sub) as struttura from parti;
