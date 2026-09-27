import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase/admin'
import { decryptSettings } from '../lib/settings'
import {
  getCardProvider,
  getProviderCredentials,
  getActiveCardProvider,
} from '../services/payments'
import { applyCardPaymentOutcome, enrichOrder } from '../services/payments/apply-outcome'
import type { CardOrderStatus } from '../services/payments/types'

export const webhooksRouter = new Hono()

async function verifySignature(
  body: string,
  signatureHeader: string | undefined,
  clientSecret: string,
  dataId: string | null | undefined,
  xRequestId: string | null | undefined,
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

  const now = Date.now()
  const tsNum = parseInt(ts, 10)
  const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000
  if (Math.abs(now - tsMs) > 300000) return false

  if (!dataId || !xRequestId) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(clientSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  // MP builds the manifest from data.id exactly as it sent it in the query
  // string, so the hash is over the original casing. Order ids are uppercase
  // (ORD01...), but older docs show lowercase and we cannot observe which one
  // a given delivery used — try both. This is not a bypass: every candidate is
  // still HMAC-verified with the store secret, so a forged header still fails.
  const candidates = dataId === dataId.toLowerCase() ? [dataId] : [dataId, dataId.toLowerCase()]

  for (const orderId of candidates) {
    const dataToSign = `id:${orderId};request-id:${xRequestId};ts:${ts};`
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToSign))
    const computed = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    if (computed === receivedHash) {
      console.log(`[mp-point-webhook] Signature OK (casing matched: ${orderId === dataId ? 'as-sent' : 'lowercased'})`)
      return true
    }
  }

  return false
}

async function getOrderByMpOrderId(mpOrderId: string) {
  return supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .filter('metadata->>mpOrderId', 'eq', mpOrderId)
    .single()
}

const STATUS_MAP: Record<string, { orderStatus?: string; paymentStatus?: string; mpStatus: CardOrderStatus }> = {
  'order.created': { mpStatus: 'created' },
  'order.at_terminal': { mpStatus: 'at_terminal' },
  'order.processing': { mpStatus: 'processing' },
  'order.processed': { orderStatus: 'paid', paymentStatus: 'completed', mpStatus: 'processed' },
  'order.failed': { orderStatus: 'cancelled', paymentStatus: 'failed', mpStatus: 'failed' },
  'order.expired': { orderStatus: 'cancelled', paymentStatus: 'failed', mpStatus: 'expired' },
  'order.canceled': { orderStatus: 'cancelled', paymentStatus: 'failed', mpStatus: 'canceled' },
  'order.action_required': { mpStatus: 'action_required' },
  'order.refunded': { orderStatus: 'refunded', paymentStatus: 'refunded', mpStatus: 'refunded' },
}

webhooksRouter.post('/mp-point', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('x-signature')

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

  if (!STATUS_MAP[action]) {
    console.log(`[mp-point-webhook] Unhandled action: ${action}`)
    return c.json({ message: 'Accepted' }, 200)
  }

  const { data: orderData, error: orderError } = await getOrderByMpOrderId(mpOrderId)
  if (orderError || !orderData) {
    console.warn(`[mp-point-webhook] Order not found for mpOrderId=${mpOrderId}`)
    return c.json({ message: 'Accepted' }, 200)
  }

  const storeId = orderData.store_id
  let storeSettings: Record<string, unknown> = {}
  if (storeId) {
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('settings')
      .eq('id', storeId)
      .single()

    storeSettings = decryptSettings((store?.settings as Record<string, unknown>) || {})
  }

  // The signature is recorded but no longer gates the update. MP signs Point/QR
  // notifications with a dedicated webhook key from the developers panel, not
  // the OAuth client secret we have stored, and the docs state QR notifications
  // may not be verifiable with the secret signature at all. Rejecting on it
  // meant every real delivery got 401 and no sale was ever reconciled, while
  // the only surviving path was a 2 second poll at order creation.
  const clientSecret = storeSettings?.mpClientSecret as string | undefined
  if (clientSecret) {
    const valid = await verifySignature(body, signature, clientSecret, c.req.query('data.id'), c.req.header('x-request-id'))
    if (!valid) {
      console.warn(`[mp-point-webhook] signature did not verify for store ${storeId} — continuing, MP API is authoritative`)
    }
  }

  // MP is the only authority on whether money moved. The action in the payload
  // is just a hint that something changed, so ask the provider instead of
  // trusting a value that arrived over an unauthenticated channel.
  const cardProvider = getCardProvider(getActiveCardProvider(storeSettings))
  const credentials = getProviderCredentials(storeSettings)

  let authoritative: CardOrderStatus | undefined
  let mpPaymentDetail: string | undefined
  let mpPaymentStatus: string | undefined

  if (credentials.accessToken) {
    try {
      const payment = await cardProvider.getPayment(mpOrderId, credentials)
      authoritative = payment.status
      mpPaymentDetail = payment.paymentDetail
      mpPaymentStatus = payment.paymentStatus
    } catch (err) {
      console.error(`[mp-point-webhook] provider poll failed for ${mpOrderId}: ${(err as Error).message}`)
      return c.json({ message: 'Accepted' }, 200)
    }
  }

  const mapping = Object.values(STATUS_MAP).find((m) => m.mpStatus === authoritative)
  if (!mapping) {
    console.log(`[mp-point-webhook] No terminal mapping for MP status "${authoritative}" on ${mpOrderId}`)
    return c.json({ message: 'Accepted' }, 200)
  }

  const currentMetadata = (orderData.metadata as Record<string, unknown>) || {}

  if (currentMetadata.mpOrderStatus === mapping.mpStatus) {
    return c.json({ message: 'Already processed' }, 200)
  }

  try {
    await applyCardPaymentOutcome({
      order: orderData,
      currentMetadata,
      provider: getActiveCardProvider(storeSettings),
      providerOrderId: mpOrderId,
      status: mapping.mpStatus,
      detail: mpPaymentDetail || mapping.mpStatus,
      paymentStatusOverride: mpPaymentStatus === 'approved' ? 'completed' : mapping.paymentStatus,
    })
  } catch (err: unknown) {
    console.error(`[mp-point-webhook] Failed to update order: ${(err as Error).message}`)
    return c.json({ message: 'Update failed' }, 500)
  }

  return c.json({ message: 'OK' }, 200)
})

webhooksRouter.post('/clip-pinpad', async (c) => {
  const body = await c.req.text()

  let parsed: { id?: string; origin?: string; event_type?: string }
  try {
    parsed = JSON.parse(body)
  } catch {
    return c.json({ message: 'Invalid JSON' }, 400)
  }

  const { id, origin, event_type } = parsed

  if (!id || origin !== 'pinpad-payments-api' || event_type !== 'PINPAD_INTENT_STATUS_CHANGED') {
    console.warn(`[clip-pinpad-webhook] Rejected payload: ${JSON.stringify(parsed)}`)
    return c.json({ message: 'Invalid event' }, 400)
  }

  const pinpadRequestId = id

  const { data: orderData, error: orderError } = await getOrderByMpOrderId(pinpadRequestId)
  if (orderError || !orderData) {
    console.warn(`[clip-pinpad-webhook] Order not found for pinpadRequestId=${pinpadRequestId}`)
    return c.json({ message: 'Accepted' }, 200)
  }

  const storeId = orderData.store_id
  let storeSettings: Record<string, unknown> = {}
  if (storeId) {
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('settings')
      .eq('id', storeId)
      .single()

    storeSettings = decryptSettings((store?.settings as Record<string, unknown>) || {})
  }

  const provider = getCardProvider('clip')
  const credentials = getProviderCredentials(storeSettings, 'clip')

  // Clip sends no signature — always poll the API as source of truth (idempotent)
  let payment
  try {
    payment = await provider.getPayment(pinpadRequestId, credentials)
  } catch (err: unknown) {
    console.error(`[clip-pinpad-webhook] Failed to poll payment ${pinpadRequestId}: ${(err as Error).message}`)
    return c.json({ message: 'Accepted' }, 200)
  }

  const currentMetadata = (orderData.metadata as Record<string, unknown>) || {}
  const currentStatus = (currentMetadata.payment as { providerStatus?: string } | undefined)?.providerStatus ?? currentMetadata.mpOrderStatus

  if (currentStatus === payment.status) {
    return c.json({ message: 'Already processed' }, 200)
  }

  try {
    await applyCardPaymentOutcome({
      order: orderData,
      currentMetadata,
      provider: 'clip',
      providerOrderId: pinpadRequestId,
      status: payment.status,
      detail: payment.paymentDetail,
    })
  } catch (err: unknown) {
    console.error(`[clip-pinpad-webhook] Failed to update order: ${(err as Error).message}`)
    return c.json({ message: 'Update failed' }, 500)
  }

  return c.json({ message: 'OK' }, 200)
})

export { enrichOrder }
