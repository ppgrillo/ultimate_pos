alter table payments
  add column if not exists provider text;

-- index for provider-based analytics/filters
create index if not exists idx_payments_order_provider
  on payments (order_id, provider);
