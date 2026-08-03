import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import {
  addCheckOrderSchema,
  closeCheckSchema,
  createCheckSchema,
  voidCheckSchema,
} from '@ultimate-pos/shared'
import { authMiddleware, requireRole } from '../middleware/auth'
import { badRequest, notFound } from '../middleware/error'
import { supabaseAdmin } from '../lib/supabase/admin'
import { decryptSettings } from '../lib/settings'
import { orderBus } from '../events'
import { createRedemption, revertRedemption } from '../services/rewards.service'

export const checksRouter = new Hono()

checksRouter.use('*', authMiddleware)

checksRouter.get('/', async (c) => {
  const storeId = c.get('storeId')
  const status = c.req.query('status') || 'open'

  let query = supabaseAdmin
    .from('checks')
    .select('*')
    .eq('store_id', storeId)
    .order('opened_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw badRequest(error.message)

  const checks = data || []
  if (checks.length === 0) return c.json({ data: [] })

  const checkIds = checks.map((check) => check.id)
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('check_id, total, status')
    .eq('store_id', storeId)
    .in('check_id', checkIds)

  const totals = new Map<string, number>()
  const activeKitchenByCheck = new Map<string, boolean>()
  for (const order of orders || []) {
    if (!order.check_id) continue
    if (['pending', 'preparing', 'ready'].includes(String(order.status))) {
      activeKitchenByCheck.set(order.check_id, true)
    }
    if (order.status === 'cancelled' || order.status === 'refunded') continue
    totals.set(order.check_id, (totals.get(order.check_id) || 0) + Number(order.total || 0))
  }

  return c.json({
    data: checks.map((check) => ({
      ...check,
      total: Math.round((totals.get(check.id) || 0) * 100) / 100,
      has_active_kitchen: activeKitchenByCheck.get(check.id) === true,
    })),
  })
})

function enrichOrder(order: Record<string, unknown>): any {
  const customer = order.customer as { name?: string } | null
  return {
    ...order,
    customer_name: customer?.name || null,
    customer: undefined,
    metadata: order.metadata || {},
  }
}

checksRouter.get('/active', async (c) => {
  const storeId = c.get('storeId')
  const tableNumber = Number(c.req.query('tableNumber'))
  if (!tableNumber || Number.isNaN(tableNumber)) {
    throw badRequest('tableNumber is required')
  }

  const { data, error } = await supabaseAdmin
    .from('checks')
    .select('*')
    .eq('store_id', storeId)
    .eq('table_number', tableNumber)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw badRequest(error.message)
  return c.json({ data: data || null })
})

checksRouter.post('/open', requireRole('admin', 'employee'), zValidator('json', createCheckSchema), async (c) => {
  const storeId = c.get('storeId')
  const userId = c.get('userId')
  const input = c.req.valid('json')

  const { data: existing } = await supabaseAdmin
    .from('checks')
    .select('*')
    .eq('store_id', storeId)
    .eq('table_number', input.table_number)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return c.json({ data: existing })

  const { data, error } = await supabaseAdmin
    .from('checks')
    .insert({
      store_id: storeId,
      table_number: input.table_number,
      customer_id: input.customer_id || null,
      notes: input.notes || null,
      status: 'open',
      opened_by: userId,
      opened_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw badRequest(error.message)
  orderBus.emit('order:status-changed', { store_id: storeId, type: 'check:opened', check_id: data.id })
  return c.json({ data }, 201)
})

checksRouter.get('/:id', async (c) => {
  const storeId = c.get('storeId')
  const id = c.req.param('id')

  const { data: check, error } = await supabaseAdmin
    .from('checks')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (error || !check) throw notFound('Check not found')

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .eq('store_id', storeId)
    .eq('check_id', id)
    .order('round_number', { ascending: true })
    .order('created_at', { ascending: true })

  const list = (orders || []).map(enrichOrder)
  const total = list
    .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
    .reduce((sum, o) => sum + Number(o.total || 0), 0)

  return c.json({ data: { ...check, orders: list, total } })
})

checksRouter.post('/:id/orders', requireRole('admin', 'employee'), zValidator('json', addCheckOrderSchema), async (c) => {
  const storeId = c.get('storeId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const { data: check, error: checkError } = await supabaseAdmin
    .from('checks')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (checkError || !check) throw notFound('Check not found')
  if (check.status !== 'open') throw badRequest('Check is not open')

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('tax_rate, settings')
    .eq('id', storeId)
    .single()

  const taxRate = store ? Number(store.tax_rate) / 100 : 0
  const settings = decryptSettings((store?.settings as Record<string, unknown>) || {})
  const taxEnabled = (settings?.taxEnabled as boolean) ?? false
  const taxInclusive = (settings?.taxInclusive as boolean) ?? false
  const taxExemptEnabled = (settings?.taxExemptEnabled as boolean) ?? false

  const productIds = input.items.map((i) => i.product_id).filter(Boolean) as string[]
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, price, tax_exempt')
    .in('id', productIds.length > 0 ? productIds : [null])

  const productMap = new Map((products || []).map((p) => [p.id, p]))

  // ── Reward handling ──
  let redeemedRewardData: {
    id: string
    name: string
    reward_type: string
    points_required: number
    product_id?: string | null
    discount_value?: number | null
    discount_type?: string | null
  } | null = null

  if (input.redeemed_reward_id) {
    const { data: reward } = await supabaseAdmin
      .from('loyalty_rewards')
      .select('id, name, reward_type, points_required, product_id, discount_value, discount_type')
      .eq('id', input.redeemed_reward_id)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .single()

    if (reward) redeemedRewardData = reward
  }

  let subtotal = 0
  let taxableSubtotal = 0
  const orderItems = input.items.map((item) => {
    const isCustom = item.product_id === null
    const product = isCustom ? null : productMap.get(item.product_id)
    const unitPrice = item.unit_price != null ? item.unit_price : Number(product?.price || 0)
    const itemTotal = unitPrice * item.quantity
    subtotal += itemTotal
    const isExempt = isCustom ? false : (taxExemptEnabled && product?.tax_exempt === true)
    if (!isExempt) taxableSubtotal += itemTotal
    return {
      order_id: '',
      product_id: item.product_id,
      product_name: isCustom ? (item.custom_name || '') : (product?.name || ''),
      quantity: item.quantity,
      unit_price: unitPrice,
      modifiers: item.modifiers,
      notes: isCustom ? (item.custom_name || item.notes || '') : item.notes,
      points: item.points,
    }
  })

  const discount = input.discount || 0
  const promoDiscount = input.promo_discount || 0
  let rewardDiscount = 0

  if (redeemedRewardData && (redeemedRewardData.reward_type === 'percentage_discount' || redeemedRewardData.reward_type === 'fixed_discount' || redeemedRewardData.reward_type === 'custom')) {
    if (redeemedRewardData.reward_type === 'percentage_discount' || (redeemedRewardData.reward_type === 'custom' && redeemedRewardData.discount_type === 'percentage')) {
      rewardDiscount = Math.round(subtotal * (redeemedRewardData.discount_value || 0) / 100 * 100) / 100
    } else {
      rewardDiscount = Math.min(redeemedRewardData.discount_value || 0, subtotal)
    }
  }

  const totalDiscount = discount + promoDiscount + rewardDiscount

  let tax = 0
  if (taxEnabled && taxRate > 0) {
    if (taxInclusive) {
      tax = Math.round((taxableSubtotal - taxableSubtotal / (1 + taxRate)) * 100) / 100
    } else {
      tax = Math.round(taxableSubtotal * taxRate * 100) / 100
    }
  }

  const total = taxInclusive
    ? Math.round((subtotal - totalDiscount) * 100) / 100
    : Math.round((subtotal + tax - totalDiscount) * 100) / 100

  const tz = (settings?.timezone as string) || 'UTC'
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: tz })

  const { data: seqData } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .eq('store_id', storeId)
    .gte('created_at', todayKey)
    .order('order_number', { ascending: false })
    .limit(1)

  const nextOrderNumber = (seqData?.[0]?.order_number ?? 0) + 1

  const { data: latestRound } = await supabaseAdmin
    .from('orders')
    .select('round_number')
    .eq('store_id', storeId)
    .eq('check_id', id)
    .order('round_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const roundNumber = (latestRound?.round_number ?? 0) + 1

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      store_id: storeId,
      created_by: userId,
      check_id: id,
      round_number: roundNumber,
      customer_id: check.customer_id || null,
      table_number: check.table_number,
      type: input.type || 'dine-in',
      order_number: nextOrderNumber,
      status: 'pending',
      payment_status: 'unpaid',
      subtotal,
      tax,
      discount,
      discount_label: input.discount_label || null,
      promo_discount: promoDiscount,
      applied_promotions: input.applied_promotions || [],
      total,
      notes: input.notes,
      metadata: {
        checkId: id,
        roundNumber,
        isAddon: roundNumber > 1,
      },
    })
    .select('*')
    .single()

  if (orderError || !order) throw badRequest(orderError?.message || 'Failed to create order')

  const itemsToInsert = orderItems.map((item) => ({ ...item, order_id: order.id }))

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(itemsToInsert)

  if (itemsError) throw badRequest(itemsError.message)

  // ── Reward redemption ──
  let rewardMeta: Record<string, unknown> = {}
  if (redeemedRewardData && check.customer_id) {
    const { getLoyaltyCard } = await import('../services/loyalty.service')
    const card = await getLoyaltyCard(check.customer_id, storeId)
    if (!card) throw badRequest('Customer must have an enrolled loyalty card to redeem rewards')

    await createRedemption(
      storeId,
      redeemedRewardData.id,
      card.id,
      check.customer_id,
      order.id,
    )
    rewardMeta = {
      redeemedRewardId: redeemedRewardData.id,
      redeemedRewardName: redeemedRewardData.name,
      redeemedRewardType: redeemedRewardData.reward_type,
      redeemedRewardPoints: redeemedRewardData.points_required,
      redeemedRewardDiscount: rewardDiscount,
    }
  }

  if (Object.keys(rewardMeta).length > 0) {
    const existingMeta = (order.metadata as Record<string, unknown>) || {}
    await supabaseAdmin
      .from('orders')
      .update({ metadata: { ...existingMeta, ...rewardMeta } })
      .eq('id', order.id)
  }

  const { data: fullOrder } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .eq('id', order.id)
    .eq('store_id', storeId)
    .single()

  if (fullOrder) {
    orderBus.emit('order:created', enrichOrder(fullOrder))
  }

  return c.json({ data: fullOrder ? enrichOrder(fullOrder) : order }, 201)
})

checksRouter.post('/:id/close', requireRole('admin', 'employee'), zValidator('json', closeCheckSchema), async (c) => {
  const storeId = c.get('storeId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const { data: check } = await supabaseAdmin
    .from('checks')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (!check) throw notFound('Check not found')
  if (check.status !== 'open') throw badRequest('Check is already closed')

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .eq('check_id', id)

  const payableOrders = (orders || []).filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
  const hasActiveKitchen = payableOrders.some((o) => ['pending', 'preparing', 'ready'].includes(o.status))
  if (hasActiveKitchen) {
    throw badRequest('Cannot close check while kitchen tickets are still active')
  }

  const total = payableOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)

  for (const order of payableOrders) {
    if (order.payment_status !== 'paid') {
      await supabaseAdmin
        .from('payments')
        .insert({
          order_id: order.id,
          amount: order.total,
          method: input.payment_method || 'cash',
          status: 'completed',
        })
    }

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('store_id', storeId)
  }

  const { data: closed, error: closeError } = await supabaseAdmin
    .from('checks')
    .update({
      status: 'closed',
      closed_by: userId,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('store_id', storeId)
    .select('*')
    .single()

  if (closeError) throw badRequest(closeError.message)

  orderBus.emit('order:status-changed', { store_id: storeId, type: 'check:closed', check_id: id })

  return c.json({ data: { ...closed, total } })
})

checksRouter.post('/:id/void', requireRole('admin'), zValidator('json', voidCheckSchema), async (c) => {
  const storeId = c.get('storeId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const { reason } = c.req.valid('json')

  const { data: check } = await supabaseAdmin
    .from('checks')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (!check) throw notFound('Check not found')
  if (check.status !== 'open') throw badRequest('Check is not open')

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .eq('check_id', id)

  for (const order of orders || []) {
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('store_id', storeId)

    await revertRedemption(order.id).catch(() => {})
  }

  const { data: voided, error: voidError } = await supabaseAdmin
    .from('checks')
    .update({
      status: 'void',
      void_reason: reason,
      closed_by: userId,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('store_id', storeId)
    .select('*')
    .single()

  if (voidError) throw badRequest(voidError.message)

  orderBus.emit('order:status-changed', { store_id: storeId, type: 'check:void', check_id: id })

  return c.json({ data: { id: voided.id } })
})
