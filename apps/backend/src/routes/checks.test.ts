import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { errorHandler } from '../middleware/error'

const STORE_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '22222222-2222-2222-2222-222222222222'
const CHECK_ID = '33333333-3333-3333-3333-333333333333'
const PRODUCT_ID = '44444444-4444-4444-4444-444444444444'

const { fromMock, emitMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  emitMock: vi.fn(),
}))

vi.mock('../lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}))

vi.mock('../events', () => ({
  orderBus: { emit: emitMock, on: vi.fn(), off: vi.fn() },
}))

vi.mock('../lib/settings', () => ({
  decryptSettings: (settings: Record<string, unknown>) => settings,
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

vi.mock('../middleware/requireAccess', () => ({
  requireAccess: async (_c: any, next: any) => {
    await next()
  },
}))

import { checksRouter } from './checks'

function selectQuery(result: { data: any; error: any }) {
  const query: any = {
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: { data: any; error: any }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function insertQuery({ data = null, error = null }: { data?: any; error?: any }) {
  const query: any = {
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data, error })),
    })),
    then: (resolve: (value: { data: any; error: any }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data, error }).then(resolve, reject),
  }
  return query
}

function updateQuery({ data = null, error = null }: { data?: any; error?: any }) {
  const query: any = {
    eq: vi.fn(() => query),
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data, error })),
    })),
    then: (resolve: (value: { data: any; error: any }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data, error }).then(resolve, reject),
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
app.route('/checks', checksRouter)

describe('checks routes', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('opens a check when there is no active check for the table', async () => {
    const openedAt = '2026-07-25T10:00:00.000Z'
    queueFromCalls([
      {
        table: 'checks',
        value: {
          select: vi.fn(() => selectQuery({ data: null, error: null })),
        },
      },
      {
        table: 'checks',
        value: {
          insert: vi.fn(() => insertQuery({
            data: {
              id: CHECK_ID,
              store_id: STORE_ID,
              table_number: 10,
              status: 'open',
              opened_at: openedAt,
            },
          })),
        },
      },
    ])

    const res = await app.fetch(new Request('http://localhost/checks/open', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ table_number: 10 }),
    }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.id).toBe(CHECK_ID)
    expect(body.data.table_number).toBe(10)
    expect(body.data.status).toBe('open')
  })

  it('adds a new order round to an open check and emits order:created', async () => {
    queueFromCalls([
      {
        table: 'checks',
        value: {
          select: vi.fn(() => selectQuery({
            data: {
              id: CHECK_ID,
              store_id: STORE_ID,
              table_number: 7,
              customer_id: null,
              status: 'open',
            },
            error: null,
          })),
        },
      },
      {
        table: 'stores',
        value: {
          select: vi.fn(() => selectQuery({
            data: {
              tax_rate: 10,
              settings: {
                taxEnabled: true,
                taxInclusive: false,
                taxExemptEnabled: false,
                timezone: 'UTC',
              },
            },
            error: null,
          })),
        },
      },
      {
        table: 'products',
        value: {
          select: vi.fn(() => selectQuery({
            data: [{ id: PRODUCT_ID, name: 'Burger', price: 100, tax_exempt: false }],
            error: null,
          })),
        },
      },
      {
        table: 'orders',
        value: {
          select: vi.fn(() => selectQuery({ data: [{ order_number: 7 }], error: null })),
        },
      },
      {
        table: 'orders',
        value: {
          select: vi.fn(() => selectQuery({ data: { round_number: 1 }, error: null })),
        },
      },
      {
        table: 'orders',
        value: {
          insert: vi.fn(() => insertQuery({
            data: {
              id: '55555555-5555-5555-5555-555555555555',
              store_id: STORE_ID,
              check_id: CHECK_ID,
              round_number: 2,
              table_number: 7,
              total: 220,
              status: 'pending',
              payment_status: 'unpaid',
              metadata: { checkId: CHECK_ID, roundNumber: 2, isAddon: true },
            },
          })),
        },
      },
      {
        table: 'order_items',
        value: {
          insert: vi.fn(() => insertQuery({ data: null, error: null })),
        },
      },
      {
        table: 'orders',
        value: {
          select: vi.fn(() => selectQuery({
            data: {
              id: '55555555-5555-5555-5555-555555555555',
              store_id: STORE_ID,
              check_id: CHECK_ID,
              round_number: 2,
              table_number: 7,
              total: 220,
              status: 'pending',
              payment_status: 'unpaid',
              metadata: { checkId: CHECK_ID, roundNumber: 2, isAddon: true },
              customer: null,
              items: [],
              payments: [],
            },
            error: null,
          })),
        },
      },
    ])

    const res = await app.fetch(new Request(`http://localhost/checks/${CHECK_ID}/orders`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'dine-in',
        items: [{ product_id: PRODUCT_ID, quantity: 2 }],
      }),
    }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.check_id).toBe(CHECK_ID)
    expect(body.data.round_number).toBe(2)
    expect(body.data.metadata.isAddon).toBe(true)
    expect(emitMock).toHaveBeenCalledTimes(1)
    expect(emitMock).toHaveBeenCalledWith('order:created', expect.objectContaining({ check_id: CHECK_ID, round_number: 2 }))
  })

  it('closes a check by creating payment for unpaid orders and marking check closed', async () => {
    const paymentsInsert = vi.fn(() => insertQuery({ data: null, error: null }))
    const ordersUpdate = vi.fn(() => updateQuery({ data: null, error: null }))
    const checksUpdate = vi.fn(() => updateQuery({ data: { id: CHECK_ID, status: 'closed' }, error: null }))

    queueFromCalls([
      {
        table: 'checks',
        value: {
          select: vi.fn(() => selectQuery({
            data: { id: CHECK_ID, status: 'open', store_id: STORE_ID },
            error: null,
          })),
        },
      },
      {
        table: 'orders',
        value: {
          select: vi.fn(() => selectQuery({
            data: [
              { id: 'order-1', store_id: STORE_ID, status: 'served', payment_status: 'unpaid', total: 80 },
              { id: 'order-2', store_id: STORE_ID, status: 'cancelled', payment_status: 'unpaid', total: 20 },
            ],
            error: null,
          })),
        },
      },
      {
        table: 'payments',
        value: {
          insert: paymentsInsert,
        },
      },
      {
        table: 'orders',
        value: {
          update: ordersUpdate,
        },
      },
      {
        table: 'checks',
        value: {
          update: checksUpdate,
        },
      },
    ])

    const res = await app.fetch(new Request(`http://localhost/checks/${CHECK_ID}/close`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_method: 'cash' }),
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.status).toBe('closed')
    expect(body.data.total).toBe(80)
    expect(paymentsInsert).toHaveBeenCalledTimes(1)
    expect(ordersUpdate).toHaveBeenCalledTimes(1)
  })

  it('does not close a check when kitchen tickets are still active', async () => {
    queueFromCalls([
      {
        table: 'checks',
        value: {
          select: vi.fn(() => selectQuery({
            data: { id: CHECK_ID, status: 'open', store_id: STORE_ID },
            error: null,
          })),
        },
      },
      {
        table: 'orders',
        value: {
          select: vi.fn(() => selectQuery({
            data: [{ id: 'order-1', store_id: STORE_ID, status: 'pending', payment_status: 'unpaid', total: 40 }],
            error: null,
          })),
        },
      },
    ])

    const res = await app.fetch(new Request(`http://localhost/checks/${CHECK_ID}/close`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payment_method: 'cash' }),
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('kitchen tickets are still active')
  })
})
