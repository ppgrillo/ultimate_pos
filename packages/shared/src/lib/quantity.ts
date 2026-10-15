// Quantity helpers for piece-based and bulk (weight/volume) products.
// Single source of truth shared by POS, self-checkout, orders and receipts so
// "1.5 kg" is rendered the same way everywhere.

// Renders a quantity with up to 3 decimals, stripping trailing zeros, and an
// optional unit label. Integers render plain: formatQuantity(3) === '3'.
export function formatQuantity(qty: number, unit?: string | null): string {
  const n = Number(qty)
  if (!Number.isFinite(n)) return String(qty)
  const rounded = Math.round(n * 1000) / 1000
  const text = String(rounded)
  const label = (unit ?? '').trim()
  return label ? `${text} ${label}` : text
}

// Snaps a typed quantity to the product's increment (e.g. 0.1 kg) and caps it
// at 3 decimals to match the DB numeric(12,3) column. Invalid/absent steps
// fall back to plain 3-decimal rounding.
export function snapToStep(value: number, step?: number | null, maxDecimals = 3): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const s = Number(step)
  const snapped = Number.isFinite(s) && s > 0 ? Math.round(n / s) * s : n
  const f = 10 ** maxDecimals
  return Math.round(snapped * f) / f
}
