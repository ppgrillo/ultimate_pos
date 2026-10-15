import { describe, expect, it, vi } from 'vitest'
import type { StoreSettings } from '@ultimate-pos/shared'

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}))

vi.mock('../lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}))

import { calculateEarnPoints } from './loyalty.service'

function productsQuery(data: unknown[]) {
  const query: any = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve),
  }
  return query
}

function mockProducts(data: unknown[]) {
  fromMock.mockImplementation((table: string) => {
    if (table !== 'products') throw new Error(`Unexpected table ${table}`)
    return productsQuery(data)
  })
}

function makeSettings(overrides: Partial<StoreSettings> = {}): StoreSettings {
  return {
    hasVariants: false,
    hasLoyalty: true,
    pointsPerCurrency: 10,
    ...overrides,
  } as StoreSettings
}

const PIEZA_PTS = { id: 'pieza-pts', points: 5, is_bulk: false }
const PIEZA_MONEY = { id: 'pieza-money', points: null, is_bulk: false }
const BULK_PTS = { id: 'bulk-pts', points: 10, is_bulk: true }
const BULK_MONEY = { id: 'bulk-money', points: null, is_bulk: true }

describe('calculateEarnPoints', () => {
  it('returns 0 when loyalty is disabled', async () => {
    mockProducts([])
    const points = await calculateEarnPoints(
      [{ product_id: PIEZA_PTS.id, quantity: 2, price: 100 }],
      200,
      0,
      makeSettings({ hasLoyalty: false }),
    )
    expect(points).toBe(0)
  })

  it('keeps the per-piece fixed formula: points * integer qty (regression)', async () => {
    mockProducts([PIEZA_PTS])
    const points = await calculateEarnPoints(
      [{ product_id: PIEZA_PTS.id, quantity: 3, price: 100 }],
      300,
      0,
      makeSettings(),
    )
    expect(points).toBe(15)
  })

  it('keeps the per-piece money formula: floor(price * rate) * qty (regression)', async () => {
    mockProducts([PIEZA_MONEY])
    const points = await calculateEarnPoints(
      [{ product_id: PIEZA_MONEY.id, quantity: 2, price: 25 }],
      50,
      0,
      makeSettings(),
    )
    expect(points).toBe(500)
  })

  it('bulk fixed mode earns points per unit of measure (points * weight)', async () => {
    mockProducts([BULK_PTS])
    const points = await calculateEarnPoints(
      [{ product_id: BULK_PTS.id, quantity: 1.5, price: 80 }],
      120,
      0,
      makeSettings(),
    )
    expect(points).toBe(15)
  })

  it('bulk money mode uses the line total, not per-unit floor x qty', async () => {
    mockProducts([BULK_MONEY])
    const points = await calculateEarnPoints(
      [{ product_id: BULK_MONEY.id, quantity: 0.25, price: 12.99 }],
      3.25,
      0,
      makeSettings(),
    )
    // floor(12.99 * 0.25 * 10) = floor(32.475) = 32
    expect(points).toBe(32)
  })

  it('always returns integer points even without a discount', async () => {
    mockProducts([BULK_MONEY])
    const points = await calculateEarnPoints(
      [{ product_id: BULK_MONEY.id, quantity: 0.3, price: 10.5 }],
      3.15,
      0,
      makeSettings({ pointsPerCurrency: 1 }),
    )
    // floor(10.5 * 0.3 * 1) = floor(3.15) = 3
    expect(points).toBe(3)
    expect(Number.isInteger(points)).toBe(true)
  })

  it('scales bulk points proportionally to the discount', async () => {
    mockProducts([BULK_PTS])
    const points = await calculateEarnPoints(
      [{ product_id: BULK_PTS.id, quantity: 1.5, price: 80 }],
      100,
      40,
      makeSettings(),
    )
    // 15 pts * (100-40)/100 = 9
    expect(points).toBe(9)
  })

  it('floors fractional quantities for piece products too', async () => {
    mockProducts([PIEZA_MONEY])
    const points = await calculateEarnPoints(
      [{ product_id: PIEZA_MONEY.id, quantity: 1.5, price: 10 }],
      15,
      0,
      makeSettings(),
    )
    // floor(floor(10 * 10) * 1.5) = 150
    expect(points).toBe(150)
    expect(Number.isInteger(points)).toBe(true)
  })

  it('earns custom-item points floored per line', async () => {
    mockProducts([])
    const points = await calculateEarnPoints(
      [{ product_id: '', quantity: 3, price: 0, points: 2 }],
      50,
      0,
      makeSettings(),
    )
    expect(points).toBe(6)
  })

  it('sums piece and bulk lines in one order', async () => {
    mockProducts([PIEZA_PTS, BULK_PTS])
    const points = await calculateEarnPoints(
      [
        { product_id: PIEZA_PTS.id, quantity: 2, price: 100 },
        { product_id: BULK_PTS.id, quantity: 0.5, price: 100 },
      ],
      250,
      0,
      makeSettings(),
    )
    // 2*5 + floor(10*0.5) = 10 + 5
    expect(points).toBe(15)
  })

  it('skips non-positive quantities', async () => {
    mockProducts([BULK_PTS])
    const points = await calculateEarnPoints(
      [{ product_id: BULK_PTS.id, quantity: 0, price: 100 }],
      0,
      0,
      makeSettings(),
    )
    expect(points).toBe(0)
  })
})
