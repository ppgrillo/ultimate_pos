import { supabaseAdmin } from '../lib/supabase/admin'
import { orderBus } from '../events'
import { round2 } from '@ultimate-pos/shared'
import { buildPaymentMetadata } from './payments/metadata'
import { getCardPaymentOutcome, isTerminalCardStatus } from './payments/status'
import type { CardOrderStatus, CardPaymentProviderName } from './payments/types'

export interface CheckPaymentInfo {
  provider?: CardPaymentProviderName
  providerOrderId?: string
  providerStatus?: CardOrderStatus
  detail?: string
  amount?: number
  tip?: number
}

export interface CheckLike {
  id: string
  store_id: string
  status?: string
  metadata?: unknown
}

/**
 * Reads the pending card-payment state we store on `checks.metadata`. Mirrors
 * `readOrderPayment` on the frontend (dual legacy keys + `payment` object) so a
 * single reader works for both shapes.
 */
export function readCheckPayment(check: { metadata?: unknown }): CheckPaymentInfo {
  const meta = (check.metadata as Record<string, unknown> | null | undefined) || {}
  const payment = (meta.payment as CheckPaymentInfo | undefined) || {}
  return {
    provider: payment.provider,
    providerOrderId: payment.providerOrderId ?? (meta.mpOrderId as string | undefined),
    providerStatus: payment.providerStatus ?? (meta.mpOrderStatus as CardOrderStatus | undefined),
    detail: payment.detail ?? (meta.mpPaymentDetail as string | undefined),
    amount: payment.amount ?? (meta.amount as number | undefined),
    tip: payment.tip ?? (meta.tip as number | undefined),
  }
}

/**
 * A card payment intent is pending while it has a provider id and is not in a
 * terminal provider status. Used to lock re-charging and to block new rounds.
 */
export function isPendingCheckCardPayment(check: { metadata?: unknown }): boolean {
  const info = readCheckPayment(check)
  return Boolean(info.providerOrderId) && !!info.providerStatus && !isTerminalCardStatus(info.providerStatus)
}

export interface ApplyCheckCardOutcomeParams {
  check: CheckLike
  currentMetadata: Record<string, unknown>
  provider: CardPaymentProviderName
  providerOrderId: string
  status: CardOrderStatus
  detail?: string
  /** Set when a POS user drives the finalize (poll); null for webhook-driven. */
  closedBy?: string | null
}

/**
 * Applies a provider payment outcome to a whole check (account close). Unlike a
 * single order, a failed card payment does NOT cancel the check — the operator
 * keeps the account open and can retry with another method. Only a `processed`
 * status marks every payable order paid and closes the check.
 */
export async function applyCheckCardOutcome(
  params: ApplyCheckCardOutcomeParams,
): Promise<void> {
  const { check, currentMetadata, provider, providerOrderId, status, detail, closedBy } = params

  const existingProviderStatus = readCheckPayment({ metadata: currentMetadata }).providerStatus

  const info = readCheckPayment({ metadata: currentMetadata })
  const amount = Number(info.amount || 0)
  const tip = Number(info.tip || 0)

  const metadata = buildPaymentMetadata(currentMetadata, provider, providerOrderId, status, detail || status)
  metadata.amount = amount
  metadata.tip = tip

  const outcome = getCardPaymentOutcome(status)

  if (outcome.orderStatus === 'paid') {
    // Always attempt finalize: it is idempotent and heals a crash between the
    // metadata write and the order/payment/close writes.
    await finalizeCheckPayment(check, metadata, tip, provider, providerOrderId, closedBy ?? null)
    return
  }

  // Fence: never let a terminal check payment regress or be overwritten.
  if (existingProviderStatus && isTerminalCardStatus(existingProviderStatus)) {
    console.log(`[check-payment] Skipping ${existingProviderStatus} -> ${status} for check ${check.id} (terminal)`)
    return
  }

  // Non-terminal (created/at_terminal/processing) or failed: update metadata
  // only. The check stays open so the payment can be retried.
  const { error } = await supabaseAdmin
    .from('checks')
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq('id', check.id)

  if (error) throw new Error(`Failed to update check metadata: ${error.message}`)
}

async function finalizeCheckPayment(
  check: CheckLike,
  metadata: Record<string, unknown>,
  tip: number,
  provider: CardPaymentProviderName,
  providerOrderId: string,
  closedBy: string | null,
): Promise<void> {
  const { data: fresh } = await supabaseAdmin
    .from('checks')
    .select('id, status')
    .eq('id', check.id)
    .single()

  // Idempotency guard: the poll and the webhook can race to finalize.
  if (!fresh || fresh.status === 'closed') return

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, total, status, payment_status')
    .eq('store_id', check.store_id)
    .eq('check_id', check.id)

  const payableOrders = (orders || []).filter(
    (o) => o.status !== 'cancelled' && o.status !== 'refunded',
  )

  let tipAttached = false

  for (const order of payableOrders) {
    if (order.payment_status !== 'paid') {
      const payment: Record<string, unknown> = {
        order_id: order.id,
        amount: Number(order.total || 0),
        method: 'card',
        status: 'completed',
        tip_amount: 0,
        provider,
        reference: providerOrderId,
      }

      if (!tipAttached && tip > 0) {
        payment.amount = round2(Number(order.total || 0) + tip)
        payment.tip_amount = tip
        tipAttached = true
      }

      await supabaseAdmin.from('payments').insert(payment)
    }

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('store_id', check.store_id)
  }

  await supabaseAdmin
    .from('checks')
    .update({
      status: 'closed',
      tip_amount: tip,
      ...(closedBy ? { closed_by: closedBy } : {}),
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata,
    })
    .eq('id', check.id)

  orderBus.emit('order:status-changed', { store_id: check.store_id, type: 'check:closed', check_id: check.id })
}
