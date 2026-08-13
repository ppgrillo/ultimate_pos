import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase/admin'
import { badRequest } from '../middleware/error'
import { getStripe, STRIPE_PRICE_ID, FRONTEND_URL } from '../services/stripe'
import { getBillingInfo, syncSubscriptionToBilling } from '../lib/billing'

export const billingRouter = new Hono()

billingRouter.use('*', authMiddleware)

async function resolveStripeCustomerId(userId: string): Promise<string | null> {
  const { data: billing } = await supabaseAdmin
    .from('billing')
    .select('stripe_customer_id')
    .eq('profile_id', userId)
    .maybeSingle()

  if (billing?.stripe_customer_id) return billing.stripe_customer_id

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.email) {
    const customers = await getStripe().customers.list({ email: profile.email, limit: 1 })
    return customers.data[0]?.id ?? null
  }

  return null
}

billingRouter.post('/checkout', async (c) => {
  const userId = c.get('userId')

  if (!STRIPE_PRICE_ID) throw new Error('STRIPE_PRICE_ID is not set')

  const info = await getBillingInfo(userId)
  if (info.hasAccess) {
    return c.json({ status: info.status, url: null, alreadyActive: true })
  }

  const stripe = getStripe()
  const customerId = await resolveStripeCustomerId(userId)

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: userId,
    ...(customerId
      ? { customer: customerId }
      : { customer_email: profile?.email ?? undefined }),
    subscription_data: {
      metadata: { profile_id: userId },
    },
    metadata: { profile_id: userId },
    success_url: `${FRONTEND_URL}/dashboard?checkout=success`,
    cancel_url: `${FRONTEND_URL}/dashboard?checkout=cancelled`,
  })

  return c.json({ url: session.url })
})

billingRouter.get('/status', async (c) => {
  const userId = c.get('userId')
  return c.json(await getBillingInfo(userId))
})

billingRouter.post('/portal', async (c) => {
  const userId = c.get('userId')

  const customerId = await resolveStripeCustomerId(userId)
  if (!customerId) throw badRequest('No Stripe customer found — subscribe first')

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${FRONTEND_URL}/dashboard`,
  })

  return c.json({ url: session.url })
})

/**
 * Safety net: re-syncs billing state from Stripe (source of truth) so a user
 * never stays locked out when a webhook was missed or a payment just succeeded.
 */
billingRouter.post('/refresh', async (c) => {
  const userId = c.get('userId')

  const customerId = await resolveStripeCustomerId(userId)
  if (customerId) {
    const stripe = getStripe()
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 })
    const active = subs.data
      .filter((s) => s.status !== 'canceled' && s.status !== 'incomplete_expired')
      .sort((a, b) => b.created - a.created)[0]

    if (active) {
      await syncSubscriptionToBilling(active, userId)
    }
  }

  return c.json(await getBillingInfo(userId))
})
