import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../middleware/auth'
import { requireAccess } from '../middleware/requireAccess'
import { supabaseAdmin } from '../lib/supabase/admin'
import { notFound, badRequest } from '../middleware/error'
import { SignJWT } from 'jose'
import type { SelfCheckoutStation } from '@ultimate-pos/shared'
import { encryptSettings, decryptSettings } from '../lib/settings'
import { compressImageForUpload } from '../lib/image'
import { resolveKitchenWorkflow } from '@ultimate-pos/shared'
import {
  getCardProvider,
  getProviderCredentials,
  getActiveCardProvider,
  cardProviderDisplayName,
} from '../services/payments'
import type { CardPaymentProviderName } from '../services/payments/types'

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']
const MAX_LOGO_SIZE = 10 * 1024 * 1024

function resolveProviderParam(
  value: string | undefined,
  fallback: CardPaymentProviderName,
): CardPaymentProviderName {
  if (value === 'clip' || value === 'mercado_pago') return value
  return fallback
}

export const storesRouter = new Hono()

storesRouter.use('*', authMiddleware, requireAccess)

storesRouter.get('/current', async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single()

  if (error || !data) throw notFound('Store not found')

  const safe = { ...data }
  if (safe.settings && typeof safe.settings === 'object') {
    const s = { ...(safe.settings as Record<string, unknown>) }
    delete s.mpPointAccessToken
    delete s.mpClientSecret
    delete s.clipApiKey
    delete s.clipApiSecret
    safe.settings = s as typeof safe.settings
  }

  return c.json(safe)
})

storesRouter.post('/upload-logo', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const body = await c.req.parseBody()
  const file = body['file']
  if (!file || !(file instanceof File)) throw badRequest('Missing file')
  if (!ALLOWED_MIME.includes(file.type)) throw badRequest('Invalid file type. Allowed: PNG, JPEG, WebP, AVIF')
  if (file.size > MAX_LOGO_SIZE) throw badRequest('File too large. Max 10 MB before compression')

  const compressed = await compressImageForUpload(file, 'logo', file.type)
  const fileName = `logos/${storeId}-${Date.now()}.${compressed.fileName.split('.').pop() || 'webp'}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('product-images')
    .upload(fileName, compressed.data, { contentType: compressed.contentType, upsert: true })

  if (uploadError) throw badRequest(`Upload failed: ${uploadError.message}`)

  const { data: publicUrl } = supabaseAdmin.storage
    .from('product-images')
    .getPublicUrl(fileName)

  return c.json({ url: publicUrl.publicUrl })
})

storesRouter.put('/slug', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const { slug } = await c.req.json()
  if (!slug || typeof slug !== 'string' || !slug.trim()) {
    throw badRequest('Slug is required')
  }

  const newSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { data: existing } = await supabaseAdmin
    .from('stores')
    .select('id')
    .eq('slug', newSlug)
    .neq('id', storeId)
    .maybeSingle()

  if (existing) throw badRequest('Este slug ya está en uso por otra tienda')

  const { data, error } = await supabaseAdmin
    .from('stores')
    .update({ slug: newSlug })
    .eq('id', storeId)
    .select('slug')
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ slug: data.slug })
})

storesRouter.put('/settings', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const body = await c.req.json()
  const { settings } = body
  if (!settings || typeof settings !== 'object') throw badRequest('Invalid settings')

  const { data: current } = await supabaseAdmin
    .from('stores')
    .select('settings, tax_rate')
    .eq('id', storeId)
    .single()

  const incoming = { ...settings }
  if ((incoming as Record<string, unknown>).kitchenWorkflow) {
    (incoming as Record<string, unknown>).kitchenWorkflow = resolveKitchenWorkflow(
      (incoming as Record<string, unknown>).kitchenWorkflow as any,
    )
  }
  delete (incoming as any).taxRate
  const storeName = (incoming as any).name
  delete (incoming as any).name

  const encrypted = encryptSettings(incoming)
  const merged = { ...(current?.settings as Record<string, unknown> ?? {}), ...encrypted }

  const updateData: Record<string, unknown> = { settings: merged }

  if (typeof settings.taxRate === 'number') {
    updateData.tax_rate = settings.taxRate
  }

  if (typeof storeName === 'string' && storeName.trim()) {
    updateData.name = storeName.trim()
  }

  const { data, error } = await supabaseAdmin
    .from('stores')
    .update(updateData)
    .eq('id', storeId)
    .select('*')
    .single()

  if (error) throw badRequest(error.message)

  const safeSettings = { ...(data.settings as Record<string, unknown>) }
  delete safeSettings.mpPointAccessToken
  delete safeSettings.mpClientSecret
  delete safeSettings.clipApiKey
  delete safeSettings.clipApiSecret

  return c.json({ settings: safeSettings, tax_rate: data.tax_rate })
})

storesRouter.get('/terminals', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const settings = decryptSettings((store?.settings as Record<string, unknown>) || {})
  const providerName = resolveProviderParam(c.req.query('provider'), getActiveCardProvider(settings))
  const credentials = getProviderCredentials(settings, providerName)
  if (!credentials.accessToken) throw badRequest(`${cardProviderDisplayName(providerName)} credentials not configured. Save them in settings first.`)

  const provider = getCardProvider(providerName)
  if (!provider.listTerminals) throw badRequest(`${cardProviderDisplayName(providerName)} does not support terminal listing`)

  try {
    const terminals = await provider.listTerminals(credentials)
    return c.json({ terminals })
  } catch (err: any) {
    throw badRequest(`Failed to list terminals: ${err.message}`)
  }
})

storesRouter.post('/terminals/setup-pdv', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const { terminalId, provider: requestedProvider } = await c.req.json<{ terminalId: string; provider?: string }>()
  if (!terminalId) throw badRequest('terminalId is required')

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const settings = decryptSettings((store?.settings as Record<string, unknown>) || {})
  const providerName = resolveProviderParam(requestedProvider, getActiveCardProvider(settings))
  const credentials = getProviderCredentials(settings, providerName)
  if (!credentials.accessToken) throw badRequest(`${cardProviderDisplayName(providerName)} credentials not configured`)

  const provider = getCardProvider(providerName)
  if (!provider.setupTerminal) throw badRequest(`${cardProviderDisplayName(providerName)} does not support terminal setup`)

  try {
    await provider.setupTerminal(terminalId, credentials)
    return c.json({ success: true })
  } catch (err: any) {
    throw badRequest(`Failed to set PDV mode: ${err.message}`)
  }
})

storesRouter.post('/terminals/cancel-queued', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const { provider: requestedProvider } = await c.req.json<{ provider?: string }>().catch(() => ({} as { provider?: string }))

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const settings = decryptSettings((store?.settings as Record<string, unknown>) || {})
  const providerName = resolveProviderParam(requestedProvider, getActiveCardProvider(settings))
  const credentials = getProviderCredentials(settings, providerName)
  if (!credentials.accessToken) throw badRequest(`${cardProviderDisplayName(providerName)} credentials not configured`)

  const provider = getCardProvider(providerName)

  const { data: pendingOrders } = await supabaseAdmin
    .from('orders')
    .select('id, metadata')
    .eq('store_id', storeId)
    .eq('status', 'pending')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)

  const providerOrderIds: Array<{ orderId: string; providerOrderId: string }> = []
  for (const order of pendingOrders || []) {
    const meta = order.metadata as Record<string, unknown> | null
    const providerOrderId = (meta?.payment as { providerOrderId?: string } | undefined)?.providerOrderId ?? (meta?.mpOrderId as string | undefined)
    const mpStatus = meta?.mpOrderStatus as string | undefined
    if (providerOrderId && (mpStatus === 'created' || mpStatus === 'at_terminal' || !mpStatus)) {
      providerOrderIds.push({ orderId: order.id, providerOrderId })
    }
  }

  if (providerOrderIds.length === 0) {
    return c.json({ cancelled: 0, message: 'No pending card payment orders found to cancel' })
  }

  let cancelledCount = 0
  const errors: string[] = []
  for (const { orderId, providerOrderId } of providerOrderIds) {
    try {
      await provider.cancelPayment(providerOrderId, credentials)
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled', metadata: { ...(await getMetadata(supabaseAdmin, orderId)), mpOrderStatus: 'canceled' } })
        .eq('id', orderId)
      cancelledCount++
    } catch (err: any) {
      errors.push(`${providerOrderId}: ${err.message}`)
    }
  }

  return c.json({ cancelled: cancelledCount, errors: errors.length ? errors : undefined })
})

async function getMetadata(supabaseAdmin: any, orderId: string): Promise<Record<string, unknown>> {
  const { data } = await supabaseAdmin.from('orders').select('metadata').eq('id', orderId).single()
  return (data?.metadata as Record<string, unknown>) || {}
}

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  return new TextEncoder().encode(secret)
}

storesRouter.post('/self-checkout/stations', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  const { name, terminalId, provider: requestedProvider } = await c.req.json<{ name: string; terminalId: string; provider?: CardPaymentProviderName }>()

  if (!name || !name.trim()) throw badRequest('Station name is required')
  if (!terminalId || !terminalId.trim()) throw badRequest('Terminal ID is required')

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  if (!store) throw notFound('Store not found')

  const currentSettings = (store.settings as Record<string, unknown>) || {}
  const stations = (currentSettings.selfCheckoutStations as SelfCheckoutStation[]) || []
  const provider: CardPaymentProviderName = requestedProvider || getActiveCardProvider(currentSettings)

  const stationId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  const token = await new SignJWT({
    station_id: stationId,
    store_id: storeId,
    role: 'self_checkout',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(`self-checkout:${stationId}`)
    .setIssuedAt()
    .setExpirationTime('1y')
    .sign(getJwtSecret())

  const newStation: SelfCheckoutStation = {
    id: stationId,
    name: name.trim(),
    terminalId: terminalId.trim(),
    provider,
    isActive: true,
    createdAt,
    token,
  }

  stations.push(newStation)

  const { error } = await supabaseAdmin
    .from('stores')
    .update({ settings: { ...currentSettings, selfCheckoutStations: stations } })
    .eq('id', storeId)

  if (error) throw badRequest(error.message)

  return c.json({ data: newStation }, 201)
})

storesRouter.post('/self-checkout/stations/:id/token', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  const stationId = c.req.param('id')

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  if (!store) throw notFound('Store not found')

  const currentSettings = (store.settings as Record<string, unknown>) || {}
  const stations = (currentSettings.selfCheckoutStations as SelfCheckoutStation[]) || []
  const idx = stations.findIndex((s) => s.id === stationId)

  if (idx === -1) throw notFound('Station not found')

  const token = await new SignJWT({
    station_id: stationId,
    store_id: storeId,
    role: 'self_checkout',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(`self-checkout:${stationId}`)
    .setIssuedAt()
    .setExpirationTime('1y')
    .sign(getJwtSecret())

  stations[idx].token = token

  const { error } = await supabaseAdmin
    .from('stores')
    .update({ settings: { ...currentSettings, selfCheckoutStations: stations } })
    .eq('id', storeId)

  if (error) throw badRequest(error.message)

  return c.json({ data: { id: stationId, token } })
})

storesRouter.delete('/self-checkout/stations/:id', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  const stationId = c.req.param('id')

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  if (!store) throw notFound('Store not found')

  const currentSettings = (store.settings as Record<string, unknown>) || {}
  const stations = (currentSettings.selfCheckoutStations as SelfCheckoutStation[]) || []
  const filtered = stations.filter((s) => s.id !== stationId)

  if (filtered.length === stations.length) throw notFound('Station not found')

  const { error } = await supabaseAdmin
    .from('stores')
    .update({ settings: { ...currentSettings, selfCheckoutStations: filtered } })
    .eq('id', storeId)

  if (error) throw badRequest(error.message)

  return c.json({ success: true })
})
