import { supabaseAdmin } from '../lib/supabase/admin'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { promotionSchema } from '@ultimate-pos/shared'
import { authMiddleware, requireRole } from '../middleware/auth'
import { requireAccess } from '../middleware/requireAccess'
import { notFound, badRequest } from '../middleware/error'
import {
  isPromotionActive,
  computeCartPromotionDiscounts,
  isCartPromotionEligible,
  isPromotionInDateWindow,
  computeConditionalProductPromotionDiscounts,
} from '../lib/promotion-rules'

export const promotionsRouter = new Hono()

promotionsRouter.use('*', authMiddleware, requireAccess)

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
// Unconditional product/category promos are applied at add-time (baked into cart prices).
// This endpoint returns cart-level promos (min_subtotal, min_quantity) AND product/category
// promos that carry min_quantity / min_subtotal conditions (evaluated against matching items).
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
    .in('target_type', ['cart', 'product', 'category'])
    .order('priority', { ascending: false })

  if (error) throw badRequest(error.message)

  const now = new Date()
  const cartPromos = (promos || []).filter((p) => p.target_type === 'cart')
  const conditionalTargetedPromos = (promos || []).filter((p) => p.target_type === 'product' || p.target_type === 'category')

  const targetedLines = items.map((i) => ({
    product_id: i.product_id,
    quantity: i.quantity,
    price: i.price,
    category_id: i.category_id ?? null,
  }))

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0)
  const { appliedPromotions: cartApplied, totalDiscount: cartDiscount } =
    computeCartPromotionDiscounts(cartPromos, subtotal, totalQuantity, now)

  const { appliedPromotions: targetedApplied, totalDiscount: targetedDiscount } =
    computeConditionalProductPromotionDiscounts(conditionalTargetedPromos, targetedLines, now)

  const appliedPromotions = [...cartApplied, ...targetedApplied]
  const totalDiscount = Math.round((cartDiscount + targetedDiscount) * 100) / 100

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
          eligible: p.target_type === 'cart'
            ? isCartPromotionEligible(p, subtotal, totalQuantity, now)
            : computeConditionalProductPromotionDiscounts([p], targetedLines, now).appliedPromotions.length > 0,
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
