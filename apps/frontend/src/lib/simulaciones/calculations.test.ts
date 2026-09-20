import { describe, it, expect } from 'vitest'
import type { Product } from '@ultimate-pos/shared'
import {
  RECOMMENDED_FEE_MULTIPLE,
  buildBreakEven,
  buildCapacity,
  buildCatalog,
  buildScenario,
  clampPercent,
  estimateCost,
  niceMaxUnits,
  unitsToCoverAmount,
} from './calculations'

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    store_id: 'store1',
    name: 'Product',
    description: null,
    price: 100,
    cost: 60,
    sku: null,
    barcode: null,
    category_id: null,
    image_url: null,
    modifiers: [],
    points: null,
    stock_qty: null,
    track_inventory: false,
    low_stock_threshold: null,
    is_active: true,
    tax_exempt: false,
    pinned: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('estimateCost', () => {
  it('estimates cost from margin % of the sale price', () => {
    expect(estimateCost(100, 40)).toBe(60)
  })

  it('clamps margin out of range', () => {
    expect(estimateCost(100, 0)).toBe(100)
    expect(estimateCost(100, 100)).toBe(0)
  })

  it('clamps NaN to 0', () => {
    expect(clampPercent(Number.NaN)).toBe(0)
  })
})

describe('unitsToCoverAmount', () => {
  it('ceils to whole units', () => {
    expect(unitsToCoverAmount(1001, 100)).toBe(11)
  })

  it('returns null when contribution is not positive', () => {
    expect(unitsToCoverAmount(1000, 0)).toBeNull()
    expect(unitsToCoverAmount(1000, -5)).toBeNull()
  })
})

describe('buildCatalog', () => {
  it('aggregates real costs and prices', () => {
    const catalog = buildCatalog([
      product({ id: 'a', price: 100, cost: 60 }),
      product({ id: 'b', price: 200, cost: 100 }),
    ])
    expect(catalog.count).toBe(2)
    expect(catalog.avgPrice).toBe(150)
    expect(catalog.avgCost).toBe(80)
    expect(catalog.avgContribution).toBe(70)
    expect(catalog.estimatedCount).toBe(0)
    expect(catalog.excludedCount).toBe(0)
  })

  it('estimates missing costs using the margin and tracks them', () => {
    const catalog = buildCatalog([product({ id: 'a', price: 100, cost: null })], 40)
    expect(catalog.items[0].cost).toBe(60)
    expect(catalog.items[0].hasRealCost).toBe(false)
    expect(catalog.estimatedCount).toBe(1)
  })

  it('excludes products without a positive price', () => {
    const catalog = buildCatalog([
      product({ id: 'a', price: 0 }),
      product({ id: 'b', price: -5 }),
    ])
    expect(catalog.count).toBe(0)
    expect(catalog.excludedCount).toBe(2)
  })

  it('sums tracked stock only', () => {
    const catalog = buildCatalog([
      product({ id: 'a', track_inventory: true, stock_qty: 10 }),
      product({ id: 'b', track_inventory: false, stock_qty: 99 }),
    ])
    expect(catalog.totalStock).toBe(10)
  })

  it('returns null total stock when nothing is tracked', () => {
    const catalog = buildCatalog([product({ id: 'a' })])
    expect(catalog.totalStock).toBeNull()
  })

  it('reports the average margin of products with a recorded cost', () => {
    const catalog = buildCatalog([
      product({ id: 'a', price: 100, cost: 60 }),
      product({ id: 'b', price: 200, cost: 100 }),
    ])
    expect(catalog.realCostCount).toBe(2)
    expect(catalog.realAvgMarginPercent).toBe(45)
  })

  it('tracks products without a recorded cost separately', () => {
    const catalog = buildCatalog([product({ id: 'a', price: 100, cost: 60 }), product({ id: 'b', price: 100, cost: null })], 60)
    expect(catalog.realCostCount).toBe(1)
    expect(catalog.estimatedCount).toBe(1)
    expect(catalog.realAvgMarginPercent).toBe(40)
  })

  it('returns a null average when no product has a recorded cost', () => {
    const catalog = buildCatalog([product({ id: 'a', price: 100, cost: null })], 50)
    expect(catalog.realAvgMarginPercent).toBeNull()
    expect(catalog.realCostCount).toBe(0)
  })

  it('lets a per-product margin override the global estimate', () => {
    const catalog = buildCatalog([product({ id: 'a', price: 100, cost: null })], 40, { a: 60 })
    expect(catalog.items[0].cost).toBe(40)
    expect(catalog.items[0].margin).toBeCloseTo(0.6)
  })
})

describe('niceMaxUnits', () => {
  it('rounds the biggest target up to a clean step with headroom', () => {
    expect(niceMaxUnits(62, 160)).toBe(200)
    expect(niceMaxUnits(500, 1500)).toBe(2000)
  })

  it('falls back when there is no target', () => {
    expect(niceMaxUnits(null, null)).toBe(100)
  })
})

describe('buildScenario', () => {
  const catalog = buildCatalog([
    product({ id: 'a', price: 100, cost: 60 }),
    product({ id: 'b', price: 200, cost: 100 }),
  ])

  it('computes a full P&L for a volume', () => {
    const result = buildScenario(catalog, { units: 2500, eventCost: 10000, extraExpenses: 0 })
    expect(result.revenue).toBe(2500 * 150)
    expect(result.cogs).toBe(2500 * 80)
    expect(result.grossProfit).toBe(2500 * 70)
    expect(result.totalCosts).toBe(10000)
    expect(result.net).toBe(2500 * 70 - 10000)
    expect(result.profitable).toBe(true)
    expect(result.feeMultiple).toBe(17.5)
  })

  it('flags a loss-making scenario', () => {
    const result = buildScenario(catalog, { units: 100, eventCost: 10000, extraExpenses: 0 })
    expect(result.profitable).toBe(false)
    expect(result.net).toBeLessThan(0)
  })

  it('computes global break-even on total costs', () => {
    const result = buildScenario(catalog, { units: 0, eventCost: 7000, extraExpenses: 0 })
    expect(result.breakEvenUnits).toBe(100)
    expect(result.breakEvenRevenue).toBe(15000)
  })

  it('includes extra expenses in totals', () => {
    const result = buildScenario(catalog, { units: 0, eventCost: 4000, extraExpenses: 3000 })
    expect(result.totalCosts).toBe(7000)
    expect(result.breakEvenUnits).toBe(100)
  })

  it('reports inventory cost and stock shortfall', () => {
    const catalogWithStock = buildCatalog([
      product({ id: 'a', price: 100, cost: 60, track_inventory: true, stock_qty: 10 }),
      product({ id: 'b', price: 200, cost: 100, track_inventory: true, stock_qty: 10 }),
    ])
    const result = buildScenario(catalogWithStock, { units: 50, eventCost: 1000, extraExpenses: 0 })
    expect(result.inventoryCost).toBe(50 * 80)
    expect(result.shortfallUnits).toBe(30)
    expect(result.shortfallCost).toBe(30 * 80)
  })

  it('handles a null fee multiple when there is no fee', () => {
    const result = buildScenario(catalog, { units: 10, eventCost: 0, extraExpenses: 0 })
    expect(result.feeMultiple).toBeNull()
  })
})

describe('buildBreakEven', () => {
  const catalog = buildCatalog([
    product({ id: 'star', name: 'Star', price: 250, cost: 150 }),
    product({ id: 'other', name: 'Other', price: 100, cost: 90 }),
  ])

  it('computes units and revenue to cover the event', () => {
    const result = buildBreakEven(catalog, 'star', { eventCost: 10000, extraExpenses: 0 })
    expect(result).not.toBeNull()
    expect(result!.breakEvenUnits).toBe(100)
    expect(result!.breakEvenRevenue).toBe(100 * 250)
  })

  it('computes the recommended 3x fee target', () => {
    const result = buildBreakEven(catalog, 'star', { eventCost: 10000, extraExpenses: 0 })
    expect(result!.unitsForRecommended).toBe(
      (RECOMMENDED_FEE_MULTIPLE * 10000) / 100,
    )
  })

  it('returns null for an unknown product', () => {
    expect(buildBreakEven(catalog, 'missing', { eventCost: 1000, extraExpenses: 0 })).toBeNull()
  })

  it('handles a non-positive contribution gracefully', () => {
    const badCatalog = buildCatalog([product({ id: 'bad', name: 'Bad', price: 100, cost: 100 })])
    const result = buildBreakEven(badCatalog, 'bad', { eventCost: 1000, extraExpenses: 0 })
    expect(result!.breakEvenUnits).toBeNull()
    expect(result!.unitsForRecommended).toBeNull()
  })
})

describe('buildCapacity', () => {
  it('measures the pace you need against the pace your team can serve', () => {
    const result = buildCapacity({
      targetUnits: 100,
      durationHours: 8,
      staffCount: 2,
      serviceMinutesPerUnit: 5,
      efficiency: 1,
    })
    expect(result.capableUnitsPerHour).toBe(24)
    expect(result.requiredUnitsPerHour).toBe(12.5)
    expect(result.taktMinutesPerUnit).toBe(4.8)
    expect(result.coverage).toBe(0.52)
    expect(result.maxUnits).toBe(192)
    expect(result.hoursToGoal).toBe(4.17)
    expect(result.reachesGoal).toBe(true)
    expect(result.staffGap).toBe(0)
  })

  it('applies the efficiency allowance to the capable pace', () => {
    const result = buildCapacity({
      targetUnits: 100,
      durationHours: 8,
      staffCount: 2,
      serviceMinutesPerUnit: 5,
      efficiency: 0.85,
    })
    expect(result.capableUnitsPerHour).toBe(20.4)
    expect(result.coverage).toBe(0.61)
    expect(result.maxUnits).toBe(163)
    expect(result.hoursToGoal).toBe(4.9)
    expect(result.reachesGoal).toBe(true)
    expect(result.staffGap).toBe(0)
  })

  it('reports a staffing gap when the goal cannot be met in time', () => {
    const result = buildCapacity({
      targetUnits: 200,
      durationHours: 4,
      staffCount: 1,
      serviceMinutesPerUnit: 10,
      efficiency: 1,
    })
    expect(result.capableUnitsPerHour).toBe(6)
    expect(result.requiredUnitsPerHour).toBe(50)
    expect(result.coverage).toBe(8.33)
    expect(result.hoursToGoal).toBe(33.33)
    expect(result.reachesGoal).toBe(false)
    expect(result.requiredStaff).toBe(9)
    expect(result.staffGap).toBe(8)
  })

  it('handles missing inputs without dividing by zero', () => {
    const noService = buildCapacity({
      targetUnits: 100,
      durationHours: 8,
      staffCount: 2,
      serviceMinutesPerUnit: 0,
    })
    expect(noService.capableUnitsPerHour).toBeNull()
    expect(noService.coverage).toBeNull()
    expect(noService.hoursToGoal).toBeNull()
    expect(noService.reachesGoal).toBeNull()
    expect(noService.staffGap).toBeNull()

    const noDuration = buildCapacity({
      targetUnits: 100,
      durationHours: 0,
      staffCount: 2,
      serviceMinutesPerUnit: 5,
    })
    expect(noDuration.requiredUnitsPerHour).toBeNull()
    expect(noDuration.taktMinutesPerUnit).toBeNull()
    expect(noDuration.maxUnits).toBe(0)

    const noTarget = buildCapacity({
      targetUnits: 0,
      durationHours: 8,
      staffCount: 2,
      serviceMinutesPerUnit: 5,
    })
    expect(noTarget.requiredUnitsPerHour).toBeNull()
    expect(noTarget.hoursToGoal).toBeNull()
    expect(noTarget.reachesGoal).toBeNull()
    expect(noTarget.staffGap).toBeNull()
  })

  it('counts the people needed even with nobody on the team yet', () => {
    const result = buildCapacity({
      targetUnits: 100,
      durationHours: 8,
      staffCount: 0,
      serviceMinutesPerUnit: 5,
    })
    expect(result.capableUnitsPerHour).toBeNull()
    expect(result.requiredStaff).toBe(2)
    expect(result.staffGap).toBe(2)
  })
})