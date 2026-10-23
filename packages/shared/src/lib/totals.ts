// Single source of truth for order money math.
//
// This function is called by the backend (orders.ts, checks.ts, self-checkout.ts)
// and by the frontend (OrderSummary, CheckoutPanel). Before this existed the same
// formula was written out in five places and they had already started to drift.
//
// Contract notes:
// - `subtotal` is the GROSS pre-promotion base (sum of original_price * qty).
// - `productSavings` is the per-line promotional reduction already reflected in
//   the catalog price. The net base is `subtotal - productSavings`.
// - `taxableSubtotal` lets the backend exclude tax-exempt lines. When omitted it
//   defaults to the net subtotal (frontend behaviour).
// - The tip is added AFTER discounts and is never discounted, never taxed, and
//   never part of `totalDiscount`.

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface OrderTotalsInput {
  subtotal: number
  productSavings?: number
  taxableSubtotal?: number
  taxRate: number
  taxEnabled: boolean
  taxInclusive: boolean
  discount?: number
  promoDiscount?: number
  rewardDiscount?: number
  tip?: number
  taxOverride?: number
}

export interface OrderTotals {
  actualSubtotal: number
  tax: number
  totalDiscount: number
  baseTotal: number
  tip: number
  total: number
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotals {
  const {
    subtotal,
    productSavings = 0,
    taxRate,
    taxEnabled,
    taxInclusive,
    discount = 0,
    promoDiscount = 0,
    rewardDiscount = 0,
    tip = 0,
    taxOverride,
  } = input

  const actualSubtotal = subtotal - productSavings
  const taxableSubtotal = input.taxableSubtotal ?? actualSubtotal

  const tax = !taxEnabled
    ? 0
    : taxOverride ?? (
        taxInclusive
          ? round2(taxableSubtotal - taxableSubtotal / (1 + taxRate))
          : round2(taxableSubtotal * taxRate)
      )

  const totalDiscount = discount + promoDiscount + rewardDiscount

  const baseTotal = taxInclusive
    ? round2(actualSubtotal - totalDiscount)
    : round2(actualSubtotal + tax - totalDiscount)

  const roundedTip = round2(tip)
  const total = round2(baseTotal + roundedTip)

  return { actualSubtotal, tax, totalDiscount, baseTotal, tip: roundedTip, total }
}

export interface ResolveTipOptions {
  tipEnabled: boolean
  tipAppliesTo?: 'all' | 'dine-in'
  orderType?: string | null
  tipMaxPercent?: number
  tipBase?: number
}

// Server-side authority over the tip. The client may send any number, so the
// tip is only honoured when the store enables it, when the order type matches
// the configured scope, and within the store's maximum percentage of the
// pre-tip bill. Anything else collapses to 0.
export function resolveTip(rawTip: unknown, opts: ResolveTipOptions): number {
  if (!opts.tipEnabled) return 0
  if (opts.tipAppliesTo === 'dine-in' && opts.orderType && opts.orderType !== 'dine-in') return 0

  const n = typeof rawTip === 'number' ? rawTip : Number(rawTip)
  if (!Number.isFinite(n) || n <= 0) return 0

  const pct = opts.tipMaxPercent == null ? 100 : Math.max(0, Number(opts.tipMaxPercent))
  const base = Math.max(0, opts.tipBase ?? 0)
  const maxTip = round2(base * pct / 100)

  return round2(Math.min(n, maxTip))
}
