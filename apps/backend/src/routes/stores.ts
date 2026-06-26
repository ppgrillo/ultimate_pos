import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase/admin'
import { notFound, badRequest } from '../middleware/error'
import { mpService } from '../services/mp-point'

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']
const MAX_LOGO_SIZE = 3 * 1024 * 1024

export const storesRouter = new Hono()

storesRouter.use('*', authMiddleware)

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
  if (file.size > MAX_LOGO_SIZE) throw badRequest('File too large. Max 3 MB')

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'avif'
  const fileName = `logos/${storeId}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('product-images')
    .upload(fileName, file, { contentType: file.type, upsert: true })

  if (uploadError) throw badRequest(`Upload failed: ${uploadError.message}`)

  const { data: publicUrl } = supabaseAdmin.storage
    .from('product-images')
    .getPublicUrl(fileName)

  return c.json({ url: publicUrl.publicUrl })
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

  const merged = { ...(current?.settings as Record<string, unknown> ?? {}), ...settings }
  delete (merged as any).taxRate

  const updateData: Record<string, unknown> = { settings: merged }

  if (typeof settings.taxRate === 'number') {
    updateData.tax_rate = settings.taxRate
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

  const accessToken = (store?.settings as Record<string, unknown>)?.mpPointAccessToken as string | undefined
  if (!accessToken) throw badRequest('MP Point access token not configured. Save your access token in settings first.')

  try {
    const result = await mpService.listTerminals(accessToken)
    const terminals = (result as any)?.data?.terminals ?? []
    return c.json({ terminals })
  } catch (err: any) {
    throw badRequest(`Failed to list terminals: ${err.message}`)
  }
})

storesRouter.post('/terminals/setup-pdv', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const { terminalId } = await c.req.json<{ terminalId: string }>()
  if (!terminalId) throw badRequest('terminalId is required')

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const accessToken = (store?.settings as Record<string, unknown>)?.mpPointAccessToken as string | undefined
  if (!accessToken) throw badRequest('MP Point access token not configured')

  try {
    await mpService.setPdvMode(accessToken, terminalId)
    return c.json({ success: true })
  } catch (err: any) {
    throw badRequest(`Failed to set PDV mode: ${err.message}`)
  }
})

storesRouter.post('/terminals/cancel-queued', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const accessToken = (store?.settings as Record<string, unknown>)?.mpPointAccessToken as string | undefined
  if (!accessToken) throw badRequest('MP Point access token not configured')

  const { data: pendingOrders } = await supabaseAdmin
    .from('orders')
    .select('id, metadata')
    .eq('store_id', storeId)
    .eq('status', 'pending')
    .not('metadata', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)

  const mpOrderIds: Array<{ orderId: string; mpOrderId: string }> = []
  for (const order of pendingOrders || []) {
    const meta = order.metadata as Record<string, unknown> | null
    const mpId = meta?.mpOrderId as string | undefined
    const mpStatus = meta?.mpOrderStatus as string | undefined
    if (mpId && (mpStatus === 'created' || mpStatus === 'at_terminal' || !mpStatus)) {
      mpOrderIds.push({ orderId: order.id, mpOrderId: mpId })
    }
  }

  if (mpOrderIds.length === 0) {
    return c.json({ cancelled: 0, message: 'No pending MP Point orders found to cancel' })
  }

  let cancelledCount = 0
  const errors: string[] = []
  for (const { orderId, mpOrderId } of mpOrderIds) {
    try {
      await mpService.cancelOrder(accessToken, mpOrderId)
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled', metadata: { ...(await getMetadata(supabaseAdmin, orderId)), mpOrderStatus: 'canceled' } })
        .eq('id', orderId)
      cancelledCount++
    } catch (err: any) {
      errors.push(`${mpOrderId}: ${err.message}`)
    }
  }

  return c.json({ cancelled: cancelledCount, errors: errors.length ? errors : undefined })
})

async function getMetadata(supabaseAdmin: any, orderId: string): Promise<Record<string, unknown>> {
  const { data } = await supabaseAdmin.from('orders').select('metadata').eq('id', orderId).single()
  return (data?.metadata as Record<string, unknown>) || {}
}
