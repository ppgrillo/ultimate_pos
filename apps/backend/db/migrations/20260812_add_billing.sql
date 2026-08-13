create table if not exists billing (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_profile on billing(profile_id);
create index if not exists idx_billing_status on billing(status);

alter table billing enable row level security;

drop policy if exists "Users can read own billing" on billing;
create policy "Users can read own billing"
  on billing for select
  using (auth.uid() = profile_id);
