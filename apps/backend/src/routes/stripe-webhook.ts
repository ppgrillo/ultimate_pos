import { Hono } from 'hono'
import type Stripe from 'stripe'
import { getStripe, STRIPE_WEBHOOK_SECRET } from '../services/stripe'
import { syncSubscriptionToBilling } from '../lib/billing'

export const stripeWebhookRouter = new Hono()

async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
  profileIdOverride?: string | null,
) {
  await syncSubscriptionToBilling(subscription, profileIdOverride)
}

stripeWebhookRouter.post('/stripe', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('stripe-signature')

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return c.json({ error: 'Webhook not configured' }, 500)
  }

  if (!signature) {
    return c.json({ error: 'Missing stripe-signature header' }, 400)
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.warn(`[stripe-webhook] Signature verification failed: ${(err as Error).message}`)
    return c.json({ error: 'Invalid signature' }, 400)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const profileId =
          (session.client_reference_id as string) || session.metadata?.profile_id || null
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
          await handleSubscriptionEvent(subscription, profileId)
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionEvent(subscription)
        break
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const parentSubscription = invoice.parent?.subscription_details?.subscription
        const legacySubscription = (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription
        const subscriptionId =
          typeof parentSubscription === 'string'
            ? parentSubscription
            : parentSubscription?.id ?? (typeof legacySubscription === 'string' ? legacySubscription : legacySubscription?.id)
        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
          await handleSubscriptionEvent(subscription)
        }
        break
      }

      default:
        // Ignore unrelated events
        break
    }
  } catch (err) {
    console.error(`[stripe-webhook] Failed to process ${event.type}: ${(err as Error).message}`)
    return c.json({ error: 'Webhook handler failed' }, 500)
  }

  return c.json({ received: true })
})
