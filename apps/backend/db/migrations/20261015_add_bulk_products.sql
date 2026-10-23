-- Bulk ("granel") products: sell by weight/volume (kg, liters, meters...)
-- instead of per piece. Quantity becomes fractional everywhere it is stored.

-- Fractional quantities for order lines (existing integer values convert losslessly).
alter table order_items alter column quantity type numeric(12,3);

-- Fractional stock so bulk inventory can be tracked in kg/l, not just pieces.
alter table products alter column stock_qty type numeric(12,3);

-- Selling mode. false (default) = per piece, exactly as today.
alter table products add column if not exists is_bulk boolean not null default false;

-- Unit label for bulk products: 'kg', 'g', 'lb', 'l', 'ml', 'm', 'unidad', or free text.
alter table products add column if not exists bulk_unit text;

-- Smallest increment accepted in the POS bulk entry modal (e.g. 0.1 kg).
-- null = UI falls back to 0.1.
alter table products add column if not exists bulk_step numeric(12,3);
