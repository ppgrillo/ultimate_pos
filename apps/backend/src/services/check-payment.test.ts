import { beforeEach, describe, expect, it, vi } from 'vitest'

const records = {
  payments: [] as any[],
  orderUpdates: [] as any[],
  checkUpdates: [] as any[],
}

let checksRow: any = { id: 'chk-1', status: 'open' }
let ordersRows: any[] = []

const { fromMock, emitMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  emitMock: vi.fn(),
}))

vi.mock('../lib/supabase/admin', () => ({
  supabaseAdmin: { from: fromMock },
}))

vi.mock('../events', () => ({
  orderBus: { emit: emitMock, on: vi.fn(), off: vi.fn() },
}))

import {
  readCheckPayment,
  isPendingCheckCardPayment,
  applyCheckCardOutcome,
} from './check-payment'

function makeQuery(table: string) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    insert: vi.fn((row: any) => {
      if (table === 'payments') records.payments.push(row)
      return query
    }),
    update: vi.fn((row: any) => {
      if (table === 'orders') records.orderUpdates.push(row)
      if (table === 'checks') records.checkUpdates.push(row)
      return query
    }),
    single: vi.fn(async () => ({ data: table === 'checks' ? checksRow : null, error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    then: (resolve: (value: { data: any; error: any }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: table === 'orders' ? ordersRows : [], error: null }).then(resolve, reject),
  }
  return query
}

fromMock.mockImplementation((table: string) => makeQuery(table))

beforeEach(() => {
  vi.clearAllMocks()
  records.payments = []
  records.orderUpdates = []
  records.checkUpdates = []
  checksRow = { id: 'chk-1', status: 'open' }
  ordersRows = []
})

describe('readCheckPayment', () => {
  it('reads the payment object', () => {
    const info = readCheckPayment({
      metadata: {
        payment: { provider: 'mercado_pago', providerOrderId: 'MP_1', providerStatus: 'at_terminal', amount: 100, tip: 10 },
      },
    })
    expect(info.providerOrderId).toBe('MP_1')
    expect(info.providerStatus).toBe('at_terminal')
    expect(info.amount).toBe(100)
    expect(info.tip).toBe(10)
  })

  it('falls back to the legacy keys', () => {
    const info = readCheckPayment({ metadata: { mpOrderId: 'MP_2', mpOrderStatus: 'created' } })
    expect(info.providerOrderId).toBe('MP_2')
    expect(info.providerStatus).toBe('created')
  })
})

describe('isPendingCheckCardPayment', () => {
  it('is true while the intent is not terminal', () => {
    expect(isPendingCheckCardPayment({ metadata: { payment: { providerOrderId: 'MP_1', providerStatus: 'at_terminal' } } })).toBe(true)
  })

  it('is false once the intent is terminal', () => {
    expect(isPendingCheckCardPayment({ metadata: { payment: { providerOrderId: 'MP_1', providerStatus: 'processed' } } })).toBe(false)
    expect(isPendingCheckCardPayment({ metadata: { payment: { providerOrderId: 'MP_1', providerStatus: 'failed' } } })).toBe(false)
  })

  it('is false without a provider id', () => {
    expect(isPendingCheckCardPayment({ metadata: {} })).toBe(false)
  })
})

describe('applyCheckCardOutcome', () => {
  const baseParams = {
    check: { id: 'chk-1', store_id: 'store-1', status: 'open' },
    provider: 'mercado_pago' as const,
    providerOrderId: 'MP_1',
  }

  it('finalizes the check when the provider reports processed', async () => {
    ordersRows = [
      { id: 'o1', total: 80, status: 'served', payment_status: 'unpaid' },
      { id: 'o2', total: 20, status: 'served', payment_status: 'unpaid' },
    ]

    await applyCheckCardOutcome({
      ...baseParams,
      currentMetadata: { payment: { providerOrderId: 'MP_1', providerStatus: 'at_terminal', amount: 105, tip: 5 } },
      status: 'processed',
      closedBy: 'user-1',
    })

    expect(records.payments).toHaveLength(2)
    expect(records.payments[0]).toMatchObject({ order_id: 'o1', amount: 85, tip_amount: 5, method: 'card', provider: 'mercado_pago' })
    expect(records.payments[1]).toMatchObject({ order_id: 'o2', amount: 20, tip_amount: 0 })
    expect(records.orderUpdates).toHaveLength(2)
    expect(records.checkUpdates[0]).toMatchObject({ status: 'closed', tip_amount: 5, closed_by: 'user-1' })
    expect(emitMock).toHaveBeenCalledWith('order:status-changed', expect.objectContaining({ type: 'check:closed', check_id: 'chk-1' }))
  })

  it('keeps the check open and only records metadata on a failed payment', async () => {
    ordersRows = [{ id: 'o1', total: 80, status: 'served', payment_status: 'unpaid' }]

    await applyCheckCardOutcome({
      ...baseParams,
      currentMetadata: { payment: { providerOrderId: 'MP_1', providerStatus: 'at_terminal', amount: 80, tip: 0 } },
      status: 'failed',
    })

    expect(records.payments).toHaveLength(0)
    expect(records.orderUpdates).toHaveLength(0)
    expect(records.checkUpdates).toHaveLength(1)
    expect(records.checkUpdates[0].status).toBeUndefined()
    expect(emitMock).not.toHaveBeenCalled()
  })

  it('does not finalize twice when the check is already closed', async () => {
    checksRow = { id: 'chk-1', status: 'closed' }
    ordersRows = [{ id: 'o1', total: 80, status: 'served', payment_status: 'unpaid' }]

    await applyCheckCardOutcome({
      ...baseParams,
      currentMetadata: { payment: { providerOrderId: 'MP_1', providerStatus: 'processed', amount: 80, tip: 0 } },
      status: 'processed',
    })

    expect(records.payments).toHaveLength(0)
    expect(records.orderUpdates).toHaveLength(0)
  })
})
