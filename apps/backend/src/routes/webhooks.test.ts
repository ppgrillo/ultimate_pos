import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOrderBusEmit, qb } = vi.hoisted(() => {
  const mockOrderBusEmit = vi.fn()

  function buildQb(resolvers?: { single?: unknown }) {
    const single = resolvers?.single !== undefined
      ? vi.fn().mockResolvedValue(resolvers.single)
      : vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })

    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({
      filter: vi.fn(() => ({ single })),
      eq,
      single,
      order: vi.fn(() => ({ limit: vi.fn(() => ({ single })) })),
      gte: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ single })) })) })),
      in: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ single })) })) })),
    }))

    return {
      from: vi.fn(() => ({
        select,
        update: vi.fn(() => ({ eq })),
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })),
      })),
      single,
      select,
      eq,
    }
  }

  return { mockOrderBusEmit, qb: buildQb() }
})

vi.mock('../events', () => ({
  orderBus: { emit: mockOrderBusEmit, on: vi.fn(), off: vi.fn() },
}))

vi.mock('../lib/supabase/admin', () => ({
  supabaseAdmin: qb,
}))

import { webhooksRouter } from './webhooks'

const app = webhooksRouter

async function postWebhook(body: unknown, signature?: string) {
  const req = new Request('http://localhost/mp-point', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'x-signature': signature } : {}),
    },
    body: JSON.stringify(body),
  })
  return app.fetch(req)
}

const validOrder = {
  id: 'order-uuid-123',
  store_id: 'store-uuid',
  status: 'pending',
  payment_status: 'unpaid',
  total: 120,
  customer_id: null,
  metadata: { mpOrderId: 'ORD_MP_001', mpOrderStatus: 'created' },
}

const VALID_PAYLOAD = {
  action: 'order.processed',
  api_version: 'v1',
  data: { id: 'ORD_MP_001' },
  id: 'webhook-uuid-999',
  live_mode: true,
  type: 'order',
  user_id: 'user-123',
}

describe('webhooks POST /mp-point', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MP_CLIENT_SECRET
  })

  describe('signature validation', () => {
    it('accepts webhook without MP_CLIENT_SECRET (dev mode)', async () => {
      qb.single.mockResolvedValue({ data: validOrder, error: null })
      const res = await postWebhook(VALID_PAYLOAD)
      expect(res.status).toBe(200)
    })

    it('rejects when signature is wrong', async () => {
      process.env.MP_CLIENT_SECRET = 'secret123'
      const res = await postWebhook(VALID_PAYLOAD, 'ts=9999999999,v1=invalid')
      expect(res.status).toBe(401)
    })
  })

  describe('status handling', () => {
    it.each([
      ['order.processed'],
      ['order.failed'],
      ['order.expired'],
      ['order.at_terminal'],
      ['order.processing'],
    ])('handles action %s', async (action) => {
      qb.single.mockResolvedValue({ data: validOrder, error: null })
      const res = await postWebhook({ ...VALID_PAYLOAD, action })
      expect(res.status).toBe(200)
    })

    it('returns 200 for unhandled actions', async () => {
      const res = await postWebhook({ ...VALID_PAYLOAD, action: 'order.unknown' })
      expect(res.status).toBe(200)
    })
  })

  describe('order lookup', () => {
    it('returns 200 when order not found', async () => {
      qb.single.mockResolvedValue({ data: null, error: { message: 'not found' } })
      const res = await postWebhook(VALID_PAYLOAD)
      expect(res.status).toBe(200)
    })

    it('handles duplicate events idempotently', async () => {
      qb.single.mockResolvedValue({
        data: { ...validOrder, metadata: { mpOrderId: 'ORD_MP_001', mpOrderStatus: 'processed' } },
        error: null,
      })
      const res = await postWebhook(VALID_PAYLOAD)
      expect(res.status).toBe(200)
    })
  })
})
