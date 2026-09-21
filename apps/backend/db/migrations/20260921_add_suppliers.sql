create table if not exists public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id),
  name         text not null,
  contact_name text,
  phone        text,
  email        text,
  website      text,
  address      text,
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.suppliers enable row level security;

create policy "Store members can view suppliers"
  on public.suppliers for select
  using (store_id = any (my_store_ids()));

create policy "Admins can manage suppliers"
  on public.suppliers for all
  using (store_id = any (my_store_ids())
    and exists (
      select 1 from public.store_members
      where profile_id = auth.uid()
        and store_id = public.suppliers.store_id
        and role = 'admin'
    ))
  with check (store_id = any (my_store_ids())
    and exists (
      select 1 from public.store_members
      where profile_id = auth.uid()
        and store_id = public.suppliers.store_id
        and role = 'admin'
    ));

alter table public.expenses
  add column supplier_id uuid references public.suppliers(id) on delete set null,
  add column delivery_days integer check (delivery_days >= 0);

create index if not exists expenses_supplier_id_idx on public.expenses(supplier_id);