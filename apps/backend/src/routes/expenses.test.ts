import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { errorHandler } from '../middleware/error'

const STORE_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '22222222-2222-2222-2222-222222222222'

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}))

const currentRole = vi.hoisted(() => ({ value: 'admin' }))

vi.mock('../lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: fromMock,
    storage: {
      from: () => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://cdn.test/receipts/x.jpg' } })),
        remove: vi.fn(),
      }),
    },
  },
}))

vi.mock('../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('userId', USER_ID)
    c.set('storeId', STORE_ID)
    c.set('role', currentRole.value)
    await next()
  },
  requireRole: (...roles: string[]) => async (c: any, next: any) => {
    const role = c.get('role')
    if (!roles.includes(role)) {
      c.status(401)
      return c.json({ error: 'Insufficient permissions' })
    }
    await next()
  },
}))

import { expensesRouter } from './expenses'

function listQuery(result: { data: any; error: any }) {
  const query: any = {
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    select: vi.fn(() => query),
    then: (resolve: (value: { data: any; error: any }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function mutationQuery(result: { data: any; error: any }) {
  const query: any = {
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(() => query),
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
app.route('/expenses', expensesRouter)

const EXPENSE = {
  id: 'exp-1',
  store_id: STORE_ID,
  type: 'operating',
  category: 'Rent',
  description: 'July rent',
  amount: 5000,
  expense_date: '2026-07-01',
  receipt_url: null,
  created_by: USER_ID,
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
}

describe('expenses routes', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  beforeEach(() => {
    currentRole.value = 'admin'
    vi.clearAllMocks()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('GET / lists expenses for the store ordered by date desc', async () => {
    const query = listQuery({ data: [EXPENSE], error: null })
    queueFromCalls([{ table: 'expenses', value: query }])

    const res = await app.fetch(new Request('http://localhost/expenses?from=2026-07-01&to=2026-07-31&type=operating&category=Rent', {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    expect(query.eq).toHaveBeenCalledWith('store_id', STORE_ID)
    expect(query.eq).toHaveBeenCalledWith('type', 'operating')
    expect(query.eq).toHaveBeenCalledWith('category', 'Rent')
    expect(query.order).toHaveBeenCalledWith('expense_date', { ascending: false })

    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe('exp-1')
  })

  it('GET /summary splits operating and inventory totals', async () => {
    queueFromCalls([
      {
        table: 'expenses',
        value: listQuery({
          data: [
            { amount: 5000, type: 'operating' },
            { amount: 25.5, type: 'operating' },
            { amount: 300, type: 'inventory' },
          ],
          error: null,
        }),
      },
    ])

    const res = await app.fetch(new Request('http://localhost/expenses/summary', {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.operatingTotal).toBe(5025.5)
    expect(body.data.inventoryTotal).toBe(300)
    expect(body.data.count).toBe(3)
  })

  it('POST / creates an expense as admin', async () => {
    const query = mutationQuery({ data: EXPENSE, error: null })
    queueFromCalls([{ table: 'expenses', value: query }])

    const res = await app.fetch(new Request('http://localhost/expenses', {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'operating',
        category: 'Rent',
        description: 'July rent',
        amount: 5000,
        expense_date: '2026-07-01',
      }),
    }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.id).toBe('exp-1')
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ store_id: STORE_ID, created_by: USER_ID }))
  })

  it('POST / rejects non-admin employees with 401', async () => {
    currentRole.value = 'employee'

    const res = await app.fetch(new Request('http://localhost/expenses', {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'operating',
        category: 'Rent',
        description: 'July rent',
        amount: 5000,
      }),
    }))

    expect(res.status).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('PUT / updates an expense', async () => {
    const updated = { ...EXPENSE, amount: 5500 }
    const query = mutationQuery({ data: updated, error: null })
    queueFromCalls([{ table: 'expenses', value: query }])

    const res = await app.fetch(new Request('http://localhost/expenses/exp-1', {
      method: 'PUT',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'operating',
        category: 'Rent',
        description: 'July rent',
        amount: 5500,
        expense_date: '2026-07-01',
      }),
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.amount).toBe(5500)
    expect(query.eq).toHaveBeenCalledWith('id', 'exp-1')
  })

  it('DELETE / removes an expense', async () => {
    const query = mutationQuery({ data: null, error: null })
    queueFromCalls([{ table: 'expenses', value: query }])

    const res = await app.fetch(new Request('http://localhost/expenses/exp-1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('id', 'exp-1')
  })
})
