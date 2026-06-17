import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase/admin'
import { notFound, badRequest } from '../middleware/error'

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

  return c.json(data)
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

  return c.json({ settings: data.settings, tax_rate: data.tax_rate })
})
