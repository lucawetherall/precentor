-- Enable Row Level Security on every user table in the public schema.
-- Server code uses the service role / postgres owner (both bypass RLS).
-- Client code uses supabase-js only for auth.* calls, never table reads.
-- With RLS on and no policies, anon/authenticated are denied by default,
-- which closes rls_disabled_in_public and sensitive_columns_exposed.
-- Idempotent: enabling RLS on a table that already has it is a no-op.

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end$$;
