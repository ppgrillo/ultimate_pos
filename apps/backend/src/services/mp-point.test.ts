import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mpProvider } from './mp-point'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const CREDENTIALS = { accessToken: 'test_access_token_123', terminalId: 'TERM_TEST_001' }
const ORDER_ID = 'ORD_MOCK_001'

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }
}

function buildMpResponse(overrides?: Record<string, unknown>) {
  return {
    id: ORDER_ID,
    status: 'created',
    external_reference: 'internal-order-uuid',
    transactions: {
      payments: [{ id: 'PAY_001', status: 'created', payment_method: { id: 'master', type: 'credit_card', description: 'Mastercard' }, amount: '120.00', status_detail: 'created' }],
    },
    config: { point: { terminal_id: 'TERM_TEST_001', print_on_terminal: 'no_ticket' } },
    date_created: new Date().toISOString(),
    date_last_updated: new Date().toISOString(),
    status_detail: 'created',
    ...overrides,
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('mpProvider.createPayment', () => {
  it('calls POST /v1/orders with correct payload and returns normalized response', async () => {
    mockFetch.mockResolvedValue(mockResponse(buildMpResponse()))

    const result = await mpProvider.createPayment(CREDENTIALS, {
      totalAmount: 120.0,
      externalReference: 'internal-order-uuid',
      description: '3 items',
      terminalId: 'TERM_TEST_001',
    })

    expect(result.providerId).toBe(ORDER_ID)
    expect(result.providerStatus).toBe('created')
    expect(result.normalizedStatus).toBe('created')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/v1/orders')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Authorization']).toBe('Bearer test_access_token_123')
    expect(opts.headers['X-Idempotency-Key']).toBeDefined()

    const body = JSON.parse(opts.body)
    expect(body.type).toBe('point')
    expect(body.external_reference).toBe('internal-order-uuid')
    expect(body.config.point.terminal_id).toBe('TERM_TEST_001')
  })

  it('throws when MP returns error', async () => {
    mockFetch.mockResolvedValue(mockResponse({ message: 'invalid terminal' }, 400))
    await expect(mpProvider.createPayment(CREDENTIALS, {
      totalAmount: 50,
      externalReference: 'ref-2',
      terminalId: 'INVALID',
    })).rejects.toThrow('invalid terminal')
  })
})

describe('mpProvider.getPayment', () => {
  it('returns normalized response with processed status mapping', async () => {
    mockFetch.mockResolvedValue(mockResponse(buildMpResponse({ status: 'processed' })))

    const result = await mpProvider.getPayment(CREDENTIALS, ORDER_ID)
    expect(result.normalizedStatus).toBe('paid')
    expect(result.providerStatus).toBe('processed')
  })
})

describe('mpProvider.cancelPayment', () => {
  it('calls POST /v1/orders/:id/cancel', async () => {
    mockFetch.mockResolvedValue(mockResponse(buildMpResponse({ status: 'canceled' })))
    const result = await mpProvider.cancelPayment(CREDENTIALS, ORDER_ID)
    expect(result.normalizedStatus).toBe('cancelled')
  })
})

describe('mpProvider.refundPayment', () => {
  it('calls POST /v1/orders/:id/refund', async () => {
    mockFetch.mockResolvedValue(mockResponse(buildMpResponse({ status: 'refunded' })))
    const result = await mpProvider.refundPayment(CREDENTIALS, ORDER_ID)
    expect(result.providerId).toBe(ORDER_ID)
  })
})

describe('mpProvider.listTerminals', () => {
  it('returns normalized terminal list', async () => {
    mockFetch.mockResolvedValue(mockResponse({
      terminals: [{ id: 'TERM_1', name: 'Test', model: 'Point Smart 2', operating_mode: 'PDV' }],
    }))
    const result = await mpProvider.listTerminals(CREDENTIALS)
    expect(result).toHaveLength(1)
    expect(result[0].operatingMode).toBe('PDV')
  })
})

describe('mpProvider.parseWebhook', () => {
  it('parses order.processed action', () => {
    const event = mpProvider.parseWebhook!({
      action: 'order.processed',
      data: { id: 'ORD_MP_001' },
    })
    expect(event).not.toBeNull()
    expect(event!.providerPaymentId).toBe('ORD_MP_001')
    expect(event!.normalizedStatus).toBe('paid')
    expect(event!.provider).toBe('mercadopago')
  })

  it('returns null for unknown action', () => {
    const event = mpProvider.parseWebhook!({ action: 'order.unknown', data: { id: 'ORD_001' } })
    expect(event).toBeNull()
  })

  it('returns null when missing data.id', () => {
    const event = mpProvider.parseWebhook!({ action: 'order.processed' })
    expect(event).toBeNull()
  })
})
