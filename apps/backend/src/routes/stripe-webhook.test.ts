import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

const { constructEventMock, retrieveMock, syncMock } = vi.hoisted(() => {
  const constructEventMock = vi.fn()
  const retrieveMock = vi.fn()
  const syncMock = vi.fn()
  return { constructEventMock, retrieveMock, syncMock }
})

vi.mock('../services/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: retrieveMock },
  }),
  STRIPE_PRICE_ID: 'price_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  FRONTEND_URL: 'http://localhost:3000',
}))

vi.mock('../lib/billing', () => ({
  syncSubscriptionToBilling: syncMock,
  getBillingInfo: vi.fn(),
  upsertBillingRecord: vi.fn(),
  mapStripeStatus: (s: string) => s,
}))

import { stripeWebhookRouter } from './stripe-webhook'

const app = new Hono().route('/webhooks', stripeWebhookRouter)

function post(body: unknown, signature?: string) {
  return app.fetch(
    new Request('http://localhost/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'stripe-signature': signature } : {}),
      },
      body: JSON.stringify(body),
    }),
  )
}

const fakeSubscription = {
  id: 'sub_123',
  status: 'active',
  cancel_at_period_end: false,
  customer: 'cus_123',
  items: {
    data: [
      { current_period_start: 1700000000, current_period_end: 1702592000 },
    ],
  },
}

describe('stripe webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when the stripe-signature header is missing', async () => {
    const res = await post({ type: 'customer.subscription.updated' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when signature verification fails', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('bad signature')
    })
    const res = await post({ type: 'customer.subscription.updated' }, 't=1,v1=bad')
    expect(res.status).toBe(400)
  })

  it('syncs the subscription on customer.subscription.updated', async () => {
    constructEventMock.mockReturnValue({ type: 'customer.subscription.updated', data: { object: fakeSubscription } })
    syncMock.mockResolvedValue('profile-1')

    const res = await post({ type: 'customer.subscription.updated' }, 't=1,v1=ok')
    expect(res.status).toBe(200)
    expect(syncMock).toHaveBeenCalledWith(fakeSubscription, undefined)
  })

  it('syncs the subscription with a profile override on checkout.session.completed', async () => {
    constructEventMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'profile-99',
          subscription: 'sub_new',
          customer: 'cus_new',
        },
      },
    })
    retrieveMock.mockResolvedValue(fakeSubscription)
    syncMock.mockResolvedValue('profile-99')

    const res = await post({ type: 'checkout.session.completed' }, 't=1,v1=ok')
    expect(res.status).toBe(200)
    expect(retrieveMock).toHaveBeenCalledWith('sub_new')
    expect(syncMock).toHaveBeenCalledWith(fakeSubscription, 'profile-99')
  })

  it('syncs the subscription referenced by invoice.paid via parent subscription_details', async () => {
    constructEventMock.mockReturnValue({
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_123',
          parent: { subscription_details: { subscription: 'sub_inv' } },
        },
      },
    })
    retrieveMock.mockResolvedValue(fakeSubscription)
    syncMock.mockResolvedValue('profile-1')

    const res = await post({ type: 'invoice.paid' }, 't=1,v1=ok')
    expect(res.status).toBe(200)
    expect(retrieveMock).toHaveBeenCalledWith('sub_inv')
    expect(syncMock).toHaveBeenCalledWith(fakeSubscription, undefined)
  })

  it('falls back to invoice.subscription for older API versions', async () => {
    constructEventMock.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_124',
          subscription: 'sub_legacy',
        },
      },
    })
    retrieveMock.mockResolvedValue(fakeSubscription)
    syncMock.mockResolvedValue('profile-1')

    const res = await post({ type: 'invoice.payment_failed' }, 't=1,v1=ok')
    expect(res.status).toBe(200)
    expect(retrieveMock).toHaveBeenCalledWith('sub_legacy')
    expect(syncMock).toHaveBeenCalledWith(fakeSubscription, undefined)
  })

  it('ignores unrelated events', async () => {
    constructEventMock.mockReturnValue({ type: 'product.created', data: { object: { id: 'prod_x' } } })
    const res = await post({ type: 'product.created' }, 't=1,v1=ok')
    expect(res.status).toBe(200)
    expect(syncMock).not.toHaveBeenCalled()
  })
})
