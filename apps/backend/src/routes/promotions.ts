import { supabaseAdmin } from '../lib/supabase/admin'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { promotionSchema } from '@ultimate-pos/shared'
import { authMiddleware, requireRole } from '../middleware/auth'
import { notFound, badRequest } from '../middleware/error'
import {
  isPromotionActive,
  computeCartPromotionDiscounts,
  isCartPromotionEligible,
  isPromotionInDateWindow,
} from '../lib/promotion-rules'

export const promotionsRouter = new Hono()

promotionsRouter.use('*', authMiddleware)

// ── GET / — active promotions for POS menu (badges + sale prices) ──
promotionsRouter.get('/', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (error) throw badRequest(error.message)

  const now = new Date()
  const filtered = (data || []).filter((p) => isPromotionActive(p, now))

  if (c.req.query('debug') === '1') {
    return c.json({
      data: filtered,
      debug: {
        now: now.toISOString(),
        evaluated: (data || []).map((p) => ({
          id: p.id,
          name: p.name,
          starts_at: p.starts_at,
          ends_at: p.ends_at,
          inDateWindow: isPromotionInDateWindow(p, now),
          isActive: isPromotionActive(p, now),
        })),
      },
    })
  }

  return c.json({ data: filtered })
})

// ── GET /all — all promotions for admin management ──
promotionsRouter.get('/all', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('store_id', storeId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw badRequest(error.message)
  return c.json({ data: data || [] })
})

// ── POST /validate — compute cart-level promo discounts ──
// Product/category promos are applied at add-time (baked into cart prices).
// This endpoint only returns cart-level promos (min_subtotal, min_quantity).
promotionsRouter.post('/validate', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const body = await c.req.json()

  const items: Array<{ product_id: string; quantity: number; price: number; category_id?: string | null }> = body.items || []
  const subtotal: number = body.subtotal ?? items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  // Fetch active promotions — final date/eligibility checks are done in code
  const { data: promos, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .eq('target_type', 'cart')
    .order('priority', { ascending: false })

  if (error) throw badRequest(error.message)

  const now = new Date()
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0)
  const { appliedPromotions, totalDiscount } = computeCartPromotionDiscounts(promos || [], subtotal, totalQuantity, now)

  if (c.req.query('debug') === '1') {
    return c.json({
      data: {
        applied_promotions: appliedPromotions,
        total_discount: totalDiscount,
      },
      debug: {
        now: now.toISOString(),
        subtotal,
        totalQuantity,
        evaluated: (promos || []).map((p) => ({
          id: p.id,
          name: p.name,
          starts_at: p.starts_at,
          ends_at: p.ends_at,
          inDateWindow: isPromotionInDateWindow(p, now),
          eligible: isCartPromotionEligible(p, subtotal, totalQuantity, now),
        })),
      },
    })
  }

  return c.json({
    data: {
      applied_promotions: appliedPromotions,
      total_discount: totalDiscount,
    },
  })
})

// ── GET /:id — single promotion ──
promotionsRouter.get('/:id', async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const storeId = c.get('storeId')
  const { data, error } = await supabase.from('promotions').select('*').eq('id', id).eq('store_id', storeId).single()
  if (error || !data) throw notFound('Promotion not found')
  return c.json({ data })
})

// ── POST / — create promotion (admin only) ──
promotionsRouter.post('/', requireRole('admin'), zValidator('json', promotionSchema), async (c) => {
  const supabase = supabaseAdmin
  const input = c.req.valid('json')
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('promotions')
    .insert({ ...input, store_id: storeId })
    .select()
    .single()

  if (error) throw badRequest(error.message)
  return c.json({ data }, 201)
})

// ── PUT /:id — update promotion (admin only) ──
promotionsRouter.put('/:id', requireRole('admin'), zValidator('json', promotionSchema), async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const storeId = c.get('storeId')
  const input = c.req.valid('json')

  // Strip server-managed fields — current_uses is managed by order creation
  const { current_uses: _, ...updateData } = input as Record<string, unknown>

  const { data, error } = await supabase
    .from('promotions')
    .update(updateData)
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error) throw badRequest(error.message)
  if (!data) throw notFound('Promotion not found')
  return c.json({ data })
})

// ── DELETE /:id — delete promotion (admin only) ──
promotionsRouter.delete('/:id', requireRole('admin'), async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const storeId = c.get('storeId')
  const { error } = await supabase.from('promotions').delete().eq('id', id).eq('store_id', storeId)
  if (error) throw badRequest(error.message)
  return c.json({ message: 'Promotion deleted' })
})

// ── PATCH /:id/toggle — toggle is_active (admin only) ──
promotionsRouter.patch('/:id/toggle', requireRole('admin'), async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const storeId = c.get('storeId')
  const body = await c.req.json()
  const isActive = body.is_active

  if (typeof isActive !== 'boolean') {
    throw badRequest('is_active must be a boolean')
  }

  const { data, error } = await supabase
    .from('promotions')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error) throw badRequest(error.message)
  if (!data) throw notFound('Promotion not found')
  return c.json({ data })
})
