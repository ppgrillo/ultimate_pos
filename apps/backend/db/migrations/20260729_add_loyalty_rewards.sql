create type reward_type as enum (
  'free_product',
  'percentage_discount',
  'fixed_discount',
  'custom'
);

create table loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  description text,
  reward_type reward_type not null,
  points_required integer not null check (points_required > 0),

  -- For free_product
  product_id uuid null references products(id) on delete set null,

  -- For percentage_discount / fixed_discount
  discount_value numeric(10,2),
  discount_type text check (discount_type in ('percentage', 'fixed')),

  -- For custom
  metadata jsonb default '{}',

  is_active boolean not null default true,
  max_uses integer null,
  current_uses integer not null default 0,
  starts_at timestamptz null,
  ends_at timestamptz null,
  image_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_loyalty_rewards_store on loyalty_rewards(store_id, is_active);

create table reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  reward_id uuid not null references loyalty_rewards(id),
  loyalty_card_id uuid not null references loyalty_cards(id),
  customer_id uuid not null references customers(id),
  order_id uuid null references orders(id) on delete set null,
  points_spent integer not null,
  status text not null default 'completed' check (status in ('completed', 'reverted')),
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_reward_redemptions_card on reward_redemptions(loyalty_card_id);
create index idx_reward_redemptions_order on reward_redemptions(order_id);

-- RPC to decrement reward current_uses atomically
create or replace function decrement_reward_uses(p_reward_id uuid)
returns void
language plpgsql
as $$
begin
  update loyalty_rewards
  set current_uses = greatest(0, current_uses - 1)
  where id = p_reward_id;
end;
$$;
