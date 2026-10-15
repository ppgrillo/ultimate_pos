alter table public.checks
  add column if not exists metadata jsonb not null default '{}'::jsonb;
