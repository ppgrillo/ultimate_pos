import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key)
  }
  return _stripe
}

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? ''
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Plan price cache. The paywall price comes from Stripe (keyed by STRIPE_PRICE_ID)
// and is cached so the /billing/status hot path never does a Stripe round-trip.
const PLAN_PRICE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
let cachedPlanPrice: { amount: number; currency: string } | null = null
let cachedPlanPriceAt = 0

export async function getPlanPrice(): Promise<{ amount: number; currency: string } | null> {
  if (!STRIPE_PRICE_ID) return null
  const now = Date.now()
  if (cachedPlanPrice && now - cachedPlanPriceAt < PLAN_PRICE_TTL_MS) {
    return cachedPlanPrice
  }
  try {
    const price = await getStripe().prices.retrieve(STRIPE_PRICE_ID)
    if (price.unit_amount != null) {
      cachedPlanPrice = { amount: price.unit_amount, currency: price.currency }
      cachedPlanPriceAt = now
    }
  } catch {
    // Keep the last known price; if none yet, return null.
  }
  return cachedPlanPrice
}
