import { describe, expect, it } from 'vitest'
import { getSalePrice, hasPromoConditions, residualPromoDiscount } from './utils'

describe('residualPromoDiscount', () => {
  it('returns 0 when applied promotions already cover the promo discount', () => {
    expect(residualPromoDiscount(
      [{ discount_amount: 100 }, { discount_amount: 5 }],
      105,
    )).toBe(0)
  })

  it('returns the leftover amount when promo_discount exceeds applied promotions', () => {
    expect(residualPromoDiscount(
      [{ discount_amount: 90 }],
      105,
    )).toBe(15)
  })

  it('returns the whole promo_discount when there are no applied promotions', () => {
    expect(residualPromoDiscount([], 42.5)).toBe(42.5)
    expect(residualPromoDiscount(undefined as never, 42.5)).toBe(42.5)
  })

  it('ignores null/undefined discount_amount entries', () => {
    expect(residualPromoDiscount([{ discount_amount: null }, { discount_amount: undefined }], 7)).toBe(7)
  })

  it('clamps negative residuals to 0', () => {
    expect(residualPromoDiscount([{ discount_amount: 200 }], 105)).toBe(0)
  })

  it('rounds to cents (2 decimals)', () => {
    expect(residualPromoDiscount([{ discount_amount: 10.1 }], 10.15)).toBe(0.05)
    expect(residualPromoDiscount([{ discount_amount: 1.005 }], 1.01)).toBe(0.01)
  })
})

describe('getSalePrice', () => {
  it('applies a percentage discount', () => {
    expect(getSalePrice(350, 'percentage', 10)).toBe(315)
    expect(getSalePrice(100, 'percentage', 0)).toBe(100)
  })

  it('applies a fixed discount and clamps at 0', () => {
    expect(getSalePrice(350, 'fixed', 50)).toBe(300)
    expect(getSalePrice(20, 'fixed', 50)).toBe(0)
  })
})

describe('hasPromoConditions', () => {
  it('is true only when min_quantity or min_subtotal are positive', () => {
    expect(hasPromoConditions({ min_quantity: 3 })).toBe(true)
    expect(hasPromoConditions({ min_subtotal: 50 })).toBe(true)
    expect(hasPromoConditions({ min_quantity: 0, min_subtotal: 0 })).toBe(false)
    expect(hasPromoConditions({})).toBe(false)
    expect(hasPromoConditions({ min_quantity: null, min_subtotal: null })).toBe(false)
  })
})