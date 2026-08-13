import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase/admin'
import { authMiddleware, requireRole } from '../middleware/auth'
import { requireAccess } from '../middleware/requireAccess'
import { notFound, badRequest } from '../middleware/error'
import { zValidator } from '@hono/zod-validator'
import { rewardSchema } from '@ultimate-pos/shared'
import { getAvailableRewards, createRedemption, revertRedemption } from '../services/rewards.service'

export const rewardsRouter = new Hono()

rewardsRouter.use('*', authMiddleware, requireAccess)

// GET /rewards — active rewards for POS display
rewardsRouter.get('/', async (c) => {
  const storeId = c.get('storeId')
  const now = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('loyalty_rewards')
    .select('*, products(name)')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('points_required', { ascending: true })

  if (error) throw badRequest(error.message)
  return c.json({ data: data || [] })
})

// GET /rewards/all — all rewards for admin management
rewardsRouter.get('/all', async (c) => {
  const storeId = c.get('storeId')

  const { data, error } = await supabaseAdmin
    .from('loyalty_rewards')
    .select('*, products(name)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) throw badRequest(error.message)
  return c.json({ data: data || [] })
})

// GET /rewards/available/:cardId — rewards a specific card can redeem
rewardsRouter.get('/available/:cardId', async (c) => {
  const storeId = c.get('storeId')
  const cardId = c.req.param('cardId')

  const rewards = await getAvailableRewards(storeId, cardId)
  return c.json({ data: rewards })
})

// GET /rewards/:id — single reward
rewardsRouter.get('/:id', async (c) => {
  const storeId = c.get('storeId')
  const id = c.req.param('id')

  const { data, error } = await supabaseAdmin
    .from('loyalty_rewards')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (error || !data) throw notFound('Reward not found')
  return c.json({ data })
})

// POST /rewards — create reward (admin only)
rewardsRouter.post('/', requireRole('admin'), zValidator('json', rewardSchema), async (c) => {
  const storeId = c.get('storeId')
  const input = c.req.valid('json')

  const { data, error } = await supabaseAdmin
    .from('loyalty_rewards')
    .insert({ ...input, store_id: storeId })
    .select()
    .single()

  if (error) throw badRequest(error.message)
  return c.json({ data }, 201)
})

// PUT /rewards/:id — update reward (admin only)
rewardsRouter.put('/:id', requireRole('admin'), zValidator('json', rewardSchema), async (c) => {
  const storeId = c.get('storeId')
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const { current_uses: _, ...updateData } = input as Record<string, unknown>

  const { data, error } = await supabaseAdmin
    .from('loyalty_rewards')
    .update(updateData)
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error) throw badRequest(error.message)
  if (!data) throw notFound('Reward not found')
  return c.json({ data })
})

// DELETE /rewards/:id — delete reward (admin only)
rewardsRouter.delete('/:id', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  const id = c.req.param('id')

  const { error } = await supabaseAdmin
    .from('loyalty_rewards')
    .delete()
    .eq('id', id)
    .eq('store_id', storeId)

  if (error) throw badRequest(error.message)
  return c.json({ message: 'Reward deleted' })
})

// PATCH /rewards/:id/toggle — toggle is_active (admin only)
rewardsRouter.patch('/:id/toggle', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  const id = c.req.param('id')
  const body = await c.req.json()
  const isActive = body.is_active

  if (typeof isActive !== 'boolean') {
    throw badRequest('is_active must be a boolean')
  }

  const { data, error } = await supabaseAdmin
    .from('loyalty_rewards')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error) throw badRequest(error.message)
  if (!data) throw notFound('Reward not found')
  return c.json({ data })
})

// POST /rewards/redeem — redeem a reward (employee/admin)
rewardsRouter.post('/redeem', async (c) => {
  const storeId = c.get('storeId')
  const userId = c.get('userId')
  const role = c.get('role')
  const { reward_id, loyalty_card_id, customer_id, order_id } = await c.req.json()

  if (!reward_id) throw badRequest('reward_id is required')
  if (!loyalty_card_id) throw badRequest('loyalty_card_id is required')
  if (!customer_id) throw badRequest('customer_id is required')

  try {
    const result = await createRedemption(storeId, reward_id, loyalty_card_id, customer_id, order_id || null)
    return c.json({ data: result }, 201)
  } catch (err: unknown) {
    throw badRequest((err as Error).message)
  }
})

// GET /rewards/redemptions/order/:orderId — get redemption by order
rewardsRouter.get('/redemptions/order/:orderId', async (c) => {
  const storeId = c.get('storeId')
  const orderId = c.req.param('orderId')

  const { data: redemptions, error } = await supabaseAdmin
    .from('reward_redemptions')
    .select('*, loyalty_rewards(name, reward_type, points_required)')
    .eq('order_id', orderId)
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .maybeSingle()

  if (error) throw badRequest(error.message)
  return c.json({ data: redemptions || null })
})

// GET /rewards/redemptions — list all redemptions for a store (admin)
rewardsRouter.get('/redemptions', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  const limit = Math.min(Number(c.req.query('limit')) || 50, 200)
  const offset = Number(c.req.query('offset')) || 0

  const { data, error, count } = await supabaseAdmin
    .from('reward_redemptions')
    .select('*, loyalty_rewards(name, reward_type), customers(name)', { count: 'exact' })
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw badRequest(error.message)
  return c.json({ data: data || [], total: count ?? 0 })
})
