import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase/admin'
import { notFound, badRequest } from '../middleware/error'
import { terminalRegistry } from '../services/terminal'
import type { TerminalConfig, TerminalPaymentMetadata } from '@ultimate-pos/shared'

export const storesRouter = new Hono()

storesRouter.use('*', authMiddleware)

function stripCredentials(settings: Record<string, unknown>): Record<string, unknown> {
  const configs = settings.terminalConfigs as TerminalConfig[] | undefined
  if (!configs) return settings
  return {
    ...settings,
    terminalConfigs: configs.map((c) => ({
      ...c,
      credentials: {},
    })),
  }
}

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
    safe.settings = stripCredentials(safe.settings as Record<string, unknown>)
  }

  return c.json(safe)
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

  const safeSettings = stripCredentials({ ...(data.settings as Record<string, unknown>) })

  return c.json({ settings: safeSettings, tax_rate: data.tax_rate })
})

storesRouter.get('/terminals', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const providerName = c.req.query('provider')
  if (!providerName) {
    return c.json({ providers: terminalRegistry.getRegisteredProviders() })
  }

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const configs = (store?.settings as Record<string, unknown> | null)?.terminalConfigs as TerminalConfig[] | undefined
  const config = configs?.find((c: TerminalConfig) => c.provider === providerName)

  if (!config) throw badRequest(`Terminal provider "${providerName}" not configured. Save your credentials in settings first.`)

  try {
    const provider = terminalRegistry.get(providerName)
    const terminals = await provider.listTerminals(config.credentials)
    return c.json({ terminals })
  } catch (err: any) {
    throw badRequest(`Failed to list terminals: ${err.message}`)
  }
})

storesRouter.post('/terminals/setup-pdv', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const { terminalId, provider: providerName } = await c.req.json<{ terminalId: string; provider?: string }>()
  if (!terminalId) throw badRequest('terminalId is required')

  const resolvedProvider = providerName || 'mercadopago'

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const configs = (store?.settings as Record<string, unknown> | null)?.terminalConfigs as TerminalConfig[] | undefined
  const config = configs?.find((c: TerminalConfig) => c.provider === resolvedProvider)

  if (!config) throw badRequest(`Terminal provider "${resolvedProvider}" not configured`)

  try {
    const provider = terminalRegistry.get(resolvedProvider)
    if (!provider.setupTerminal) throw badRequest('This terminal provider does not support setup')
    await provider.setupTerminal(config.credentials, terminalId)
    return c.json({ success: true })
  } catch (err: any) {
    throw badRequest(`Failed to set PDV mode: ${err.message}`)
  }
})

storesRouter.post('/terminals/cancel-queued', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  if (!storeId) throw notFound('No store assigned')

  const body = await c.req.json().catch(() => ({}))
  const providerName = body.provider || 'mercadopago'

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const configs = (store?.settings as Record<string, unknown> | null)?.terminalConfigs as TerminalConfig[] | undefined
  const config = configs?.find((c: TerminalConfig) => c.provider === providerName)

  if (!config) throw badRequest(`Terminal provider "${providerName}" not configured`)

  const provider = terminalRegistry.get(providerName)

  const { data: pendingOrders } = await supabaseAdmin
    .from('orders')
    .select('id, metadata')
    .eq('store_id', storeId)
    .eq('status', 'pending')
    .not('metadata', 'is', null)
    .filter('metadata->terminalPayment->provider', 'eq', providerName)
    .order('created_at', { ascending: false })
    .limit(5)

  const terminalPaymentIds: Array<{ orderId: string; providerId: string }> = []
  for (const order of pendingOrders || []) {
    const meta = order.metadata as Record<string, unknown> | null
    const tp = meta?.terminalPayment as TerminalPaymentMetadata | undefined
    if (tp?.providerId && (tp.normalizedStatus === 'created' || tp.normalizedStatus === 'awaiting_terminal')) {
      terminalPaymentIds.push({ orderId: order.id, providerId: tp.providerId })
    }
  }

  if (terminalPaymentIds.length === 0) {
    return c.json({ cancelled: 0, message: 'No pending terminal payments found to cancel' })
  }

  let cancelledCount = 0
  const errors: string[] = []
  for (const { orderId, providerId: paymentId } of terminalPaymentIds) {
    try {
      await provider.cancelPayment(config.credentials, paymentId)
      const { data: orderMeta } = await supabaseAdmin
        .from('orders')
        .select('metadata')
        .eq('id', orderId)
        .single()

      const meta = (orderMeta?.metadata as Record<string, unknown> | null) || {}
      const tp = meta.terminalPayment as TerminalPaymentMetadata | undefined

      await supabaseAdmin
        .from('orders')
        .update({
          status: 'cancelled',
          metadata: {
            ...meta,
            terminalPayment: tp ? { ...tp, normalizedStatus: 'cancelled' } : undefined,
          },
        })
        .eq('id', orderId)
      cancelledCount++
    } catch (err: any) {
      errors.push(`${paymentId}: ${err.message}`)
    }
  }

  return c.json({ cancelled: cancelledCount, errors: errors.length ? errors : undefined })
})
