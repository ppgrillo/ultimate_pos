import { describe, expect, it } from 'vitest'
import {
  isPromotionInDateWindow,
  isPromotionActive,
  calculatePromotionDiscount,
  computeCartPromotionDiscounts,
  getBestProductPromotion,
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
})
