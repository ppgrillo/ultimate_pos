import type Stripe from 'stripe'
import { supabaseAdmin } from './supabase/admin'

export type BillingStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

export interface BillingInfo {
  hasAccess: boolean
  status: BillingStatus
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

const ACTIVE_STATUSES: BillingStatus[] = ['active', 'trialing', 'past_due']

export async function getBillingInfo(profileId: string): Promise<BillingInfo> {
  const { data } = await supabaseAdmin
    .from('billing')
    .select('status, current_period_start, current_period_end, cancel_at_period_end')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!data) {
    return {
      hasAccess: false,
      status: 'inactive',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }
  }

  const status = data.status as BillingStatus
  const periodEnd = data.current_period_end ? new Date(data.current_period_end).getTime() : null
  const notExpired = periodEnd === null || periodEnd > Date.now()

  const hasAccess = ACTIVE_STATUSES.includes(status) && notExpired

  return {
    hasAccess,
    status,
    currentPeriodStart: data.current_period_start ?? null,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
  }
}

export function mapStripeStatus(status: Stripe.Subscription.Status): BillingStatus {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    case 'unpaid':
      return 'unpaid'
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'inactive'
  }
}

export interface SubscriptionSyncInput {
  profileId: string
  customerId: string
  subscriptionId: string
  status: Stripe.Subscription.Status
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  planAmount: number | null
  planCurrency: string | null
}

export async function upsertBillingRecord(input: SubscriptionSyncInput) {
  return supabaseAdmin.from('billing').upsert(
    {
      profile_id: input.profileId,
      stripe_customer_id: input.customerId,
      stripe_subscription_id: input.subscriptionId,
      status: mapStripeStatus(input.status),
      current_period_start: input.currentPeriodStart,
      current_period_end: input.currentPeriodEnd,
      cancel_at_period_end: input.cancelAtPeriodEnd,
      plan_amount: input.planAmount,
      plan_currency: input.planCurrency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' },
  )
}

/**
 * Resolves the owning profile for a Stripe customer and persists the latest
 * subscription state into the `billing` table. Used by the webhook and the
 * `/billing/refresh` safety net.
 */
export async function syncSubscriptionToBilling(
  subscription: Stripe.Subscription,
  profileIdOverride?: string | null,
): Promise<string | null> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? ''

  let profileId = profileIdOverride ?? subscription.metadata?.profile_id ?? null
  if (!profileId && customerId) {
    const { data } = await supabaseAdmin
      .from('billing')
      .select('profile_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    profileId = data?.profile_id ?? null
  }
  if (!profileId) {
    console.warn(`[billing] No profile found for subscription ${subscription.id}`)
    return null
  }

  const item = subscription.items?.data?.[0]

  await upsertBillingRecord({
    profileId,
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: item?.current_period_start
      ? new Date(item.current_period_start * 1000).toISOString()
      : null,
    currentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    planAmount: item?.price?.unit_amount ?? null,
    planCurrency: item?.price?.currency ?? null,
  })

  return profileId
}
