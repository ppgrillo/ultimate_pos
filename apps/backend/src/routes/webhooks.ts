import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase/admin'
import { orderBus } from '../events'
import { terminalRegistry } from '../services/terminal'
import type { WebhookEvent, TerminalPaymentMetadata } from '@ultimate-pos/shared'

export const webhooksRouter = new Hono()

async function enrichOrder(order: Record<string, unknown>) {
  const customer = order.customer as { name?: string } | null
  return {
    ...order,
    customer_name: customer?.name || null,
    customer: undefined,
    metadata: order.metadata || {},
  }
}

webhooksRouter.post('/terminal', async (c) => {
  const bodyText = await c.req.text()
  const signature = c.req.header('x-signature')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(bodyText)
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }

  for (const provider of terminalRegistry.getAll()) {
    let event: WebhookEvent | null = null

    if (provider.verifyWebhook && provider.parseWebhook) {
      const valid = await provider.verifyWebhook({ body: bodyText, signature })
      if (!valid) continue
      event = provider.parseWebhook(parsed)
    } else if (provider.parseWebhook) {
      event = provider.parseWebhook(parsed)
    }

    if (!event) continue

    const orderResult = await supabaseAdmin
      .from('orders')
      .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
      .filter('metadata->terminalPayment->providerId', 'eq', event.providerPaymentId)
      .single()

    if (orderResult.error || !orderResult.data) {
      console.warn(`[webhook] Order not found for ${event.provider} paymentId=${event.providerPaymentId}`)
      return c.json({ message: 'Accepted' }, 200)
    }

    const currentMetadata = (orderResult.data.metadata as Record<string, unknown>) || {}
    const currentTp = currentMetadata.terminalPayment as TerminalPaymentMetadata | undefined

    if (currentTp?.normalizedStatus === event.normalizedStatus) {
      return c.json({ message: 'Already processed' }, 200)
    }

    const metadata = {
      ...currentMetadata,
      terminalPayment: {
        provider: event.provider,
        providerId: event.providerPaymentId,
        providerStatus: event.providerStatus,
        normalizedStatus: event.normalizedStatus,
      } satisfies TerminalPaymentMetadata,
    }

    const updateData: Record<string, unknown> = {
      metadata,
      updated_at: new Date().toISOString(),
    }

    if (event.normalizedStatus === 'paid') {
      updateData.status = 'paid'
      updateData.payment_status = 'paid'
    } else if (event.normalizedStatus === 'failed' || event.normalizedStatus === 'expired' || event.normalizedStatus === 'cancelled') {
      updateData.status = 'cancelled'
      updateData.payment_status = 'unpaid'
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderResult.data.id)

    if (updateError) {
      console.error(`[webhook] Failed to update order: ${updateError.message}`)
      return c.json({ message: 'Update failed' }, 500)
    }

    if (event.normalizedStatus === 'paid' || event.normalizedStatus === 'failed' || event.normalizedStatus === 'expired' || event.normalizedStatus === 'cancelled') {
      const paymentStatus = event.normalizedStatus === 'paid' ? 'completed' : 'failed'
      await supabaseAdmin
        .from('payments')
        .update({ status: paymentStatus })
        .eq('order_id', orderResult.data.id)
    }

    if (event.normalizedStatus === 'paid' && orderResult.data.customer_id) {
      const { data: cust } = await supabaseAdmin
        .from('customers')
        .select('total_visits, total_spent')
        .eq('id', orderResult.data.customer_id)
        .single()

      if (cust) {
        await supabaseAdmin
          .from('customers')
          .update({
            total_visits: (cust.total_visits || 0) + 1,
            total_spent: (Number(cust.total_spent) || 0) + Number(orderResult.data.total),
          })
          .eq('id', orderResult.data.customer_id)
      }
    }

    const { data: fullOrder } = await supabaseAdmin
      .from('orders')
      .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
      .eq('id', orderResult.data.id)
      .single()

    if (fullOrder) {
      const enriched = await enrichOrder(fullOrder)
      orderBus.emit('order:status-changed', enriched)
    }

    return c.json({ message: 'OK' }, 200)
  }

  console.log(`[webhook] Unhandled webhook from unknown provider`)
  return c.json({ message: 'Accepted' }, 200)
})
