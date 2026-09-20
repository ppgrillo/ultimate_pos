import type { Product } from '@ultimate-pos/shared'

export const STORAGE_KEY = 'ultimate-pos.simulation.v3'
export const RECOMMENDED_FEE_MULTIPLE = 3
export const MARGIN_PRESETS = [40, 50, 60, 70, 80]
export const CAPACITY_EFFICIENCY = 0.85
export const DURATION_PRESETS = [4, 8, 16, 24]
export const SERVICE_PRESETS = [2, 5, 10, 15]

export type GoalMode = 'breakEven' | 'recommended' | 'whatIf'

export interface SimulationParams {
  eventCost: number
  extraExpenses: number
  marginPercent: number
  starProductId: string | null
  productMargins: Record<string, number>
  whatIfUnits: number
  eventDurationHours: number
  staffCount: number
  serviceMinutesPerUnit: number
  goalMode: GoalMode
  efficiencyAdjusted: boolean
}

export const DEFAULT_PARAMS: SimulationParams = {
  eventCost: 10000,
  extraExpenses: 0,
  marginPercent: 40,
  starProductId: null,
  productMargins: {},
  whatIfUnits: 30,
  eventDurationHours: 8,
  staffCount: 2,
  serviceMinutesPerUnit: 5,
  goalMode: 'breakEven',
  efficiencyAdjusted: true,
}

export interface CatalogItem {
  id: string
  name: string
  price: number
  cost: number
  contribution: number
  margin: number
  hasRealCost: boolean
}

export interface Catalog {
  items: CatalogItem[]
  count: number
  estimatedCount: number
  excludedCount: number
  realCostCount: number
  realAvgMarginPercent: number | null
  avgPrice: number
  avgCost: number
  avgContribution: number
  avgMargin: number
  totalStock: number | null
}

const round2 = (n: number): number => Math.round(n * 100) / 100

export function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(Math.max(value, 0), 100)
}

/** Estimated unit cost from a selling price and a target margin (margin is % of sale). */
export function estimateCost(price: number, marginPercent: number): number {
  return round2(price * (1 - clampPercent(marginPercent) / 100))
}

export function unitsToCoverAmount(amount: number, contributionPerUnit: number): number | null {
  if (!(contributionPerUnit > 0)) return null
  return Math.ceil(Math.max(0, amount) / contributionPerUnit)
}

/**
 * A sensible upper bound for a break-even chart's x-axis (units), rounded to a
 * friendly step so axis labels stay clean.
 */
export function niceMaxUnits(
  breakEvenUnits: number | null,
  recommendedUnits: number | null,
  fallback = 100,
): number {
  const raw = Math.max(breakEvenUnits ?? 0, recommendedUnits ?? 0)
  if (raw <= 0) return fallback
  const withHeadroom = raw * 1.25
  const step = withHeadroom > 1000 ? 250 : 50
  return Math.ceil(withHeadroom / step) * step
}

export function buildCatalog(
  products: Product[],
  marginPercent = 40,
  productMargins: Record<string, number> = {},
): Catalog {
  const items: CatalogItem[] = []
  let estimatedCount = 0
  let excludedCount = 0
  let realCostCount = 0
  let trackedUnits = 0
  let trackedCount = 0

  for (const p of products) {
    if (!(p.price > 0)) {
      excludedCount += 1
      continue
    }
    const realCost = p.cost
    const hasRealCost = typeof realCost === 'number' && !Number.isNaN(realCost)
    const cost = hasRealCost
      ? realCost
      : estimateCost(p.price, productMargins[p.id] ?? marginPercent)
    if (!hasRealCost) estimatedCount += 1
    else realCostCount += 1
    const contribution = p.price - cost
    items.push({
      id: p.id,
      name: p.name,
      price: p.price,
      cost,
      contribution,
      margin: p.price > 0 ? contribution / p.price : 0,
      hasRealCost,
    })

    if (p.track_inventory && typeof p.stock_qty === 'number' && p.stock_qty >= 0) {
      trackedUnits += p.stock_qty
      trackedCount += 1
    }
  }

  const realCosts = items.filter((i) => i.hasRealCost)
  const realAvgMarginPercent =
    realCosts.length > 0 ? Math.round(realCosts.reduce((s, i) => s + i.margin, 0) / realCosts.length * 100) : null

  const count = items.length
  const avgPrice = count ? items.reduce((s, i) => s + i.price, 0) / count : 0
  const avgCost = count ? items.reduce((s, i) => s + i.cost, 0) / count : 0
  const avgContribution = count ? items.reduce((s, i) => s + i.contribution, 0) / count : 0
  const avgMargin = avgPrice > 0 ? avgContribution / avgPrice : 0

  return {
    items,
    count,
    estimatedCount,
    excludedCount,
    realCostCount,
    realAvgMarginPercent,
    avgPrice: round2(avgPrice),
    avgCost: round2(avgCost),
    avgContribution: round2(avgContribution),
    avgMargin,
    totalStock: trackedCount > 0 ? trackedUnits : null,
  }
}

export interface ScenarioParams {
  units: number
  eventCost: number
  extraExpenses: number
}

export interface ScenarioResult {
  units: number
  revenue: number
  cogs: number
  grossProfit: number
  eventCost: number
  extraExpenses: number
  totalCosts: number
  net: number
  profitable: boolean
  feeMultiple: number | null
  breakEvenUnits: number | null
  breakEvenRevenue: number | null
  inventoryCost: number
  shortfallUnits: number
  shortfallCost: number
}

export function buildScenario(catalog: Catalog, params: ScenarioParams): ScenarioResult {
  const units = Math.max(0, Math.floor(params.units || 0))
  const eventCost = Math.max(0, params.eventCost || 0)
  const extraExpenses = Math.max(0, params.extraExpenses || 0)
  const totalCosts = eventCost + extraExpenses

  const revenue = round2(units * catalog.avgPrice)
  const cogs = round2(units * catalog.avgCost)
  const grossProfit = round2(units * catalog.avgContribution)
  const net = round2(grossProfit - totalCosts)

  const breakEvenUnits = unitsToCoverAmount(totalCosts, catalog.avgContribution)
  const breakEvenRevenue = breakEvenUnits != null ? round2(breakEvenUnits * catalog.avgPrice) : null

  const inventoryCost = round2(units * catalog.avgCost)
  const availableStock = catalog.totalStock
  const shortfallUnits = availableStock != null && units > availableStock ? units - availableStock : 0
  const shortfallCost = round2(shortfallUnits * catalog.avgCost)

  return {
    units,
    revenue,
    cogs,
    grossProfit,
    eventCost,
    extraExpenses,
    totalCosts,
    net,
    profitable: net > 0,
    feeMultiple: eventCost > 0 ? round2(grossProfit / eventCost) : null,
    breakEvenUnits,
    breakEvenRevenue,
    inventoryCost,
    shortfallUnits,
    shortfallCost,
  }
}

export interface BreakEvenParams {
  eventCost: number
  extraExpenses: number
}

export interface BreakEvenResult {
  product: CatalogItem
  totalCosts: number
  breakEvenUnits: number | null
  breakEvenRevenue: number | null
  unitsForRecommended: number | null
  revenueForRecommended: number | null
}

export function buildBreakEven(
  catalog: Catalog,
  productId: string | null,
  params: BreakEvenParams,
): BreakEvenResult | null {
  const product = catalog.items.find((item) => item.id === productId) ?? null
  if (!product) return null

  const eventCost = Math.max(0, params.eventCost || 0)
  const extraExpenses = Math.max(0, params.extraExpenses || 0)
  const totalCosts = eventCost + extraExpenses

  const breakEvenUnits = unitsToCoverAmount(totalCosts, product.contribution)
  const unitsForRecommended = unitsToCoverAmount(
    RECOMMENDED_FEE_MULTIPLE * eventCost,
    product.contribution,
  )

  return {
    product,
    totalCosts,
    breakEvenUnits,
    breakEvenRevenue: breakEvenUnits != null ? round2(breakEvenUnits * product.price) : null,
    unitsForRecommended,
    revenueForRecommended: unitsForRecommended != null ? round2(unitsForRecommended * product.price) : null,
  }
}

export interface CapacityParams {
  targetUnits: number
  durationHours: number
  staffCount: number
  serviceMinutesPerUnit: number
  efficiency?: number
}

export interface CapacityResult {
  targetUnits: number
  durationHours: number
  staffCount: number
  serviceMinutesPerUnit: number
  efficiency: number
  availableMinutes: number
  taktMinutesPerUnit: number | null
  capableUnitsPerHour: number | null
  requiredUnitsPerHour: number | null
  coverage: number | null
  maxUnits: number | null
  hoursToGoal: number | null
  reachesGoal: boolean | null
  requiredStaff: number | null
  staffGap: number | null
}

/**
 * Capacity planning for an event: compares the pace you need (takt time) with
 * the pace your team can actually serve (cycle time × people), then reports the
 * staffing gap to close the difference.
 */
export function buildCapacity(params: CapacityParams): CapacityResult {
  const targetUnits = Math.max(0, Math.floor(params.targetUnits || 0))
  const durationHours = Math.max(0, params.durationHours || 0)
  const staffCount = Math.max(0, Math.floor(params.staffCount || 0))
  const serviceMinutesPerUnit = Math.max(0, params.serviceMinutesPerUnit || 0)
  const efficiency = Math.min(Math.max(params.efficiency ?? 1, 0.1), 1)

  const availableMinutes = round2(durationHours * 60)
  const capableUnitsPerHour =
    serviceMinutesPerUnit > 0 && staffCount > 0
      ? round2((staffCount * 60 * efficiency) / serviceMinutesPerUnit)
      : null
  const requiredUnitsPerHour =
    durationHours > 0 && targetUnits > 0 ? round2(targetUnits / durationHours) : null
  const taktMinutesPerUnit =
    availableMinutes > 0 && targetUnits > 0 ? round2(availableMinutes / targetUnits) : null
  const coverage =
    capableUnitsPerHour != null && capableUnitsPerHour > 0 && requiredUnitsPerHour != null
      ? round2(requiredUnitsPerHour / capableUnitsPerHour)
      : null
  const maxUnits = capableUnitsPerHour != null ? Math.floor(capableUnitsPerHour * durationHours) : null
  const hoursToGoal =
    capableUnitsPerHour != null && capableUnitsPerHour > 0 && targetUnits > 0
      ? round2(targetUnits / capableUnitsPerHour)
      : null
  const reachesGoal = hoursToGoal != null && durationHours > 0 ? hoursToGoal <= durationHours : null
  const requiredStaff =
    requiredUnitsPerHour != null && serviceMinutesPerUnit > 0
      ? Math.ceil((requiredUnitsPerHour * serviceMinutesPerUnit) / 60 / efficiency)
      : null
  const staffGap = requiredStaff != null ? requiredStaff - staffCount : null

  return {
    targetUnits,
    durationHours,
    staffCount,
    serviceMinutesPerUnit,
    efficiency,
    availableMinutes,
    taktMinutesPerUnit,
    capableUnitsPerHour,
    requiredUnitsPerHour,
    coverage,
    maxUnits,
    hoursToGoal,
    reachesGoal,
    requiredStaff,
    staffGap,
  }
}