import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase/admin'
import { authMiddleware, requireRole } from '../middleware/auth'
import { notFound, badRequest } from '../middleware/error'
import { enrollCustomer, getLoyaltyCard, earnPoints, redeemPoints, syncWallets, calculateEarnPoints } from '../services/loyalty.service'
import type { StoreSettings } from '@ultimate-pos/shared'

export const loyaltyRouter = new Hono()

loyaltyRouter.use('*', authMiddleware)

loyaltyRouter.post('/enroll', async (c) => {
  const storeId = c.get('storeId')
  const { customer_id } = await c.req.json()

  if (!customer_id) throw badRequest('customer_id is required')

  const existing = await getLoyaltyCard(customer_id, storeId)
  if (existing) return c.json({ data: existing })

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const settings = (store?.settings || {}) as StoreSettings

  const result = await enrollCustomer(storeId, customer_id, settings)
  return c.json({ data: result }, 201)
})

loyaltyRouter.get('/card/:customerId', async (c) => {
  const storeId = c.get('storeId')
  const customerId = c.req.param('customerId')

  const card = await getLoyaltyCard(customerId, storeId)
  if (!card) throw notFound('Loyalty card not found')

  return c.json({ data: card })
})

loyaltyRouter.post('/scan', async (c) => {
  const storeId = c.get('storeId')
  const { barcode } = await c.req.json()
  if (!barcode) throw badRequest('barcode is required')

  const { data: card } = await supabaseAdmin
    .from('loyalty_cards')
    .select('*, customers!inner(id, name, email)')
    .eq('id', barcode)
    .eq('store_id', storeId)
    .single()

  if (!card) throw notFound('Loyalty card not found')

  return c.json({ data: card })
})

loyaltyRouter.get('/transactions/:cardId', async (c) => {
  const storeId = c.get('storeId')
  const cardId = c.req.param('cardId')
  const limit = Math.min(Number(c.req.query('limit')) || 50, 200)
  const offset = Number(c.req.query('offset')) || 0

  const { data, error } = await supabaseAdmin
    .from('loyalty_transactions')
    .select('*')
    .eq('loyalty_card_id', cardId)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

loyaltyRouter.get('/program', async (c) => {
  const storeId = c.get('storeId')

  const { data, error } = await supabaseAdmin
    .from('loyalty_programs')
    .select('*')
    .eq('store_id', storeId)
    .single()

  if (error && error.code !== 'PGRST116') throw badRequest(error.message)

  return c.json({ data })
})

// POST /loyalty/adjust — manually add or remove points from a card (admin only).
// points can be positive (add) or negative (remove). Balance never goes below 0.
loyaltyRouter.post('/adjust', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  const { card_id, points, description } = await c.req.json()

  if (!card_id) throw badRequest('card_id is required')
  if (typeof points !== 'number' || points === 0) throw badRequest('points must be a non-zero number')

  const { data: card } = await supabaseAdmin
    .from('loyalty_cards')
    .select('id')
    .eq('id', card_id)
    .eq('store_id', storeId)
    .single()

  if (!card) throw notFound('Loyalty card not found')

  const { data, error } = await supabaseAdmin.rpc('process_loyalty_transaction', {
    p_card_id: card_id,
    p_type: 'adjust',
    p_points: points,
    p_description: description || (points > 0 ? 'Manual adjustment (add)' : 'Manual adjustment (remove)'),
    p_reference_id: null,
    p_reference_type: null,
  })

  if (error) throw badRequest(error.message)

  await syncWallets(card_id)

  return c.json({ data })
})
