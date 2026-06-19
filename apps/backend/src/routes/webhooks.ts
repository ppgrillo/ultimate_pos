import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase/admin'
import { orderBus } from '../events'
import { mpService } from '../services/mp-point'

export const webhooksRouter = new Hono()

async function verifySignature(
  body: string,
  signatureHeader: string | undefined,
  clientSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !clientSecret) return false

  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, p) => {
    const [key, value] = p.trim().split('=')
    if (key && value) acc[key] = value
    return acc
  }, {})

  const ts = parts['ts']
  const receivedHash = parts['v1']

  if (!ts || !receivedHash) return false

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(ts, 10)) > 300) return false

  const parsed = JSON.parse(body)
  const orderId = parsed?.data?.id
  const requestId = parsed?.id

  if (!orderId || !requestId) return false

  const dataToSign = `id=${orderId};request-id=${requestId};ts=${ts};`

  const encoder = new TextEncoder()
  const keyData = encoder.encode(clientSecret)
  const messageData = encoder.encode(dataToSign)

  const key = await crypto.subtle
    .importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const computed = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return computed === receivedHash
}

async function getOrderByMpOrderId(mpOrderId: string) {
  return supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .filter('metadata->>mpOrderId', 'eq', mpOrderId)
    .single()
}

async function enrichOrder(order: Record<string, unknown>) {
  const customer = order.customer as { name?: string } | null
  return {
    ...order,
    customer_name: customer?.name || null,
    customer: undefined,
    metadata: order.metadata || {},
  }
}

const STATUS_MAP: Record<string, { orderStatus?: string; paymentStatus?: string; mpStatus: string }> = {
  'order.created': { mpStatus: 'created' },
  'order.at_terminal': { mpStatus: 'at_terminal' },
  'order.processing': { mpStatus: 'processing' },
  'order.processed': { orderStatus: 'paid', paymentStatus: 'completed', mpStatus: 'processed' },
  'order.failed': { orderStatus: 'cancelled', paymentStatus: 'failed', mpStatus: 'failed' },
  'order.expired': { orderStatus: 'cancelled', paymentStatus: 'failed', mpStatus: 'expired' },
  'order.canceled': { orderStatus: 'cancelled', paymentStatus: 'failed', mpStatus: 'canceled' },
  'order.action_required': { mpStatus: 'action_required' },
  'order.refunded': { paymentStatus: 'refunded', mpStatus: 'refunded' },
}

webhooksRouter.post('/mp-point', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('x-signature')
  const clientSecret = process.env.MP_CLIENT_SECRET

  if (clientSecret) {
    const valid = await verifySignature(body, signature, clientSecret)
    if (!valid) {
      console.warn('[mp-point-webhook] Invalid signature')
      return c.json({ message: 'Invalid signature' }, 401)
    }
  } else {
    console.warn('[mp-point-webhook] MP_CLIENT_SECRET not set — skipping signature validation')
  }

  let parsed: { action: string; data: { id: string }; id: string }
  try {
    parsed = JSON.parse(body)
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }

  const { action, data } = parsed
  const mpOrderId = data?.id

  if (!action || !mpOrderId) {
    return c.json({ message: 'Missing action or data.id' }, 400)
  }

  const mapping = STATUS_MAP[action]
  if (!mapping) {
    console.log(`[mp-point-webhook] Unhandled action: ${action}`)
    return c.json({ message: 'Accepted' }, 200)
  }

  const { data: orderData, error: orderError } = await getOrderByMpOrderId(mpOrderId)
  if (orderError || !orderData) {
    console.warn(`[mp-point-webhook] Order not found for mpOrderId=${mpOrderId}`)
    return c.json({ message: 'Accepted' }, 200)
  }

  const currentMetadata = (orderData.metadata as Record<string, unknown>) || {}

  if (currentMetadata.mpOrderStatus === mapping.mpStatus) {
    return c.json({ message: 'Already processed' }, 200)
  }

  const metadata = {
    ...currentMetadata,
    mpOrderStatus: mapping.mpStatus,
    mpStatusDetail: mapping.mpStatus,
  }

  const updateData: Record<string, unknown> = {
    metadata,
    updated_at: new Date().toISOString(),
  }

  if (mapping.orderStatus) {
    updateData.status = mapping.orderStatus
    if (mapping.orderStatus === 'paid') {
      updateData.payment_status = 'paid'
    }
  }

  if (mapping.paymentStatus === 'failed') {
    updateData.payment_status = 'unpaid'
  }

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', orderData.id)

  if (updateError) {
    console.error(`[mp-point-webhook] Failed to update order: ${updateError.message}`)
    return c.json({ message: 'Update failed' }, 500)
  }

  if (mapping.paymentStatus) {
    const paymentUpdate: Record<string, unknown> = { status: mapping.paymentStatus }
    await supabaseAdmin
      .from('payments')
      .update(paymentUpdate)
      .eq('order_id', orderData.id)
  }

  if (mapping.orderStatus === 'paid' && orderData.customer_id) {
    const { data: cust } = await supabaseAdmin
      .from('customers')
      .select('total_visits, total_spent')
      .eq('id', orderData.customer_id)
      .single()

    if (cust) {
      await supabaseAdmin
        .from('customers')
        .update({
          total_visits: (cust.total_visits || 0) + 1,
          total_spent: (Number(cust.total_spent) || 0) + Number(orderData.total),
        })
        .eq('id', orderData.customer_id)
    }
  }

  const { data: fullOrder } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .eq('id', orderData.id)
    .single()

  if (fullOrder) {
    const enriched = await enrichOrder(fullOrder)
    orderBus.emit('order:status-changed', enriched)
  }

  return c.json({ message: 'OK' }, 200)
})
