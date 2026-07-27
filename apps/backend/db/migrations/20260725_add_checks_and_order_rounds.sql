create table if not exists checks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  table_number integer not null,
  customer_id uuid null references customers(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed', 'void')),
  opened_by uuid not null references profiles(id),
  closed_by uuid null references profiles(id) on delete set null,
  notes text null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_checks_store_status_table
  on checks (store_id, status, table_number);

alter table orders
  add column if not exists check_id uuid references checks(id) on delete set null,
  add column if not exists round_number integer;

create index if not exists idx_orders_store_check_round
  on orders (store_id, check_id, round_number);
