import { supabaseAdmin } from '../../lib/supabase/admin'
import { orderBus } from '../../events'
import { revertPromotionUsageIfNeeded } from '../../lib/promotion-usage'
import { buildPaymentMetadata } from './metadata'
import { getCardPaymentOutcome } from './status'
import type { CardOrderStatus, CardPaymentProviderName } from './types'

export interface ApplyCardPaymentOutcomeParams {
  order: Record<string, unknown> & {
    id: string
    store_id: string
    total: number | string
    customer_id?: string | null
    applied_promotions?: Array<{ promotion_id?: string }> | null
  }
  currentMetadata: Record<string, unknown>
  provider: CardPaymentProviderName
  providerOrderId: string
  status: CardOrderStatus
  detail?: string
  /** Optional resolved payments.status (e.g. MP maps 'approved' → 'completed'). */
  paymentStatusOverride?: string
}

export function enrichOrder(order: Record<string, unknown>) {
  const customer = order.customer as { name?: string } | null
  return {
    ...order,
    customer_name: customer?.name || null,
    customer: undefined,
    metadata: (order.metadata as Record<string, unknown> | undefined) || {},
  }
}

/**
 * Applies a provider payment outcome to an order (metadata dual-write, order +
 * payments status, customer stats, loyalty/promotions and realtime emit).
 * Idempotent per status — non-terminal statuses only update metadata + emit.
 */
export async function applyCardPaymentOutcome(
  params: ApplyCardPaymentOutcomeParams,
): Promise<void> {
  const { order, currentMetadata, provider, providerOrderId, status, detail, paymentStatusOverride } = params
  const outcome = getCardPaymentOutcome(status)

  const metadata = buildPaymentMetadata(
    {
      ...currentMetadata,
      ...((outcome.orderStatus === 'cancelled' || outcome.orderStatus === 'refunded') ? { promotionUsageReverted: true } : {}),
    },
    provider,
    providerOrderId,
    status,
    detail || status,
  )

  const updateData: Record<string, unknown> = {
    metadata,
    updated_at: new Date().toISOString(),
  }

  if (outcome.orderStatus) {
    updateData.status = outcome.orderStatus
    if (outcome.orderStatus === 'paid') {
      updateData.payment_status = 'paid'
    } else if (outcome.paymentStatus === 'failed') {
      updateData.payment_status = 'unpaid'
    } else if (outcome.paymentStatus === 'refunded') {
      updateData.payment_status = 'refunded'
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', order.id)

  if (updateError) {
    throw new Error(`Failed to update order: ${updateError.message}`)
  }

  if (outcome.paymentStatus) {
    const paymentStatus = paymentStatusOverride ?? outcome.paymentStatus
    await supabaseAdmin
      .from('payments')
      .update({ status: paymentStatus })
      .eq('order_id', order.id)
  }

  if (outcome.orderStatus === 'paid' && order.customer_id) {
    const { data: cust } = await supabaseAdmin
      .from('customers')
      .select('total_visits, total_spent')
      .eq('id', order.customer_id)
      .single()

    if (cust) {
      await supabaseAdmin
        .from('customers')
        .update({
          total_visits: (cust.total_visits || 0) + 1,
          total_spent: (Number(cust.total_spent) || 0) + Number(order.total),
        })
        .eq('id', order.customer_id)
    }
  }

  if ((outcome.orderStatus === 'cancelled' || outcome.orderStatus === 'refunded') && order.customer_id) {
    const { data: cust } = await supabaseAdmin
      .from('customers')
      .select('total_visits, total_spent')
      .eq('id', order.customer_id)
      .single()

    if (cust) {
      await supabaseAdmin
        .from('customers')
        .update({
          total_visits: Math.max(0, (cust.total_visits || 0) - 1),
          total_spent: Math.max(0, (Number(cust.total_spent) || 0) - Number(order.total)),
        })
        .eq('id', order.customer_id)
    }
  }

  const { processMpLoyalty, reverseMpLoyalty } = await import('../../routes/orders')
  if (outcome.orderStatus === 'paid') {
    await processMpLoyalty(supabaseAdmin, order.id, order.store_id).catch(() => {})
  } else if (outcome.orderStatus === 'cancelled' || outcome.orderStatus === 'refunded') {
    await revertPromotionUsageIfNeeded(
      order.id,
      currentMetadata,
      order.applied_promotions || [],
    ).catch(() => {})

    await reverseMpLoyalty(supabaseAdmin, order.id).catch(() => {})
  }

  const { data: fullOrder } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .eq('id', order.id)
    .single()

  if (fullOrder) {
    orderBus.emit('order:status-changed', enrichOrder(fullOrder))
  }
}
