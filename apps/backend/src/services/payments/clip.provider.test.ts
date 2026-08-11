import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { clipProvider } from './clip.provider'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const CREDENTIALS = { accessToken: 'clip_api_key_123', clientSecret: 'clip_api_secret_456' }
const PINPAD_REQUEST_ID = 'pinpad-6a405173-c661-414a-9a8f-ecc77a9afe3f'

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

afterEach(() => {
  delete process.env.PUBLIC_API_URL
})

describe('clipProvider', () => {
  it('exposes the correct provider name', () => {
    expect(clipProvider.name).toBe('clip')
  })

  describe('createPayment', () => {
    it('posts a PinPad intent with correct body + basic auth and maps pinpad_request_id', async () => {
      mockFetch.mockResolvedValue(mockResponse({ pinpad_request_id: PINPAD_REQUEST_ID }))

      const result = await clipProvider.createPayment({
        totalAmount: 120.5,
        externalReference: 'order-uuid-1',
        description: '3 items',
        terminalId: 'CLIP-TERM-001',
      }, CREDENTIALS)

      expect(result.providerOrderId).toBe(PINPAD_REQUEST_ID)
      expect(result.status).toBe('at_terminal')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.payclip.io/f2f/pinpad/v1/payment')
      expect(opts.method).toBe('POST')
      expect(opts.headers['Authorization']).toBe(`Basic ${Buffer.from('clip_api_key_123:clip_api_secret_456').toString('base64')}`)

      const body = JSON.parse(opts.body)
      expect(body.amount).toBe('120.50')
      expect(body.tip_amount).toBe('0.00')
      expect(body.reference).toBe('order-uuid-1')
      expect(body.serial_number_pos).toBe('CLIP-TERM-001')
      expect(body.webhook_url).toBeUndefined()
      expect(body.preferences).toMatchObject({
        is_auto_return_enabled: true,
        is_tip_enabled: false,
        is_msi_enabled: false,
        is_mci_enabled: false,
        is_dcc_enabled: false,
        is_retry_enabled: false,
        is_auto_print_receipt_enabled: false,
        is_split_payment_enabled: false,
        redirect_package_name: 'com.payclip.blaze.client.app',
      })
    })

    it('includes webhook_url derived from PUBLIC_API_URL when configured', async () => {
      process.env.PUBLIC_API_URL = 'https://api.example.com/'
      mockFetch.mockResolvedValue(mockResponse({ pinpad_request_id: PINPAD_REQUEST_ID }))

      await clipProvider.createPayment({
        totalAmount: 50,
        externalReference: 'ref-2',
        terminalId: 'CLIP-TERM-001',
      }, CREDENTIALS)

      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body)
      expect(body.webhook_url).toBe('https://api.example.com/webhooks/clip-pinpad')
    })

    it('translates device-unavailable 400 errors with a clear message', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        code: 'ERR10_04',
        name: 'STORING PAYMENT - DEVICE UNAVAILABLE',
        message: 'The Clip terminal is either offline, powered off, or the Pinpad application is closed',
      }, 400))

      await expect(
        clipProvider.createPayment({
          totalAmount: 50,
          externalReference: 'ref-3',
          terminalId: 'OFFLINE',
        }, CREDENTIALS),
      ).rejects.toMatchObject({
        code: 'ERR10_04',
        status: 400,
        message: expect.stringContaining('offline'),
      })
    })

    it('throws when credentials are missing', async () => {
      await expect(
        clipProvider.createPayment({
          totalAmount: 50,
          externalReference: 'ref-4',
          terminalId: 'CLIP-TERM-001',
        }, { accessToken: '', clientSecret: '' }),
      ).rejects.toThrow('Clip API key and secret are required')
    })
  })

  describe('getPayment', () => {
    it('maps COMPLETED to processed and extracts detail', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        pinpad_request_id: PINPAD_REQUEST_ID,
        status: 'COMPLETED',
        amount: '120.50',
        amount_paid: '120.50',
        detail: {
          results: [{
            id: 'txn-abc-123',
            type: 'pos',
            entry_mode: 'CHIP',
            installments: 1,
            status: 'approved',
          }],
        },
      }))

      const result = await clipProvider.getPayment(PINPAD_REQUEST_ID, CREDENTIALS)

      expect(result).toEqual({
        providerOrderId: PINPAD_REQUEST_ID,
        status: 'processed',
        paymentStatus: 'approved',
        paymentDetail: 'approved',
        transactionId: 'txn-abc-123',
        paidAmount: 120.5,
      })

      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain(`/payment?pinpadRequestId=${PINPAD_REQUEST_ID}`)
      expect(opts.method).toBe('GET')
      expect(opts.headers['Pinpad-Include-Detail']).toBe('true')
    })

    it.each([
      ['CANCELLED', 'canceled'],
      ['CANCELED', 'canceled'],
      ['DECLINED', 'failed'],
      ['EXPIRED', 'expired'],
      ['IN_PROGRESS', 'processing'],
      ['PENDING', 'processing'],
      ['COMPLETED', 'processed'],
      ['APPROVED', 'processed'],
      ['unknown-status', 'processing'],
    ])('maps Clip status %s to %s', async (clipStatus, expected) => {
      mockFetch.mockResolvedValue(mockResponse({ pinpad_request_id: PINPAD_REQUEST_ID, status: clipStatus }))

      const result = await clipProvider.getPayment(PINPAD_REQUEST_ID, CREDENTIALS)
      expect(result.status).toBe(expected)
    })

    it('promotes to processed when detail reports approved even without a top-level status', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        pinpad_request_id: PINPAD_REQUEST_ID,
        amount: '120.50',
        amount_paid: '120.50',
        detail: { results: [{ id: 'txn-xyz', status: 'approved' }] },
      }))

      const result = await clipProvider.getPayment(PINPAD_REQUEST_ID, CREDENTIALS)
      expect(result.status).toBe('processed')
      expect(result.paymentStatus).toBe('approved')
      expect((result as { transactionId?: string }).transactionId).toBe('txn-xyz')
    })
  })

  describe('cancelPayment', () => {
    it('deletes the pinpad request', async () => {
      mockFetch.mockResolvedValue(mockResponse({}, 200))

      await clipProvider.cancelPayment(PINPAD_REQUEST_ID, CREDENTIALS)

      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe(`https://api.payclip.io/f2f/pinpad/v1/payment/${PINPAD_REQUEST_ID}`)
      expect(opts.method).toBe('DELETE')
    })

    it('maps terminal-already-owns failures to cannot_cancel_order', async () => {
      mockFetch.mockResolvedValue(mockResponse({ code: 'PINPAD_INTENT_ALREADY_PICKED_UP', message: 'terminal busy' }, 400))

      await expect(clipProvider.cancelPayment(PINPAD_REQUEST_ID, CREDENTIALS)).rejects.toMatchObject({
        code: 'cannot_cancel_order',
      })
    })
  })

  describe('refundPayment', () => {
    it('polls the payment then refunds the transaction via the Refunds API', async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse({
          pinpad_request_id: PINPAD_REQUEST_ID,
          status: 'COMPLETED',
          amount: '120.50',
          amount_paid: '120.50',
          detail: { results: [{ id: 'txn-abc-123', status: 'approved' }] },
        }))
        .mockResolvedValueOnce(mockResponse({}, 200))

      await clipProvider.refundPayment(PINPAD_REQUEST_ID, CREDENTIALS, undefined, 120.5)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      const [refundUrl, refundOpts] = mockFetch.mock.calls[1]
      expect(refundUrl).toBe('https://api.payclip.com/refunds')
      expect(refundOpts.method).toBe('POST')
      const body = JSON.parse(refundOpts.body)
      expect(body).toEqual({
        amount: 120.5,
        reason: 'Reembolso desde Ultimate POS',
        reference: { type: 'transaction', id: 'txn-abc-123' },
      })
    })

    it('uses the provided transaction id and amount when given', async () => {
      mockFetch
        .mockResolvedValueOnce(mockResponse({ pinpad_request_id: PINPAD_REQUEST_ID, status: 'COMPLETED', amount: '80.00' }))
        .mockResolvedValueOnce(mockResponse({}, 200))

      await clipProvider.refundPayment(PINPAD_REQUEST_ID, CREDENTIALS, 'txn-provided', 80)

      const [, refundOpts] = mockFetch.mock.calls[1]
      const body = JSON.parse(refundOpts.body)
      expect(body.reference.id).toBe('txn-provided')
      expect(body.amount).toBe(80)
    })

    it('throws when no transaction id can be resolved', async () => {
      mockFetch.mockResolvedValue(mockResponse({ pinpad_request_id: PINPAD_REQUEST_ID, status: 'COMPLETED' }))

      await expect(
        clipProvider.refundPayment(PINPAD_REQUEST_ID, CREDENTIALS),
      ).rejects.toThrow('No Clip transaction id found for refund')
    })
  })

  describe('listTerminals', () => {
    it('normalizes the devices/status response', async () => {
      mockFetch.mockResolvedValue(mockResponse({
        data: [
          { serial_number: 'CLIP-SER-001', name: 'PinPad 1', model: 'Clip PinPad', status: 'ACTIVE' },
          { serial_number: 'CLIP-SER-002', name: 'PinPad 2', status: 'INACTIVE' },
        ],
      }))

      const result = await clipProvider.listTerminals!(CREDENTIALS)

      expect(result).toEqual([
        { id: 'CLIP-SER-001', name: 'PinPad 1', model: 'Clip PinPad', operatingMode: 'ACTIVE' },
        { id: 'CLIP-SER-002', name: 'PinPad 2', model: undefined, operatingMode: 'INACTIVE' },
      ])

      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toContain('/devices/status')
      expect(opts.method).toBe('GET')
    })
  })

  it('setupTerminal is a no-op for Clip', async () => {
    await expect(clipProvider.setupTerminal!('any', CREDENTIALS)).resolves.toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
