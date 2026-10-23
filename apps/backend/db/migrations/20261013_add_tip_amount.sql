-- Tips (Release 1): the tip is captured at checkout / account close, added on
-- top of the order total, and is never taxed nor discounted.
alter table public.orders
  add column if not exists tip_amount numeric(12,2) not null default 0;

-- Per-check tip, attributed to the member who closes the account (closed_by).
alter table public.checks
  add column if not exists tip_amount numeric(12,2) not null default 0;

-- Per-payment tip so a single transaction can carry an optional gratuity.
alter table public.payments
  add column if not exists tip_amount numeric(12,2) not null default 0;
