import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { errorHandler } from '../middleware/error'

const USER_ID = '11111111-1111-1111-1111-111111111111'

const { fromMock, getBillingInfoMock, syncMock, stripeMock } = vi.hoisted(() => {
  const fromMock = vi.fn()
  const getBillingInfoMock = vi.fn()
  const syncMock = vi.fn()
  const stripeMock = {
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    customers: { list: vi.fn() },
    subscriptions: { list: vi.fn(), retrieve: vi.fn() },
    prices: { retrieve: vi.fn() },
  }
  return { fromMock, getBillingInfoMock, syncMock, stripeMock }
})

vi.mock('../lib/supabase/admin', () => ({
  supabaseAdmin: { from: fromMock },
}))

vi.mock('../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('userId', USER_ID)
    c.set('storeId', '22222222-2222-2222-2222-222222222222')
    c.set('role', 'admin')
    await next()
  },
}))

vi.mock('../lib/billing', () => ({
  getBillingInfo: getBillingInfoMock,
  syncSubscriptionToBilling: syncMock,
}))

vi.mock('../services/stripe', () => ({
  getStripe: () => stripeMock,
  STRIPE_PRICE_ID: 'price_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  FRONTEND_URL: 'http://localhost:3000',
}))

import { billingRouter } from './billing'

const app = new Hono().route('/billing', billingRouter)
app.onError(errorHandler)

function billingQuery(result: { data: any; error: any }) {
  const query: any = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    select: vi.fn(() => query),
    then: (resolve: (value: { data: any; error: any }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

describe('billing routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /status', () => {
    it('returns access info', async () => {
      getBillingInfoMock.mockResolvedValue({
        hasAccess: false,
        status: 'inactive',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      })
      fromMock.mockImplementation(() => billingQuery({ data: null, error: null }))
      stripeMock.prices.retrieve.mockResolvedValue({ unit_amount: 30000, currency: 'mxn' })

      const res = await app.fetch(new Request('http://localhost/billing/status'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({
        hasAccess: false,
        status: 'inactive',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        plan: { amount: 30000, currency: 'mxn' },
        priceId: 'price_123',
      })
      expect(getBillingInfoMock).toHaveBeenCalledWith(USER_ID)
    })

    it('enriches status with the Stripe plan when a subscription exists', async () => {
      getBillingInfoMock.mockResolvedValue({
        hasAccess: true,
        status: 'active',
        currentPeriodStart: null,
        currentPeriodEnd: '2026-09-13T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      })
      fromMock.mockImplementation((table: string) => {
        if (table === 'billing') {
          return billingQuery({ data: { stripe_subscription_id: 'sub_123' }, error: null })
        }
        return billingQuery({ data: null, error: null })
      })
      stripeMock.subscriptions.retrieve.mockResolvedValue({
        cancel_at_period_end: true,
        items: {
          data: [
            {
              current_period_start: 1754150400,
              current_period_end: 1756742400,
              price: { unit_amount: 100, currency: 'mxn' },
            },
          ],
        },
      })

      const res = await app.fetch(new Request('http://localhost/billing/status'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.plan).toEqual({ amount: 100, currency: 'mxn' })
      expect(body.cancelAtPeriodEnd).toBe(true)
      expect(body.currentPeriodStart).toBe(new Date(1754150400 * 1000).toISOString())
      expect(body.currentPeriodEnd).toBe(new Date(1756742400 * 1000).toISOString())
    })
  })

  describe('POST /checkout', () => {
    it('creates a checkout session when user has no access', async () => {
      getBillingInfoMock.mockResolvedValue({ hasAccess: false, status: 'inactive', currentPeriodEnd: null })
      fromMock.mockImplementation((table: string) => {
        if (table === 'billing') {
          return billingQuery({ data: null, error: null })
        }
        if (table === 'profiles') {
          return billingQuery({ data: { email: 'owner@test.com' }, error: null })
        }
        return billingQuery({ data: null, error: null })
      })
      stripeMock.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/xyz' })
      stripeMock.customers.list.mockResolvedValue({ data: [] })

      const res = await app.fetch(
        new Request('http://localhost/billing/checkout', { method: 'POST' }),
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.url).toBe('https://checkout.stripe.com/xyz')

      const call = stripeMock.checkout.sessions.create.mock.calls[0][0]
      expect(call.mode).toBe('subscription')
      expect(call.line_items).toEqual([{ price: 'price_123', quantity: 1 }])
      expect(call.allow_promotion_codes).toBeUndefined()
      expect(call.client_reference_id).toBe(USER_ID)
      expect(call.subscription_data.metadata.profile_id).toBe(USER_ID)
      expect(call.success_url).toBe('http://localhost:3000/dashboard?checkout=success')
      expect(call.cancel_url).toBe('http://localhost:3000/dashboard?checkout=cancelled')
    })

    it('does not create a checkout when the user already has access', async () => {
      getBillingInfoMock.mockResolvedValue({ hasAccess: true, status: 'active', currentPeriodEnd: null })

      const res = await app.fetch(
        new Request('http://localhost/billing/checkout', { method: 'POST' }),
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.alreadyActive).toBe(true)
      expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
    })
  })

  describe('POST /portal', () => {
    it('returns a billing portal URL for an existing Stripe customer', async () => {
      fromMock.mockImplementation((table: string) => {
        if (table === 'billing') {
          return billingQuery({ data: { stripe_customer_id: 'cus_123' }, error: null })
        }
        return billingQuery({ data: null, error: null })
      })
      stripeMock.billingPortal.sessions.create.mockResolvedValue({ url: 'https://billing.stripe.com/abc' })

      const res = await app.fetch(
        new Request('http://localhost/billing/portal', { method: 'POST' }),
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.url).toBe('https://billing.stripe.com/abc')
      expect(stripeMock.billingPortal.sessions.create.mock.calls[0][0].customer).toBe('cus_123')
    })

    it('rejects with 400 when no Stripe customer exists', async () => {
      fromMock.mockImplementation(() => billingQuery({ data: null, error: null }))

      const res = await app.fetch(
        new Request('http://localhost/billing/portal', { method: 'POST' }),
      )

      expect(res.status).toBe(400)
    })
  })

  describe('POST /refresh', () => {
    it('syncs the active subscription and returns fresh access info', async () => {
      getBillingInfoMock.mockResolvedValue({ hasAccess: true, status: 'active', currentPeriodEnd: null })
      fromMock.mockImplementation((table: string) => {
        if (table === 'billing') {
          return billingQuery({ data: { stripe_customer_id: 'cus_123' }, error: null })
        }
        return billingQuery({ data: null, error: null })
      })
      stripeMock.subscriptions.list.mockResolvedValue({
        data: [
          { id: 'sub_old', status: 'canceled', created: 100 },
          { id: 'sub_new', status: 'active', created: 200 },
        ],
      })

      const res = await app.fetch(
        new Request('http://localhost/billing/refresh', { method: 'POST' }),
      )

      expect(res.status).toBe(200)
      expect(syncMock).toHaveBeenCalledWith({ id: 'sub_new', status: 'active', created: 200 }, USER_ID)
      expect(getBillingInfoMock).toHaveBeenCalledWith(USER_ID)
    })
  })
})
