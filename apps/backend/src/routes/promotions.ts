import { supabaseAdmin } from '../lib/supabase/admin'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { promotionSchema } from '@ultimate-pos/shared'
import { authMiddleware, requireRole } from '../middleware/auth'
import { notFound, badRequest } from '../middleware/error'

export const promotionsRouter = new Hono()

promotionsRouter.use('*', authMiddleware)

// ── GET / — active promotions for POS menu (badges + sale prices) ──
promotionsRouter.get('/', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .or(`or(starts_at.is.null,starts_at.lte.${now}),or(ends_at.is.null,ends_at.gte.${now})`)
    .order('priority', { ascending: false })

  if (error) throw badRequest(error.message)

  // Filter out promos that have exhausted their max uses
  const filtered = (data || []).filter(
    (p) => p.max_uses == null || p.max_uses <= 0 || (p.current_uses ?? 0) < p.max_uses
  )

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

  // Fetch active, in-date promotions — only cart-level
  const now = new Date().toISOString()
  const { data: promos, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .eq('target_type', 'cart')
    .or(`or(starts_at.is.null,starts_at.lte.${now}),or(ends_at.is.null,ends_at.gte.${now})`)
    .order('priority', { ascending: false })

  if (error) throw badRequest(error.message)

  const appliedPromotions: Array<{
    promotion_id: string
    name: string
    discount_amount: number
    badge_text: string | null
    discount_type: string
    discount_value: number
  }> = []

  let totalDiscount = 0

  for (const promo of promos || []) {
    if (promo.target_type !== 'cart') continue

    // Skip promos that have exhausted their max uses
    if (promo.max_uses != null && promo.max_uses > 0 && (promo.current_uses ?? 0) >= promo.max_uses) continue

    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0)
    if (promo.min_quantity && totalQuantity < promo.min_quantity) continue
    if (promo.min_subtotal && subtotal < promo.min_subtotal) continue

    let discountAmount = 0
    if (promo.discount_type === 'percentage') {
      discountAmount = subtotal * (promo.discount_value / 100)
    } else {
      discountAmount = Math.min(promo.discount_value, subtotal)
    }

    if (discountAmount > 0) {
      appliedPromotions.push({
        promotion_id: promo.id,
        name: promo.name,
        discount_amount: Math.round(discountAmount * 100) / 100,
        badge_text: promo.badge_text,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
      })
      totalDiscount += discountAmount
    }
  }

  return c.json({
    data: {
      applied_promotions: appliedPromotions,
      total_discount: Math.round(totalDiscount * 100) / 100,
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

  const { data, error } = await supabase
    .from('promotions')
    .update(input)
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