import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mercadoPagoProvider } from './mercadopago.provider'

const mpService = vi.hoisted(() => ({
  createOrder: vi.fn(),
  getOrder: vi.fn(),
  cancelOrder: vi.fn(),
  refundOrder: vi.fn(),
  listTerminals: vi.fn(),
  setPdvMode: vi.fn(),
}))

vi.mock('../mp-point', () => ({ mpService }))

const CREDENTIALS = { accessToken: 'test_access_token_123' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('mercadoPagoProvider', () => {
  it('exposes the correct provider name', () => {
    expect(mercadoPagoProvider.name).toBe('mercado_pago')
  })

  it('createPayment delegates to mpService.createOrder and normalizes the response', async () => {
    mpService.createOrder.mockResolvedValue({
      id: 'ORD_MP_001',
      status: 'created',
      transactions: {
        payments: [{ id: 'PAY_001', status: 'created', status_detail: 'created' }],
      },
    })
    mpService.getOrder.mockResolvedValue({ id: 'ORD_MP_001', status: 'created' })

    const result = await mercadoPagoProvider.createPayment({
      totalAmount: 120,
      externalReference: 'order-uuid-1',
      description: '3 items',
      terminalId: 'TERM_001',
    }, CREDENTIALS)

    expect(mpService.createOrder).toHaveBeenCalledWith('test_access_token_123', {
      totalAmount: 120,
      externalReference: 'order-uuid-1',
      description: '3 items',
      terminalId: 'TERM_001',
    })
    expect(result).toEqual({
      providerOrderId: 'ORD_MP_001',
      status: 'created',
      paymentDetail: 'created',
      paymentStatus: 'created',
    })
  })

  it('createPayment applies a default description when omitted', async () => {
    mpService.createOrder.mockResolvedValue({ id: 'ORD_MP_001', status: 'created' })
    mpService.getOrder.mockResolvedValue({ id: 'ORD_MP_001', status: 'created' })

    await mercadoPagoProvider.createPayment({
      totalAmount: 50,
      externalReference: 'ref-2',
      terminalId: 'TERM_001',
    }, CREDENTIALS)

    const params = mpService.createOrder.mock.calls[0][1]
    expect(params.description).toBe('Ultimate POS payment')
  })

  describe('confirming the new order can be read back', () => {
    const sale = {
      totalAmount: 10,
      externalReference: 'ref-guard',
      terminalId: 'TERM_001',
    }
    const created = { id: 'ORD_MP_GUARD', status: 'created' }
    const mpNotFound = Object.assign(new Error('Order not found.'), {
      status: 404,
      code: 'order_not_found',
    })

    it('lets the sale through when the order reads back', async () => {
      mpService.createOrder.mockResolvedValue(created)
      mpService.getOrder.mockResolvedValue(created)

      await expect(mercadoPagoProvider.createPayment(sale, CREDENTIALS)).resolves.toMatchObject({
        providerOrderId: 'ORD_MP_GUARD',
      })
    })

    it('refuses to charge when the token cannot read the order it just created', async () => {
      mpService.createOrder.mockResolvedValue(created)
      mpService.getOrder.mockRejectedValue(mpNotFound)

      // Two attempts: the first rides out replication lag, the second is conclusive.
      await expect(mercadoPagoProvider.createPayment(sale, CREDENTIALS)).rejects.toThrow(
        /misma aplicacion/,
      )
      expect(mpService.getOrder).toHaveBeenCalledTimes(2)
    })

    it('still allows the sale when the order is merely not visible yet', async () => {
      mpService.createOrder.mockResolvedValue(created)
      mpService.getOrder.mockRejectedValueOnce(mpNotFound).mockResolvedValueOnce(created)

      await expect(mercadoPagoProvider.createPayment(sale, CREDENTIALS)).resolves.toMatchObject({
        providerOrderId: 'ORD_MP_GUARD',
      })
    })

    it('allows the sale when the verification itself fails, rather than blocking the register', async () => {
      mpService.createOrder.mockResolvedValue(created)
      mpService.getOrder.mockRejectedValue(
        Object.assign(new Error('Too many requests'), { status: 429, code: 'rate_limit' }),
      )

      await expect(mercadoPagoProvider.createPayment(sale, CREDENTIALS)).resolves.toMatchObject({
        providerOrderId: 'ORD_MP_GUARD',
      })
      expect(mpService.getOrder).toHaveBeenCalledTimes(1)
    })
  })

  it('getPayment returns normalized status + payment detail', async () => {
    mpService.getOrder.mockResolvedValue({
      id: 'ORD_MP_001',
      status: 'processed',
      transactions: {
        payments: [{ id: 'PAY_001', status: 'processed', status_detail: 'accredited' }],
      },
    })

    const result = await mercadoPagoProvider.getPayment('ORD_MP_001', CREDENTIALS)

    expect(mpService.getOrder).toHaveBeenCalledWith('test_access_token_123', 'ORD_MP_001')
    expect(result).toEqual({
      providerOrderId: 'ORD_MP_001',
      status: 'processed',
      paymentDetail: 'accredited',
      paymentStatus: 'processed',
    })
  })

  it('cancelPayment delegates to mpService.cancelOrder', async () => {
    mpService.cancelOrder.mockResolvedValue({ id: 'ORD_MP_001', status: 'canceled' })

    await mercadoPagoProvider.cancelPayment('ORD_MP_001', CREDENTIALS)

    expect(mpService.cancelOrder).toHaveBeenCalledWith('test_access_token_123', 'ORD_MP_001')
  })

  it('refundPayment delegates to mpService.refundOrder', async () => {
    mpService.refundOrder.mockResolvedValue({ id: 'ORD_MP_001', status: 'refunded' })

    await mercadoPagoProvider.refundPayment('ORD_MP_001', CREDENTIALS, 'PAY_001', 120)

    expect(mpService.refundOrder).toHaveBeenCalledWith('test_access_token_123', 'ORD_MP_001', 'PAY_001', 120)
  })

  it('listTerminals reads the wrapped data shape and normalizes operating_mode', async () => {
    mpService.listTerminals.mockResolvedValue({
      data: {
        terminals: [{ id: 'TERM_001', name: 'Point Smart', model: 'Point Smart 2', operating_mode: 'PDV' }],
      },
    })

    const result = await mercadoPagoProvider.listTerminals!(CREDENTIALS)

    expect(mpService.listTerminals).toHaveBeenCalledWith('test_access_token_123')
    expect(result).toEqual([{ id: 'TERM_001', name: 'Point Smart', model: 'Point Smart 2', operating_mode: 'PDV' }])
  })

  it('setupTerminal delegates to mpService.setPdvMode', async () => {
    mpService.setPdvMode.mockResolvedValue(undefined)

    await mercadoPagoProvider.setupTerminal!('TERM_001', CREDENTIALS)

    expect(mpService.setPdvMode).toHaveBeenCalledWith('test_access_token_123', 'TERM_001')
  })
})
