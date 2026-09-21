import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { errorHandler } from '../middleware/error'

const STORE_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '22222222-2222-2222-2222-222222222222'
const SUPPLIER_ID = '33333333-3333-3333-3333-333333333333'
const SUPPLIER_2_ID = '44444444-4444-4444-4444-444444444444'

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

vi.mock('../middleware/requireAccess', () => ({
  requireAccess: async (_c: any, next: any) => {
    await next()
  },
}))

import { suppliersRouter } from './suppliers'

function listQuery(result: { data: any; error: any }) {
  const query: any = {
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    or: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
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
app.route('/suppliers', suppliersRouter)

const SUPPLIER = {
  id: SUPPLIER_ID,
  store_id: STORE_ID,
  name: 'Distribuidora Norte',
  contact_name: 'Ana Torres',
  phone: '+52 555 123 4567',
  email: 'ventas@distnorte.mx',
  website: 'https://distnorte.mx',
  address: null,
  notes: 'Textiles y uniformes',
  is_active: true,
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
}

const SUPPLIER_2 = { ...SUPPLIER, id: SUPPLIER_2_ID, name: 'Papelera Central' }

describe('suppliers routes', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  beforeEach(() => {
    currentRole.value = 'admin'
    vi.clearAllMocks()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('GET / lists suppliers for the store with aggregated stats', async () => {
    const suppliersQuery = listQuery({ data: [SUPPLIER, SUPPLIER_2], error: null })
    const expensesQuery = listQuery({
      data: [
        { supplier_id: SUPPLIER_ID, amount: 1200, expense_date: '2026-08-01', delivery_days: 3 },
        { supplier_id: SUPPLIER_ID, amount: 800, expense_date: '2026-07-15', delivery_days: 5 },
        { supplier_id: SUPPLIER_2_ID, amount: 400, expense_date: '2026-08-10', delivery_days: null },
      ],
      error: null,
    })
    queueFromCalls([
      { table: 'suppliers', value: suppliersQuery },
      { table: 'expenses', value: expensesQuery },
    ])

    const res = await app.fetch(new Request('http://localhost/suppliers', {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    expect(suppliersQuery.eq).toHaveBeenCalledWith('store_id', STORE_ID)
    expect(expensesQuery.in).toHaveBeenCalledWith('supplier_id', [SUPPLIER_ID, SUPPLIER_2_ID])

    const body = await res.json()
    expect(body.data).toHaveLength(2)

    const first = body.data.find((s: any) => s.id === SUPPLIER_ID)
    expect(first.stats).toEqual({
      totalSpent: 2000,
      purchaseCount: 2,
      avgExpense: 1000,
      lastPurchaseDate: '2026-08-01',
      avgDeliveryDays: 4,
    })

    const second = body.data.find((s: any) => s.id === SUPPLIER_2_ID)
    expect(second.stats.totalSpent).toBe(400)
    expect(second.stats.avgDeliveryDays).toBeNull()
  })

  it('GET / supports search filter by name', async () => {
    const query = listQuery({ data: [SUPPLIER], error: null })
    queueFromCalls([
      { table: 'suppliers', value: query },
      { table: 'expenses', value: listQuery({ data: [], error: null }) },
    ])

    const res = await app.fetch(new Request('http://localhost/suppliers?search=norte', {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    expect(query.or).toHaveBeenCalledWith(
      'name.ilike.%norte%,contact_name.ilike.%norte%,phone.ilike.%norte%,email.ilike.%norte%,website.ilike.%norte%,address.ilike.%norte%,notes.ilike.%norte%',
    )

    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })

  it('POST / creates a supplier as admin', async () => {
    const query = mutationQuery({ data: SUPPLIER, error: null })
    queueFromCalls([{ table: 'suppliers', value: query }])

    const res = await app.fetch(new Request('http://localhost/suppliers', {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Distribuidora Norte',
        contact_name: 'Ana Torres',
        phone: '+52 555 123 4567',
        email: 'ventas@distnorte.mx',
        website: 'https://distnorte.mx',
        notes: 'Textiles y uniformes',
      }),
    }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.id).toBe(SUPPLIER_ID)
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ store_id: STORE_ID, name: 'Distribuidora Norte', is_active: true }),
    )
  })

  it('POST / returns 400 for a supplier without name', async () => {
    const res = await app.fetch(new Request('http://localhost/suppliers', {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+52 555 123 4567' }),
    }))

    expect(res.status).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('POST / rejects non-admin employees with 401', async () => {
    currentRole.value = 'employee'

    const res = await app.fetch(new Request('http://localhost/suppliers', {
      method: 'POST',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Distribuidora Norte' }),
    }))

    expect(res.status).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('GET /:id returns a single supplier with stats', async () => {
    const suppliersQuery = mutationQuery({ data: SUPPLIER, error: null })
    const expensesQuery = listQuery({ data: [], error: null })
    queueFromCalls([
      { table: 'suppliers', value: suppliersQuery },
      { table: 'expenses', value: expensesQuery },
    ])

    const res = await app.fetch(new Request('http://localhost/suppliers/33333333-3333-3333-3333-333333333333', {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe('Distribuidora Norte')
    expect(body.data.stats.purchaseCount).toBe(0)
  })

  it('GET /:id returns 404 when supplier does not exist', async () => {
    queueFromCalls([{ table: 'suppliers', value: mutationQuery({ data: null, error: { message: 'not found' } }) }])

    const res = await app.fetch(new Request('http://localhost/suppliers/missing', {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(404)
  })

  it('GET /:id/expenses lists expenses for the supplier', async () => {
    const query = listQuery({ data: [{ id: 'exp-1', supplier_id: SUPPLIER_ID }], error: null })
    queueFromCalls([{ table: 'expenses', value: query }])

    const res = await app.fetch(new Request('http://localhost/suppliers/33333333-3333-3333-3333-333333333333/expenses?from=2026-07-01&to=2026-07-31', {
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    expect(query.eq).toHaveBeenCalledWith('supplier_id', SUPPLIER_ID)
    expect(query.gte).toHaveBeenCalledWith('expense_date', '2026-07-01')
    expect(query.lte).toHaveBeenCalledWith('expense_date', '2026-07-31')

    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })

  it('PUT / updates a supplier', async () => {
    const updated = { ...SUPPLIER, name: 'Distribuidora Norte S.A.' }
    const suppliersQuery = mutationQuery({ data: updated, error: null })
    const expensesQuery = listQuery({ data: [], error: null })
    queueFromCalls([
      { table: 'suppliers', value: suppliersQuery },
      { table: 'expenses', value: expensesQuery },
    ])

    const res = await app.fetch(new Request('http://localhost/suppliers/33333333-3333-3333-3333-333333333333', {
      method: 'PUT',
      headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Distribuidora Norte S.A.' }),
    }))

    expect(res.status).toBe(200)
    expect(suppliersQuery.eq).toHaveBeenCalledWith('id', SUPPLIER_ID)
    const body = await res.json()
    expect(body.data.name).toBe('Distribuidora Norte S.A.')
  })

  it('DELETE / detaches linked expenses then deletes the supplier', async () => {
    const detachQuery = mutationQuery({ data: null, error: null })
    const deleteQuery = mutationQuery({ data: null, error: null })
    queueFromCalls([
      { table: 'expenses', value: detachQuery },
      { table: 'suppliers', value: deleteQuery },
    ])

    const res = await app.fetch(new Request('http://localhost/suppliers/33333333-3333-3333-3333-333333333333', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test' },
    }))

    expect(res.status).toBe(200)
    expect(detachQuery.update).toHaveBeenCalledWith({ supplier_id: null })
    expect(detachQuery.eq).toHaveBeenCalledWith('supplier_id', SUPPLIER_ID)
    expect(deleteQuery.delete).toHaveBeenCalled()
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', SUPPLIER_ID)
  })
})