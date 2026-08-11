import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
      qb.single
        .mockResolvedValueOnce({ data: validOrder, error: null })
        .mockResolvedValueOnce({ data: { settings: { mpClientSecret: 'secret123' } }, error: null })
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

describe('webhooks POST /clip-pinpad', () => {
  const PINPAD_ID = 'pinpad-6a405173-c661-414a-9a8f-ecc77a9afe3f'
  const clipFetch = vi.fn()

  const clipOrder = {
    id: 'order-uuid-123',
    store_id: 'store-uuid',
    status: 'pending',
    payment_status: 'unpaid',
    total: 120,
    customer_id: null,
    applied_promotions: null,
    metadata: {
      mpOrderId: PINPAD_ID,
      mpOrderStatus: 'created',
      payment: { provider: 'clip', providerOrderId: PINPAD_ID, providerStatus: 'created' },
    },
  }

  const VALID_CLIP_PAYLOAD = {
    id: PINPAD_ID,
    origin: 'pinpad-payments-api',
    event_type: 'PINPAD_INTENT_STATUS_CHANGED',
  }

  async function postClipWebhook(body: unknown) {
    const req = new Request('http://localhost/clip-pinpad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return app.fetch(req)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    clipFetch.mockReset()
    clipFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        pinpad_request_id: PINPAD_ID,
        status: 'COMPLETED',
        amount: '120.00',
        amount_paid: '120.00',
        detail: { results: [{ id: 'txn-clip-1', status: 'approved' }] },
      }),
    })
    vi.stubGlobal('fetch', clipFetch)
    qb.single.mockResolvedValue({ data: clipOrder, error: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects events with wrong origin or event_type', async () => {
    const res1 = await postClipWebhook({ id: PINPAD_ID, origin: 'attacker', event_type: 'PINPAD_INTENT_STATUS_CHANGED' })
    expect(res1.status).toBe(400)

    const res2 = await postClipWebhook({ id: PINPAD_ID, origin: 'pinpad-payments-api', event_type: 'OTHER' })
    expect(res2.status).toBe(400)
  })

  it('returns 200 when order is not found', async () => {
    qb.single.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const res = await postClipWebhook(VALID_CLIP_PAYLOAD)
    expect(res.status).toBe(200)
  })

  it('polls the Clip API and marks the order paid on COMPLETED', async () => {
    const res = await postClipWebhook(VALID_CLIP_PAYLOAD)
    expect(res.status).toBe(200)
    expect(clipFetch).toHaveBeenCalledTimes(1)
    const [url] = clipFetch.mock.calls[0]
    expect(url).toContain(`/payment?pinpadRequestId=${PINPAD_ID}`)
    expect(mockOrderBusEmit).toHaveBeenCalledTimes(1)
  })

  it('is idempotent when the order already reflects the polled status', async () => {
    qb.single.mockResolvedValue({
      data: {
        ...clipOrder,
        metadata: {
          mpOrderId: PINPAD_ID,
          mpOrderStatus: 'processed',
          payment: { provider: 'clip', providerOrderId: PINPAD_ID, providerStatus: 'processed' },
        },
      },
      error: null,
    })
    const res = await postClipWebhook(VALID_CLIP_PAYLOAD)
    expect(res.status).toBe(200)
    expect(mockOrderBusEmit).not.toHaveBeenCalled()
  })

  it('accepts without emitting when the Clip API poll fails', async () => {
    clipFetch.mockRejectedValue(new Error('clip unreachable'))
    const res = await postClipWebhook(VALID_CLIP_PAYLOAD)
    expect(res.status).toBe(200)
    expect(mockOrderBusEmit).not.toHaveBeenCalled()
  })

  it('updates metadata + emits for non-terminal statuses', async () => {
    clipFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ pinpad_request_id: PINPAD_ID, status: 'IN_PROGRESS' }),
    })
    const res = await postClipWebhook(VALID_CLIP_PAYLOAD)
    expect(res.status).toBe(200)
    expect(mockOrderBusEmit).toHaveBeenCalledTimes(1)
  })
})
