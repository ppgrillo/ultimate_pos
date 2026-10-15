import { describe, it, expect } from 'vitest'
import { computeOrderTotals, resolveTip, round2 } from './totals'

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(1.234)).toBe(1.23)
    expect(round2(1.239)).toBe(1.24)
    expect(round2(10)).toBe(10)
  })

  it('mirrors Math.round(n * 100) / 100 including float quirks', () => {
    // Documents that round2 is intentionally identical to the inline formula it
    // replaces; it is not a "smart" decimal rounding helper.
    expect(round2(1.005)).toBe(Math.round(1.005 * 100) / 100)
  })
})

describe('computeOrderTotals', () => {
  it('returns the net subtotal as total when there is no tax or discount', () => {
    const t = computeOrderTotals({
      subtotal: 100,
      taxRate: 0.08,
      taxEnabled: false,
      taxInclusive: false,
    })
    expect(t.actualSubtotal).toBe(100)
    expect(t.tax).toBe(0)
    expect(t.totalDiscount).toBe(0)
    expect(t.baseTotal).toBe(100)
    expect(t.tip).toBe(0)
    expect(t.total).toBe(100)
  })

  it('adds tax on top when exclusive', () => {
    const t = computeOrderTotals({
      subtotal: 100,
      taxRate: 0.08,
      taxEnabled: true,
      taxInclusive: false,
    })
    expect(t.tax).toBe(8)
    expect(t.total).toBe(108)
  })

  it('extracts tax from the subtotal when inclusive', () => {
    const t = computeOrderTotals({
      subtotal: 108,
      taxRate: 0.08,
      taxEnabled: true,
      taxInclusive: true,
    })
    expect(t.tax).toBe(8)
    expect(t.total).toBe(108)
  })

  it('treats a zero tax rate as no tax even when enabled', () => {
    const t = computeOrderTotals({
      subtotal: 100,
      taxRate: 0,
      taxEnabled: true,
      taxInclusive: false,
    })
    expect(t.tax).toBe(0)
    expect(t.total).toBe(100)
  })

  it('applies product savings before tax', () => {
    const t = computeOrderTotals({
      subtotal: 100,
      productSavings: 10,
      taxRate: 0.08,
      taxEnabled: true,
      taxInclusive: false,
    })
    expect(t.actualSubtotal).toBe(90)
    expect(t.tax).toBe(7.2)
    expect(t.total).toBe(97.2)
  })

  it('subtracts all discount kinds from the total', () => {
    const t = computeOrderTotals({
      subtotal: 100,
      taxRate: 0.08,
      taxEnabled: true,
      taxInclusive: false,
      discount: 5,
      promoDiscount: 10,
      rewardDiscount: 3,
    })
    expect(t.totalDiscount).toBe(18)
    expect(t.total).toBe(90)
  })

  it('subtracts discounts from the inclusive subtotal without re-adding tax', () => {
    const t = computeOrderTotals({
      subtotal: 108,
      taxRate: 0.08,
      taxEnabled: true,
      taxInclusive: true,
      discount: 10,
    })
    expect(t.tax).toBe(8)
    expect(t.baseTotal).toBe(98)
    expect(t.total).toBe(98)
  })

  it('honours a tax override', () => {
    const t = computeOrderTotals({
      subtotal: 100,
      taxRate: 0.08,
      taxEnabled: true,
      taxInclusive: false,
      taxOverride: 1.23,
    })
    expect(t.tax).toBe(1.23)
    expect(t.total).toBe(101.23)
  })

  it('uses an explicit taxable subtotal when provided (tax-exempt lines)', () => {
    const t = computeOrderTotals({
      subtotal: 100,
      taxableSubtotal: 60,
      taxRate: 0.1,
      taxEnabled: true,
      taxInclusive: false,
    })
    expect(t.tax).toBe(6)
    expect(t.total).toBe(106)
  })

  it('adds the tip after discounts and never taxes or discounts it', () => {
    const t = computeOrderTotals({
      subtotal: 100,
      taxRate: 0.08,
      taxEnabled: true,
      taxInclusive: false,
      discount: 10,
      tip: 10,
    })
    expect(t.tax).toBe(8)
    expect(t.baseTotal).toBe(98)
    expect(t.tip).toBe(10)
    expect(t.total).toBe(108)
  })

  it('rounds financial values to two decimals', () => {
    const t = computeOrderTotals({
      subtotal: 33.33,
      taxRate: 0.0825,
      taxEnabled: true,
      taxInclusive: false,
    })
    expect(t.tax).toBe(2.75)
    expect(t.total).toBe(36.08)
  })
})

describe('resolveTip', () => {
  const base = { tipEnabled: true, tipBase: 100 }

  it('returns 0 when tips are disabled', () => {
    expect(resolveTip(10, { ...base, tipEnabled: false })).toBe(0)
  })

  it('accepts a valid tip within the default 100% cap', () => {
    expect(resolveTip(10, base)).toBe(10)
    expect(resolveTip(100, base)).toBe(100)
  })

  it('clamps the tip to the maximum percentage of the bill', () => {
    expect(resolveTip(80, { ...base, tipMaxPercent: 20 })).toBe(20)
    expect(resolveTip(15, { ...base, tipMaxPercent: 20 })).toBe(15)
  })

  it('collapses non-finite, negative and zero tips to 0', () => {
    expect(resolveTip(0, base)).toBe(0)
    expect(resolveTip(-5, base)).toBe(0)
    expect(resolveTip(Number.NaN, base)).toBe(0)
    expect(resolveTip('abc', base)).toBe(0)
    expect(resolveTip(undefined, base)).toBe(0)
    expect(resolveTip(null, base)).toBe(0)
  })

  it('coerces numeric strings', () => {
    expect(resolveTip('12.5', base)).toBe(12.5)
  })

  it('blocks tips for non-dine-in orders when scoped to dine-in', () => {
    expect(resolveTip(10, { ...base, tipAppliesTo: 'dine-in', orderType: 'takeaway' })).toBe(0)
    expect(resolveTip(10, { ...base, tipAppliesTo: 'dine-in', orderType: 'dine-in' })).toBe(10)
  })

  it('allows every order type when scope is all', () => {
    expect(resolveTip(10, { ...base, tipAppliesTo: 'all', orderType: 'takeaway' })).toBe(10)
  })

  it('caps to 0 when the pre-tip bill is 0 (fully discounted)', () => {
    expect(resolveTip(10, { tipEnabled: true, tipBase: 0 })).toBe(0)
  })

  it('defaults the cap to 100% when tipMaxPercent is omitted', () => {
    expect(resolveTip(500, { tipEnabled: true, tipBase: 100 })).toBe(100)
  })
})
