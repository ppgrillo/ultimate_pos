import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { errorHandler } from '../middleware/error'

const STORE_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '22222222-2222-2222-2222-222222222222'

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}))

vi.mock('../lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}))

vi.mock('../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('userId', USER_ID)
    c.set('storeId', STORE_ID)
    c.set('role', 'admin')
    await next()
  },
  requireRole: () => async (_c: any, next: any) => {
    await next()
  },
}))

import { analyticsRouter } from './analytics'

function listQuery(result: { data: any; error: any; count?: number }) {
  const not = vi.fn(() => query)
  const query: any = {
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    in: vi.fn(() => query),
    not,
    order: vi.fn(() => query),
    select: vi.fn(() => query),
    then: (resolve: (value: { data: any; error: any }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function queueFromCalls(calls: Array<{ table: string; value: any }>) {
  fromMock.mockImplementation((table: string) => {
    const next = calls.shift()
    if (!next) throw new Error(`Unexpected supabase.from(${table}) call`)
    if (next.table !== table) throw new Error(`Expected supabase.from(${next.table}), got ${table}`)
    return next.value
  })
}

const app = new Hono()
app.onError(errorHandler)
app.route('/analytics', analyticsRouter)

const CUSTOM_PARAMS = 'period=custom&from=2026-07-31&to=2026-07-31&tz=UTC'

// Reproduces the real Jul 31, 2026 scenario for "Ovejas Electronicas".
// Supabase already filters out `cancelled`/`refunded` orders in SQL, so the
// mocked "current period" data only contains the paid order. The paid order
// intentionally carries a failed payment row too, to prove failed payments
// are not counted as revenue.
const PAID_ORDER = {
  id: 'paid-order-1',
  status: 'paid',
  payment_status: 'paid',
  type: 'dine-in',
  subtotal: '350.00',
  tax: '0.00',
  discount: '0.00',
  promo_discount: '0.00',
  metadata: {},
  total: '350.00',
  created_at: '2026-07-31T19:32:52.161Z',
  payments: [
    { method: 'card', status: 'completed', amount: '350.00' },
    { method: 'card', status: 'failed', amount: '999.00' },
  ],
}

describe('analytics routes', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('GET /sales filters out cancelled orders and only counts paid revenue', async () => {
    const currentQuery = listQuery({ data: [PAID_ORDER], error: null })
    queueFromCalls([
      { table: 'orders', value: currentQuery },
      { table: 'orders', value: listQuery({ data: [], error: null }) },
    ])

    const res = await app.fetch(new Request(`http://localhost/analytics/sales?${CUSTOM_PARAMS}`, {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    expect(currentQuery.not).toHaveBeenCalledWith('status', 'eq', 'cancelled')

    const body = await res.json()
    expect(body.data.revenue).toBe(350)
    expect(body.data.orderCount).toBe(1)
    expect(body.data.avgOrderValue).toBe(350)
    // No previous period data → change must be null, not a fake 100%
    expect(body.data.revenueChange).toBeNull()
  })

  it('GET /overview filters out cancelled orders and ignores failed payments', async () => {
    const currentQuery = listQuery({ data: [PAID_ORDER], error: null })
    const prevQuery = listQuery({ data: [], error: null })
    queueFromCalls([
      { table: 'orders', value: currentQuery },
      { table: 'orders', value: prevQuery },
      { table: 'customers', value: listQuery({ data: [], count: 0, error: null }) },
      { table: 'expenses', value: listQuery({ data: [], error: null }) },
      { table: 'order_items', value: listQuery({ data: [], error: null }) },
    ])

    const res = await app.fetch(new Request(`http://localhost/analytics/overview?${CUSTOM_PARAMS}`, {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    expect(currentQuery.not).toHaveBeenCalledWith('status', 'eq', 'cancelled')
    expect(prevQuery.not).toHaveBeenCalledWith('status', 'eq', 'cancelled')

    const body = await res.json()
    expect(body.data.revenue).toBe(350)
    expect(body.data.orderCount).toBe(1)
    expect(body.data.avgOrderValue).toBe(350)
    // Glossary metrics
    expect(body.data.grossSales).toBe(350)
    expect(body.data.discounts).toBe(0)
    expect(body.data.taxCollected).toBe(0)
    expect(body.data.itemsSold).toBe(0)
    expect(body.data.cogs).toBe(0)
    expect(body.data.grossProfit).toBe(350)
    expect(body.data.operatingExpenses).toBe(0)
    expect(body.data.inventoryPurchases).toBe(0)
    expect(body.data.netProfit).toBe(350)
    // No previous period data → changes must be null, not a fake 100%
    expect(body.data.revenueChange).toBeNull()
    expect(body.data.orderChange).toBeNull()
    expect(body.data.avgChange).toBeNull()
    // failed payment row (999) must NOT be counted
    expect(body.data.revenueByPayment).toEqual({ Card: 350 })
    expect(body.data.ordersByPayment).toEqual({ Card: 1 })
    expect(body.data.paymentStatusBreakdown).toEqual({ paid: 1 })
    expect(body.data.newCustomers).toBe(0)
  })

  it('GET /overview computes cogs, gross profit and net profit from product costs', async () => {
    const discountedOrder = {
      id: 'o1',
      status: 'paid',
      payment_status: 'paid',
      type: 'dine-in',
      subtotal: 1000,
      tax: 0,
      discount: 100,
      promo_discount: 0,
      metadata: { redeemedRewardDiscount: 50 },
      total: 850,
      created_at: '2026-07-31T19:32:52.161Z',
      payments: [{ method: 'cash', status: 'completed', amount: '850.00' }],
    }
    queueFromCalls([
      { table: 'orders', value: listQuery({ data: [discountedOrder], error: null }) },
      { table: 'orders', value: listQuery({ data: [], error: null }) },
      { table: 'customers', value: listQuery({ data: [], count: 0, error: null }) },
      { table: 'expenses', value: listQuery({ data: [], error: null }) },
      {
        table: 'order_items',
        value: listQuery({
          data: [
            { product_id: 'p1', quantity: 2 },
            { product_id: 'p2', quantity: 1 },
            { product_id: null, quantity: 3 },
          ],
          error: null,
        }),
      },
      {
        table: 'products',
        value: listQuery({
          data: [
            { id: 'p1', cost: 100 },
            { id: 'p2', cost: null },
          ],
          error: null,
        }),
      },
    ])

    const res = await app.fetch(new Request(`http://localhost/analytics/overview?${CUSTOM_PARAMS}`, {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.grossSales).toBe(1000)
    // manual discount 100 + reward discount 50
    expect(body.data.discounts).toBe(150)
    expect(body.data.itemsSold).toBe(6)
    // p1: 2×100 = 200 ; p2 has no cost ; custom items have no cost
    expect(body.data.cogs).toBe(200)
    expect(body.data.grossProfit).toBe(650)
    expect(body.data.operatingExpenses).toBe(0)
    expect(body.data.inventoryPurchases).toBe(0)
    expect(body.data.netProfit).toBe(650)
  })

  it('GET /overview subtracts operating expenses from net profit but ignores inventory purchases', async () => {
    const paidOrder = {
      id: 'o1',
      status: 'paid',
      payment_status: 'paid',
      type: 'takeaway',
      subtotal: 350,
      tax: 0,
      discount: 0,
      promo_discount: 0,
      metadata: {},
      total: 350,
      created_at: '2026-07-31T19:32:52.161Z',
      payments: [{ method: 'cash', status: 'completed', amount: '350.00' }],
    }
    queueFromCalls([
      { table: 'orders', value: listQuery({ data: [paidOrder], error: null }) },
      { table: 'orders', value: listQuery({ data: [], error: null }) },
      { table: 'customers', value: listQuery({ data: [], count: 0, error: null }) },
      {
        table: 'expenses',
        value: listQuery({
          data: [
            { amount: 100, type: 'operating' },
            { amount: 25.5, type: 'operating' },
            { amount: 300, type: 'inventory' },
          ],
          error: null,
        }),
      },
      { table: 'order_items', value: listQuery({ data: [], error: null }) },
    ])

    const res = await app.fetch(new Request(`http://localhost/analytics/overview?${CUSTOM_PARAMS}`, {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    // operating: 100 + 25.5 = 125.5 → net profit = 350 − 125.5 = 224.5
    expect(body.data.operatingExpenses).toBe(125.5)
    // inventory purchases are tracked but never reduce net profit (COGS covers it)
    expect(body.data.inventoryPurchases).toBe(300)
    expect(body.data.grossProfit).toBe(350)
    expect(body.data.netProfit).toBe(224.5)
  })

  it('GET /products allocates net revenue across line items', async () => {
    const ordersQuery = listQuery({
      data: [
        { id: 'o1', subtotal: 1000, total: 900 }, // $100 discount
        { id: 'o2', subtotal: 500, total: 500 },
      ],
      error: null,
    })
    queueFromCalls([
      { table: 'orders', value: ordersQuery },
      {
        table: 'order_items',
        value: listQuery({
          data: [
            { order_id: 'o1', product_id: 'p1', product_name: 'A', quantity: 2, unit_price: 300 },
            { order_id: 'o1', product_id: 'p2', product_name: 'B', quantity: 2, unit_price: 200 },
            { order_id: 'o2', product_id: 'p1', product_name: 'A', quantity: 1, unit_price: 500 },
          ],
          error: null,
        }),
      },
    ])

    const res = await app.fetch(new Request(`http://localhost/analytics/products?${CUSTOM_PARAMS}&limit=10`, {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    expect(ordersQuery.not).toHaveBeenCalledWith('status', 'eq', 'cancelled')

    const body = await res.json()
    // o1 factor = 900/1000 = 0.9 → A: 600*0.9=540, B: 400*0.9=360
    // o2 factor = 500/500 = 1   → A: 500*1=500
    const a = body.data.find((p: any) => p.productId === 'p1')
    const b = body.data.find((p: any) => p.productId === 'p2')
    expect(a.revenue).toBe(1040)
    expect(a.quantitySold).toBe(3)
    expect(b.revenue).toBe(360)
    expect(b.quantitySold).toBe(2)
    // net revenue sums to Σ order totals (900 + 500)
    expect(a.revenue + b.revenue).toBe(1400)
  })

  it('GET /dashboard-stats filters out cancelled orders', async () => {
    const now = new Date()
    const currentQuery = listQuery({
      data: [
        { id: 'd-paid', status: 'paid', total: '350.00', created_at: now.toISOString() },
        { id: 'd-served', status: 'served', total: '450.00', created_at: now.toISOString() },
      ],
      error: null,
    })
    queueFromCalls([{ table: 'orders', value: currentQuery }])

    const res = await app.fetch(new Request('http://localhost/analytics/dashboard-stats?tz=UTC', {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    expect(currentQuery.not).toHaveBeenCalledWith('status', 'eq', 'cancelled')

    const body = await res.json()
    expect(body.data.todayRevenue).toBe(800)
    expect(body.data.todayOrderCount).toBe(2)
  })
})
