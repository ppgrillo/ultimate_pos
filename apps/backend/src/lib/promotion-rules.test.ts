import { describe, expect, it } from 'vitest'
import {
  isPromotionInDateWindow,
  isPromotionActive,
  calculatePromotionDiscount,
  computeCartPromotionDiscounts,
  computeConditionalProductPromotionDiscounts,
  getBestProductPromotion,
  hasPromotionalConditions,
  buildMatchingPromoLines,
  sumOriginalSubtotal,
  PROMOTION_FIELDS,
  PROMOTION_FIELDS_CSV,
} from './promotion-rules'

describe('promotion-rules', () => {
  it('marks expired promotion as inactive', () => {
    const now = new Date('2026-07-24T20:00:00.000Z')
    const promo = {
      is_active: true,
      starts_at: '2026-07-16T18:12:00.000Z',
      ends_at: '2026-07-20T18:12:00.000Z',
      max_uses: null,
      current_uses: 0,
    }

    expect(isPromotionInDateWindow(promo, now)).toBe(false)
    expect(isPromotionActive(promo, now)).toBe(false)
  })

  it('ignores invalid date values instead of failing open/closed incorrectly', () => {
    const now = new Date('2026-07-24T20:00:00.000Z')
    const promo = {
      is_active: true,
      starts_at: 'not-a-date',
      ends_at: 'also-not-a-date',
      max_uses: null,
      current_uses: 0,
    }

    expect(isPromotionInDateWindow(promo, now)).toBe(true)
    expect(isPromotionActive(promo, now)).toBe(true)
  })

  it('clamps percentage discounts between 0 and 100', () => {
    expect(calculatePromotionDiscount({ discount_type: 'percentage', discount_value: 10 }, 500)).toBe(50)
    expect(calculatePromotionDiscount({ discount_type: 'percentage', discount_value: 150 }, 500)).toBe(500)
    expect(calculatePromotionDiscount({ discount_type: 'percentage', discount_value: -10 }, 500)).toBe(0)
  })

  it('returns only eligible cart promotions', () => {
    const now = new Date('2026-07-24T20:00:00.000Z')
    const { appliedPromotions, totalDiscount } = computeCartPromotionDiscounts(
      [
        {
          id: 'p-active',
          name: '3 items = 10% off',
          target_type: 'cart',
          is_active: true,
          discount_type: 'percentage',
          discount_value: 10,
          min_quantity: 3,
          starts_at: '2026-07-20T18:12:00.000Z',
          ends_at: '2026-07-30T18:12:00.000Z',
        },
        {
          id: 'p-expired',
          name: 'Expired promo',
          target_type: 'cart',
          is_active: true,
          discount_type: 'percentage',
          discount_value: 50,
          starts_at: '2026-07-10T18:12:00.000Z',
          ends_at: '2026-07-20T18:12:00.000Z',
        },
      ],
      1000,
      3,
      now,
    )

    expect(appliedPromotions).toHaveLength(1)
    expect(appliedPromotions[0].promotion_id).toBe('p-active')
    expect(totalDiscount).toBe(100)
  })

  it('picks best product promotion by discount then priority', () => {
    const now = new Date('2026-07-24T20:00:00.000Z')
    const product = { id: 'prod-1', category_id: 'cat-1', price: 100 }

    const best = getBestProductPromotion(
      product,
      [
        {
          id: 'promo-a',
          name: '10% category',
          target_type: 'category',
          target_ids: ['cat-1'],
          is_active: true,
          discount_type: 'percentage',
          discount_value: 10,
          priority: 1,
        },
        {
          id: 'promo-b',
          name: '$10 product high priority',
          target_type: 'product',
          target_ids: ['prod-1'],
          is_active: true,
          discount_type: 'fixed',
          discount_value: 10,
          priority: 9,
        },
      ],
      now,
    )

    expect(best?.id).toBe('promo-b')
  })

  it('ignores product/category promos with conditions when picking the per-item best promo', () => {
    const now = new Date('2026-07-24T20:00:00.000Z')
    const product = { id: 'prod-1', category_id: 'cat-1', price: 100 }

    const best = getBestProductPromotion(
      product,
      [
        {
          id: 'promo-conditional',
          name: '3 products = 10% off',
          target_type: 'product',
          target_ids: ['prod-1'],
          is_active: true,
          discount_type: 'percentage',
          discount_value: 10,
          min_quantity: 3,
        },
        {
          id: 'promo-unconditional',
          name: '5% off',
          target_type: 'product',
          target_ids: ['prod-1'],
          is_active: true,
          discount_type: 'percentage',
          discount_value: 5,
        },
      ],
      now,
    )

    expect(best?.id).toBe('promo-unconditional')
  })

  it('marks promotions with min_quantity / min_subtotal as conditional', () => {
    expect(hasPromotionalConditions({ min_quantity: 3 })).toBe(true)
    expect(hasPromotionalConditions({ min_subtotal: 50 })).toBe(true)
    expect(hasPromotionalConditions({ min_quantity: 0, min_subtotal: 0 })).toBe(false)
    expect(hasPromotionalConditions({})).toBe(false)
  })

  it('applies a product promo with min_quantity only when enough matching items are in the cart', () => {
    const now = new Date('2026-07-24T20:00:00.000Z')
    const promo = {
      id: 'ttt',
      name: '3 products = 10% off',
      target_type: 'product',
      target_ids: ['prod-1', 'prod-2'],
      is_active: true,
      discount_type: 'percentage',
      discount_value: 10,
      min_quantity: 3,
      starts_at: '2026-07-20T18:12:00.000Z',
      ends_at: '2026-07-30T18:12:00.000Z',
    }

    const lines = [
      { product_id: 'prod-1', category_id: null, quantity: 2, price: 100 },
      { product_id: 'prod-2', category_id: null, quantity: 1, price: 200 },
    ]

    expect(computeConditionalProductPromotionDiscounts([promo], lines, now)).toEqual({
      appliedPromotions: [
        {
          promotion_id: 'ttt',
          name: '3 products = 10% off',
          discount_amount: 40,
          badge_text: null,
          discount_type: 'percentage',
          discount_value: 10,
        },
      ],
      totalDiscount: 40,
    })

    // Only 2 matching items in cart → not eligible
    const below = [
      { product_id: 'prod-1', category_id: null, quantity: 2, price: 100 },
    ]
    expect(computeConditionalProductPromotionDiscounts([promo], below, now)).toEqual({
      appliedPromotions: [],
      totalDiscount: 0,
    })

    // Non-matching products never count towards the quantity
    const mixed = [
      { product_id: 'prod-1', category_id: null, quantity: 2, price: 100 },
      { product_id: 'other', category_id: null, quantity: 1, price: 999 },
    ]
    expect(computeConditionalProductPromotionDiscounts([promo], mixed, now)).toEqual({
      appliedPromotions: [],
      totalDiscount: 0,
    })
  })

  it('applies a category promo with min_subtotal against matching items subtotal', () => {
    const now = new Date('2026-07-24T20:00:00.000Z')
    const promo = {
      id: 'cat-promo',
      name: 'Category spend threshold',
      target_type: 'category',
      target_ids: ['cat-1'],
      is_active: true,
      discount_type: 'percentage',
      discount_value: 10,
      min_subtotal: 300,
      starts_at: '2026-07-20T18:12:00.000Z',
      ends_at: '2026-07-30T18:12:00.000Z',
    }

    const lines = [
      { product_id: 'prod-1', category_id: 'cat-1', quantity: 3, price: 100 },
      { product_id: 'prod-2', category_id: 'cat-2', quantity: 5, price: 100 },
    ]

    expect(computeConditionalProductPromotionDiscounts([promo], lines, now)).toEqual({
      appliedPromotions: [
        {
          promotion_id: 'cat-promo',
          name: 'Category spend threshold',
          discount_amount: 30,
          badge_text: null,
          discount_type: 'percentage',
          discount_value: 10,
        },
      ],
      totalDiscount: 30,
    })
  })

  it('keeps the literal SELECT aligned with the PROMOTION_FIELDS list', () => {
    const csvFields = PROMOTION_FIELDS_CSV.split(',').map((f) => f.trim())
    expect(csvFields).toEqual([...PROMOTION_FIELDS])
  })

  it('keeps min_quantity and min_subtotal in the shared promo field list used by order saves', () => {
    // Regression guard: orders.ts / self-checkout.ts read promotions with
    // PROMOTION_FIELDS_CSV. If these two columns ever drop out of the SELECT,
    // getBestProductPromotion stops seeing conditional promos as conditional,
    // bakes the discount into the unit price AND re-applies it as a cart promo
    // -> the order is double discounted.
    expect(PROMOTION_FIELDS).toContain('min_quantity')
    expect(PROMOTION_FIELDS).toContain('min_subtotal')
    expect(PROMOTION_FIELDS_CSV).toContain('min_quantity')
    expect(PROMOTION_FIELDS_CSV).toContain('min_subtotal')
  })

  it('skips conditional product promos when picking the per-item best promo even without an unconditional alternative', () => {
    const now = new Date('2026-07-24T20:00:00.000Z')
    const product = { id: 'prod-1', category_id: 'cat-1', price: 350 }

    const best = getBestProductPromotion(
      product,
      [
        {
          id: 'promo-conditional',
          name: '3 products = 10% off',
          target_type: 'product',
          target_ids: ['prod-1'],
          is_active: true,
          discount_type: 'percentage',
          discount_value: 10,
          min_quantity: 3,
        },
      ],
      now,
    )

    expect(best).toBeNull()
  })

  it('does not double-discount a conditional product promo at order save', () => {
    const now = new Date('2026-07-24T20:00:00.000Z')
    const product = { id: 'prod-1', category_id: 'cat-1', price: 350 }

    // Simulates a conditional promo row exactly as the backend queries it:
    // only the columns in PROMOTION_FIELDS are present after a Supabase select.
    const promoRow = {
      id: 'p-cond',
      name: '3 products = 10% off',
      badge_text: '10% off',
      target_type: 'product',
      target_ids: ['prod-1'],
      discount_type: 'percentage',
      discount_value: 10,
      min_quantity: 3,
      min_subtotal: 0,
      current_uses: 0,
      max_uses: null,
      priority: 0,
      starts_at: '2026-07-20T18:12:00.000Z',
      ends_at: '2026-07-30T18:12:00.000Z',
      is_active: true,
    }

    // Step 1 — order route pricing: conditional promos must NOT bake the unit price.
    const best = getBestProductPromotion(product, [promoRow], now)
    expect(best).toBeNull()
    const expectedPromotionalPrice = best ? product.price - calculatePromotionDiscount(best, product.price) : product.price
    const unitPrice = Math.min(350, expectedPromotionalPrice)
    expect(unitPrice).toBe(350)

    // Step 2 — the SAME conditional promo is applied once, against the full price.
    const matchingItems = [{ product_id: 'prod-1', category_id: 'cat-1', quantity: 3, price: unitPrice }]
    const { appliedPromotions, totalDiscount } = computeConditionalProductPromotionDiscounts([promoRow], matchingItems, now)

    expect(appliedPromotions).toHaveLength(1)
    expect(appliedPromotions[0].promotion_id).toBe('p-cond')
    expect(totalDiscount).toBe(105)

    // Reported bug scenario: if the price had been baked, the promo would fire
    // on the discounted base and a second discount would leak into the total.
    expect(unitPrice * 3 - totalDiscount).toBe(945)
  })

  it('treats rows shaped like the real promotion SELECT the same as hand-written promo rows', () => {
    const promo = {
      id: 'p',
      name: '3 prod',
      badge_text: null,
      target_type: 'product' as const,
      target_ids: ['x'],
      discount_type: 'percentage' as const,
      discount_value: 10,
      min_quantity: 2,
      min_subtotal: null,
      current_uses: 0,
      max_uses: null,
      priority: 0,
      starts_at: null,
      ends_at: null,
      is_active: true,
    }
    const row = Object.fromEntries(PROMOTION_FIELDS.map((f) => [f, (promo as Record<string, unknown>)[f]]))

    expect(hasPromotionalConditions(row)).toBe(true)
  })

  it('evaluates conditional promos on the FULL catalog price, not the baked unit price', () => {
    // Product priced $350 baked to $315 by an unrelated unconditional promo.
    // The conditional 10% must still be computed on $350 (what the client
    // validates with, via original_price) — otherwise the saved order would
    // under-discount vs. what was shown at the register.
    const productMap = new Map([['prod-1', { id: 'prod-1', category_id: 'cat-1', price: 350 }]])
    const orderItems = [
      { product_id: 'prod-1', quantity: 3, unit_price: 315 },
    ]

    const lines = buildMatchingPromoLines(orderItems, productMap)
    expect(lines[0].price).toBe(350)

    const promoRow = {
      id: 'p-cond',
      name: '3 products = 10% off',
      badge_text: null,
      target_type: 'product' as const,
      target_ids: ['prod-1'],
      discount_type: 'percentage' as const,
      discount_value: 10,
      min_quantity: 3,
      min_subtotal: 0,
      current_uses: 0,
      max_uses: null,
      priority: 0,
      starts_at: '2026-07-20T18:12:00.000Z',
      ends_at: '2026-07-30T18:12:00.000Z',
      is_active: true,
    }

    const { totalDiscount } = computeConditionalProductPromotionDiscounts([promoRow], lines, new Date('2026-07-24T20:00:00.000Z'))
    expect(totalDiscount).toBe(105)
  })

  it('buildMatchingPromoLines falls back to unit_price for custom items', () => {
    const productMap = new Map([[ 'prod-1', { id: 'prod-1', category_id: 'cat-1', price: 350 } ]])
    const lines = buildMatchingPromoLines(
      [
        { product_id: 'prod-1', quantity: 2, unit_price: 315 },
        { product_id: null, quantity: 1, unit_price: 25 },
      ],
      productMap,
    )

    expect(lines).toEqual([
      { product_id: 'prod-1', category_id: 'cat-1', quantity: 2, price: 350 },
      { product_id: null, category_id: null, quantity: 1, price: 25 },
    ])
  })

  it('sumOriginalSubtotal uses catalog prices for products and unit prices for custom items', () => {
    const productMap = new Map([[ 'prod-1', { id: 'prod-1', price: 350 } ]])
    const subtotal = sumOriginalSubtotal(
      [
        { product_id: 'prod-1', quantity: 3, unit_price: 315 },
        { product_id: null, quantity: 2, unit_price: 25 },
      ],
      productMap,
    )

    expect(subtotal).toBe(1050 + 50)
  })

  it('keeps cart-promo and conditional-promo gating on the full-price subtotal (same base as the client)', () => {
    const productMap = new Map([[ 'prod-1', { id: 'prod-1', category_id: 'cat-1', price: 350 } ]])
    const orderItems = [
      { product_id: 'prod-1', quantity: 3, unit_price: 315 }, // baked by unconditional 10%
      { product_id: null, quantity: 1, unit_price: 50 },
    ]
    const fullSubtotal = sumOriginalSubtotal(orderItems, productMap) // 1050 + 50

    const cartPromo = {
      id: 'cart-1',
      name: '$100 off orders over $1000',
      badge_text: null,
      target_type: 'cart' as const,
      discount_type: 'fixed' as const,
      discount_value: 100,
      min_quantity: 0,
      min_subtotal: 1000,
      current_uses: 0,
      max_uses: null,
      priority: 0,
      starts_at: '2026-07-20T18:12:00.000Z',
      ends_at: '2026-07-30T18:12:00.000Z',
      is_active: true,
    }

    const now = new Date('2026-07-24T20:00:00.000Z')
    // Threshold reached on the full subtotal (1100) even though the baked
    // subtotal (945 + 50 = 995) is below it — matches what the register shows.
    const { appliedPromotions } = computeCartPromotionDiscounts([cartPromo], fullSubtotal, 4, now)
    expect(appliedPromotions.map((p) => p.promotion_id)).toEqual(['cart-1'])
  })
})
