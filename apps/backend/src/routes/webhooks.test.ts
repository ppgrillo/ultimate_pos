import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockOrderBusEmit, qb, mockUpdate, mockGetPayment } = vi.hoisted(() => {
  const mockOrderBusEmit = vi.fn()
  const mockUpdate = vi.fn((_payload: Record<string, unknown>) => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  }))
  const mockGetPayment = vi.fn()

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
        update: mockUpdate,
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })),
      })),
      single,
      select,
      eq,
    }
  }

  return { mockOrderBusEmit, qb: buildQb(), mockUpdate, mockGetPayment }
})

vi.mock('../events', () => ({
  orderBus: { emit: mockOrderBusEmit, on: vi.fn(), off: vi.fn() },
}))

vi.mock('../lib/supabase/admin', () => ({
  supabaseAdmin: qb,
}))

vi.mock('../services/payments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/payments')>()
  return {
    ...actual,
    getCardProvider: (name: Parameters<typeof actual.getCardProvider>[0]) =>
      name === 'mercado_pago' ? { getPayment: mockGetPayment } : actual.getCardProvider(name),
  }
})

import { webhooksRouter } from './webhooks'

const app = webhooksRouter

async function postWebhook(body: unknown, signature?: string) {
  const dataId = (body as { data?: { id?: string } })?.data?.id
  const url = dataId ? `http://localhost/mp-point?data.id=${dataId}` : 'http://localhost/mp-point'
  const req = new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': 'req-uuid-555',
      ...(signature ? { 'x-signature': signature } : {}),
    },
    body: JSON.stringify(body),
  })
  return app.fetch(req)
}

async function signManifest(
  secret: string,
  dataId: string,
  requestId: string,
  ts: number,
): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`id:${dataId};request-id:${requestId};ts:${ts};`))
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `ts=${ts},v1=${hex}`
}

const UPPERCASE_ORDER_ID = 'ORD01M3DHNDZQ76N1E973V5W922Z5'

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
    mockGetPayment.mockResolvedValue({
      providerOrderId: 'ORD_MP_001',
      status: 'created',
      paymentDetail: undefined,
      paymentStatus: undefined,
    })
  })

  describe('signature validation', () => {
    it('accepts webhook without MP_CLIENT_SECRET (dev mode)', async () => {
      qb.single.mockResolvedValue({ data: validOrder, error: null })
      const res = await postWebhook(VALID_PAYLOAD)
      expect(res.status).toBe(200)
    })

    it('no longer blocks the update when the signature does not verify', async () => {
      qb.single
        .mockResolvedValueOnce({ data: validOrder, error: null })
        .mockResolvedValueOnce({ data: { settings: { mpClientSecret: 'secret123', mpPointAccessToken: 'tok' } }, error: null })
      const res = await postWebhook(VALID_PAYLOAD, 'ts=9999999999,v1=invalid')
      expect(res.status).toBe(200)
    })

    // The suite had no test where a *correct* signature is accepted, so the
    // manifest could be built wrong and every test still passed. MP answered
    // 401 on 100% of real deliveries.
    it('accepts a valid signature over the original-cased data.id', async () => {
      const payload = { ...VALID_PAYLOAD, data: { id: UPPERCASE_ORDER_ID } }
      const ts = Math.floor(Date.now() / 1000)
      qb.single
        .mockResolvedValueOnce({ data: { ...validOrder, metadata: { mpOrderId: UPPERCASE_ORDER_ID, mpOrderStatus: 'created' } }, error: null })
        .mockResolvedValueOnce({ data: { settings: { mpClientSecret: 'secret123' } }, error: null })
      const sig = await signManifest('secret123', UPPERCASE_ORDER_ID, 'req-uuid-555', ts)
      const res = await postWebhook(payload, sig)
      expect(res.status).toBe(200)
    })

    it('accepts a valid signature when MP signed the lowercased data.id', async () => {
      const payload = { ...VALID_PAYLOAD, data: { id: UPPERCASE_ORDER_ID } }
      const ts = Math.floor(Date.now() / 1000)
      qb.single
        .mockResolvedValueOnce({ data: { ...validOrder, metadata: { mpOrderId: UPPERCASE_ORDER_ID, mpOrderStatus: 'created' } }, error: null })
        .mockResolvedValueOnce({ data: { settings: { mpClientSecret: 'secret123' } }, error: null })
      const sig = await signManifest('secret123', UPPERCASE_ORDER_ID.toLowerCase(), 'req-uuid-555', ts)
      const res = await postWebhook(payload, sig)
      expect(res.status).toBe(200)
    })
  })

  // The endpoint now treats the notification purely as a trigger and asks the
  // provider for the real state, so these cover the two properties that matter:
  // a genuine sale gets reconciled, and a forged payload cannot invent one.
  describe('MP is the source of truth', () => {
    const settings = { mpClientSecret: 'secret123', mpPointAccessToken: 'tok' }

    it('marks the order paid when MP reports processed, even with an unverifiable signature', async () => {
      mockGetPayment.mockResolvedValue({
        providerOrderId: 'ORD_MP_001',
        status: 'processed',
        paymentDetail: 'accredited',
        paymentStatus: 'processed',
      })
      qb.single
        .mockResolvedValueOnce({ data: validOrder, error: null })
        .mockResolvedValueOnce({ data: { settings }, error: null })
      const res = await postWebhook(VALID_PAYLOAD, 'ts=1,v1=deadbeef')
      expect(res.status).toBe(200)
      expect(mockGetPayment).toHaveBeenCalledWith('ORD_MP_001', expect.objectContaining({ accessToken: 'tok' }))
      const updates = mockUpdate.mock.calls.map((c) => c[0] as Record<string, unknown>)
      expect(updates.some((u) => u.status === 'paid' && u.payment_status === 'paid')).toBe(true)
    })

    it('ignores a forged order.processed when MP still reports the order as created', async () => {
      mockGetPayment.mockResolvedValue({
        providerOrderId: 'ORD_MP_001',
        status: 'created',
        paymentDetail: undefined,
        paymentStatus: undefined,
      })
      qb.single
        .mockResolvedValueOnce({ data: validOrder, error: null })
        .mockResolvedValueOnce({ data: { settings }, error: null })
      const res = await postWebhook(VALID_PAYLOAD, 'ts=1,v1=deadbeef')
      expect(res.status).toBe(200)
      const updates = mockUpdate.mock.calls.map((c) => c[0] as Record<string, unknown>)
      expect(updates.some((u) => u.status === 'paid')).toBe(false)
    })

    it('cancels the order when MP reports expired, ignoring the processed action', async () => {
      mockGetPayment.mockResolvedValue({
        providerOrderId: 'ORD_MP_001',
        status: 'expired',
        paymentDetail: 'expired',
        paymentStatus: 'expired',
      })
      qb.single
        .mockResolvedValueOnce({ data: validOrder, error: null })
        .mockResolvedValueOnce({ data: { settings }, error: null })
      const res = await postWebhook(VALID_PAYLOAD, 'ts=1,v1=deadbeef')
      expect(res.status).toBe(200)
      const updates = mockUpdate.mock.calls.map((c) => c[0] as Record<string, unknown>)
      expect(updates.some((u) => u.status === 'cancelled')).toBe(true)
      expect(updates.some((u) => u.status === 'paid')).toBe(false)
    })

    it('accepts without mutating when the provider poll fails', async () => {
      mockGetPayment.mockRejectedValue(new Error('mp unreachable'))
      qb.single
        .mockResolvedValueOnce({ data: validOrder, error: null })
        .mockResolvedValueOnce({ data: { settings }, error: null })
      const res = await postWebhook(VALID_PAYLOAD)
      expect(res.status).toBe(200)
      expect(mockUpdate).not.toHaveBeenCalled()
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

    it('does not regress a terminal order when a late non-terminal event arrives out of order', async () => {
      qb.single.mockResolvedValue({
        data: { ...validOrder, metadata: { mpOrderId: 'ORD_MP_001', mpOrderStatus: 'canceled' } },
        error: null,
      })
      const res = await postWebhook({ ...VALID_PAYLOAD, action: 'order.processing' })
      expect(res.status).toBe(200)
      expect(mockOrderBusEmit).not.toHaveBeenCalled()
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

  it('does not regress a terminal (canceled) order when a late non-terminal event arrives out of order', async () => {
    qb.single.mockResolvedValue({
      data: {
        ...clipOrder,
        metadata: {
          mpOrderId: PINPAD_ID,
          mpOrderStatus: 'canceled',
          payment: { provider: 'clip', providerOrderId: PINPAD_ID, providerStatus: 'canceled' },
        },
      },
      error: null,
    })
    clipFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ pinpad_request_id: PINPAD_ID, status: 'IN_PROGRESS' }),
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
