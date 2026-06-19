import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mpService, type MPOrderResponse } from './mp-point'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const ACCESS_TOKEN = 'test_access_token_123'
const TERMINAL_ID = 'TERM_TEST_001'
const ORDER_ID = 'ORD_MOCK_001'

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('mpService.createOrder', () => {
  it('calls POST /v1/orders with correct payload', async () => {
    const mpResponse: MPOrderResponse = {
      id: ORDER_ID,
      status: 'created',
      external_reference: 'internal-order-uuid',
      transactions: {
        payments: [
          {
            id: 'PAY_001',
            status: 'created',
            payment_method: { id: 'master', type: 'credit_card', description: 'Mastercard' },
            amount: '120.00',
            status_detail: 'created',
          },
        ],
      },
      config: {
        point: {
          terminal_id: TERMINAL_ID,
          print_on_terminal: 'no_ticket',
        },
      },
      date_created: new Date().toISOString(),
      date_last_updated: new Date().toISOString(),
      status_detail: 'created',
    }
    mockFetch.mockResolvedValue(mockResponse(mpResponse))

    const result = await mpService.createOrder(ACCESS_TOKEN, {
      totalAmount: 120.0,
      externalReference: 'internal-order-uuid',
      description: '3 items',
      terminalId: TERMINAL_ID,
    })

    expect(result.id).toBe(ORDER_ID)
    expect(result.status).toBe('created')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/v1/orders')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Authorization']).toBe(`Bearer ${ACCESS_TOKEN}`)
    expect(opts.headers['X-Idempotency-Key']).toBeDefined()

    const body = JSON.parse(opts.body)
    expect(body.type).toBe('point')
    expect(body.external_reference).toBe('internal-order-uuid')
    expect(body.config.point.terminal_id).toBe(TERMINAL_ID)
    expect(body.config.point.print_on_terminal).toBe('no_ticket')
    expect(body.transactions.payments).toHaveLength(1)
    expect(body.transactions.payments[0].amount).toBe('120.00')
    expect(body.description).toBe('3 items')
  })

  it('throws when MP returns error', async () => {
    mockFetch.mockResolvedValue(mockResponse({ message: 'invalid terminal' }, 400))

    await expect(
      mpService.createOrder(ACCESS_TOKEN, {
        totalAmount: 50,
        externalReference: 'ref-2',
        terminalId: 'INVALID',
      }),
    ).rejects.toThrow('invalid terminal')
  })
})

describe('mpService.getOrder', () => {
  it('returns order status', async () => {
    const mpResponse: MPOrderResponse = {
      id: ORDER_ID,
      status: 'processed',
      external_reference: 'ref-1',
      transactions: {
        payments: [
          {
            id: 'PAY_001',
            status: 'processed',
            payment_method: { id: 'visa', type: 'credit_card', description: 'Visa' },
            amount: '120.00',
            status_detail: 'accredited',
          },
        ],
      },
      config: {
        point: {
          terminal_id: TERMINAL_ID,
          print_on_terminal: 'no_ticket',
        },
      },
      date_created: new Date().toISOString(),
      date_last_updated: new Date().toISOString(),
      status_detail: 'processed',
    }
    mockFetch.mockResolvedValue(mockResponse(mpResponse))

    const result = await mpService.getOrder(ACCESS_TOKEN, ORDER_ID)

    expect(result.status).toBe('processed')
    expect(result.transactions.payments[0].id).toBe('PAY_001')
  })
})

describe('mpService.cancelOrder', () => {
  it('calls POST /v1/orders/:id/cancel', async () => {
    mockFetch.mockResolvedValue(mockResponse({ id: ORDER_ID, status: 'canceled' }))

    const result = await mpService.cancelOrder(ACCESS_TOKEN, ORDER_ID)

    expect(result.status).toBe('canceled')
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain(`/v1/orders/${ORDER_ID}/cancel`)
    expect(opts.method).toBe('POST')
  })
})

describe('mpService.refundOrder', () => {
  it('calls POST /v1/orders/:id/refund', async () => {
    mockFetch.mockResolvedValue(mockResponse({ id: ORDER_ID, status: 'refunded' }))

    const result = await mpService.refundOrder(ACCESS_TOKEN, ORDER_ID)

    expect(result.status).toBe('refunded')
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain(`/v1/orders/${ORDER_ID}/refund`)
    expect(opts.method).toBe('POST')
  })
})

describe('mpService.listTerminals', () => {
  it('calls GET /terminals/v1/list', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ terminals: [{ id: TERMINAL_ID, name: 'Test Terminal', model: 'Point Smart 2', operating_mode: 'PDV' }] }),
    )

    const result = await mpService.listTerminals(ACCESS_TOKEN)

    expect(result.terminals).toHaveLength(1)
    expect(result.terminals[0].id).toBe(TERMINAL_ID)
    expect(result.terminals[0].operating_mode).toBe('PDV')
  })
})
