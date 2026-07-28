import { supabaseAdmin } from '../lib/supabase/admin'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { orderSchema, canTransition } from '@ultimate-pos/shared'
import { authMiddleware } from '../middleware/auth'
import { notFound, badRequest } from '../middleware/error'
import { orderBus } from '../events'
import { mpService } from '../services/mp-point'
import type { OrderMetadata } from '@ultimate-pos/shared'
import type { KitchenWorkflowConfig } from '@ultimate-pos/shared'
import { decryptSettings } from '../lib/settings'
import {
  isPromotionActive,
  getBestProductPromotion,
  calculatePromotionDiscount,
  computeCartPromotionDiscounts,
} from '../lib/promotion-rules'
import { revertPromotionUsageIfNeeded } from '../lib/promotion-usage'

export const ordersRouter = new Hono()

ordersRouter.use('*', authMiddleware)

function enrichOrder(order: Record<string, unknown>): any {
  const customer = order.customer as { name?: string } | null
  return {
    ...order,
    customer_name: customer?.name || null,
    customer: undefined,
    metadata: order.metadata || {},
  }
}

ordersRouter.get('/', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const status = c.req.query('status')
  const tab = c.req.query('tab')
  const paymentStatus = c.req.query('paymentStatus')
  const startDate = c.req.query('startDate')
  const endDate = c.req.query('endDate')
  const sortBy = c.req.query('sortBy') || 'created'
  const sortDir = c.req.query('sortDir') === 'asc' ? 'asc' : 'desc'
  const limit = Math.min(Number(c.req.query('limit')) || 50, 200)
  const offset = Number(c.req.query('offset')) || 0

  let query = supabase
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)', { count: 'exact' })
    .eq('store_id', storeId)

  if (status) {
    query = query.eq('status', status)
  } else if (tab === 'active') {
    query = query.in('status', ['pending', 'preparing', 'ready'])
  } else if (tab === 'completed') {
    query = query.in('status', ['served', 'paid'])
  }

  if (paymentStatus) {
    query = query.eq('payment_status', paymentStatus)
  }

  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const sortColumnMap: Record<string, string> = {
    created: 'created_at',
    status: 'status',
    number: 'order_number',
    total: 'total',
  }
  const sortColumn = sortColumnMap[sortBy] || 'created_at'

  const { data, error, count } = await query
    .order(sortColumn, { ascending: sortDir === 'asc', nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw badRequest(error.message)

  return c.json({ data: (data || []).map(enrichOrder), total: count ?? 0 })
})

ordersRouter.get('/realtime', async (c) => {
  const storeId = c.get('storeId')
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const encoderFn = (data: unknown) => {
    const payload = data as { store_id?: string }
    if (payload?.store_id && payload.store_id !== storeId) return
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)).catch(() => {})
  }

  orderBus.on('order:created', encoderFn)
  orderBus.on('order:status-changed', encoderFn)

  c.req.raw.signal.addEventListener('abort', () => {
    orderBus.off('order:created', encoderFn)
    orderBus.off('order:status-changed', encoderFn)
    writer.close().catch(() => {})
  })

  return c.newResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})

ordersRouter.get('/:id', async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (error || !data) throw notFound('Order not found')

  const meta = (data.metadata as Record<string, unknown> | null) || {}
  const mpOrderId = meta.mpOrderId as string | undefined
  const mpOrderStatus = meta.mpOrderStatus as string | undefined
  const needsSync = mpOrderId && (mpOrderStatus === 'created' || mpOrderStatus === 'at_terminal')

  if (needsSync) {
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('settings')
        .eq('id', data.store_id)
        .single()

      const decrypted = decryptSettings((store?.settings as Record<string, unknown>) || {})
      const accessToken = decrypted?.mpPointAccessToken as string | undefined

      if (accessToken) {
        const mpOrder = await mpService.getOrder(accessToken, mpOrderId)
        const mpStatus = mpOrder.status
        const paymentDetail = mpOrder.transactions?.payments?.[0]?.status_detail

        if (mpStatus !== 'created' && mpStatus !== 'at_terminal') {
          let orderStatus: string
          let orderPaymentStatus: string
          let paymentStatus: string
          let mpStatusMapped: string

          if (mpStatus === 'processed') {
            orderStatus = 'paid'
            orderPaymentStatus = 'paid'
            paymentStatus = 'completed'
            mpStatusMapped = 'processed'
          } else if (mpStatus === 'canceled') {
            orderStatus = 'cancelled'
            orderPaymentStatus = 'unpaid'
            paymentStatus = 'failed'
            mpStatusMapped = 'canceled'
          } else if (mpStatus === 'expired') {
            orderStatus = 'cancelled'
            orderPaymentStatus = 'unpaid'
            paymentStatus = 'failed'
            mpStatusMapped = 'expired'
          } else if (mpStatus === 'failed') {
            orderStatus = 'cancelled'
            orderPaymentStatus = 'unpaid'
            paymentStatus = 'failed'
            mpStatusMapped = 'failed'
          } else {
            throw new Error(`Unhandled MP status: ${mpStatus}`)
          }

          await supabase
            .from('orders')
            .update({
              status: orderStatus,
              payment_status: orderPaymentStatus,
              metadata: {
                ...meta,
                ...((['canceled', 'expired', 'failed'].includes(mpStatusMapped) ? { promotionUsageReverted: true } : {})),
                mpOrderStatus: mpStatusMapped,
                mpPaymentDetail: paymentDetail,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)

          await supabase
            .from('payments')
            .update({ status: paymentStatus })
            .eq('order_id', id)

          if (mpStatus === 'processed') {
            await processMpLoyalty(supabaseAdmin, id, data.store_id as string).catch(() => {})
          } else if (['canceled', 'expired', 'failed'].includes(mpStatus)) {
            await revertPromotionUsageIfNeeded(
              id,
              meta,
              (data.applied_promotions as Array<{ promotion_id?: string }> | null | undefined) || [],
            ).catch(() => {})
            await reverseMpLoyalty(supabaseAdmin, id).catch(() => {})
          }

          const { data: updatedOrder } = await supabase
            .from('orders')
            .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
            .eq('id', id)
            .single()

          if (updatedOrder) {
            orderBus.emit('order:status-changed', enrichOrder(updatedOrder))
          }
        }
      }
    } catch {
      // MP sync failed — return order as-is; next poll will retry
    }

    const { data: refreshed } = await supabase
      .from('orders')
      .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
      .eq('id', id)
      .single()

    if (refreshed) {
      const enriched = enrichOrder(refreshed)
      const { data: loyaltyTx } = await supabase
        .from('loyalty_transactions')
        .select('type, points')
        .eq('reference_id', id)
        .eq('reference_type', 'order')
      if (loyaltyTx && loyaltyTx.length > 0) {
        let earned = 0, redeemed = 0
        for (const tx of loyaltyTx) {
          if (tx.type === 'earn') earned += tx.points
          else if (tx.type === 'redeem') redeemed += Math.abs(tx.points)
        }
        enriched.loyalty = { earned, redeemed }
      }
      return c.json({ data: enriched })
    }
  }

  const enriched = enrichOrder(data)
  const { data: loyaltyTx } = await supabase
    .from('loyalty_transactions')
    .select('type, points')
    .eq('reference_id', data.id)
    .eq('reference_type', 'order')
  if (loyaltyTx && loyaltyTx.length > 0) {
    let earned = 0, redeemed = 0
    for (const tx of loyaltyTx) {
      if (tx.type === 'earn') earned += tx.points
      else if (tx.type === 'redeem') redeemed += Math.abs(tx.points)
    }
    enriched.loyalty = { earned, redeemed }
  }
  return c.json({ data: enriched })
})

ordersRouter.post('/', zValidator('json', orderSchema), async (c) => {
  const supabase = supabaseAdmin
  const input = c.req.valid('json')
  const storeId = c.get('storeId')
  const userId = c.get('userId')

  const { data: store } = await supabase
    .from('stores')
    .select('tax_rate, settings')
    .eq('id', storeId)
    .single()

  const taxRate = store ? Number(store.tax_rate) / 100 : 0
  const rawSettings = store?.settings as Record<string, unknown> | null
  const settings = decryptSettings(rawSettings || {})
  const taxEnabled = (settings?.taxEnabled as boolean) ?? false
  const taxInclusive = (settings?.taxInclusive as boolean) ?? false
  const taxExemptEnabled = (settings?.taxExemptEnabled as boolean) ?? false
  const checkoutMode = (settings?.checkoutMode as string) ?? 'order-only'
  const acceptedMethods = (settings?.acceptedPaymentMethods as string[]) ?? ['cash', 'card']
  const mpPointEnabled = (settings?.mpPointEnabled as boolean) ?? false
  const mpPointTerminalId = (settings?.mpPointTerminalId as string) ?? ''
  const mpPointAccessToken = (settings?.mpPointAccessToken as string) ?? ''

  const paymentMethod = input.payment_method
  const cashAmountGiven = input.cash_amount_given

  if (checkoutMode === 'payment-required' && !paymentMethod) {
    throw badRequest('Payment method is required')
  }

  if (paymentMethod && !acceptedMethods.includes(paymentMethod)) {
    throw badRequest(`Payment method "${paymentMethod}" is not accepted`)
  }

  const isMpPoint = paymentMethod === 'card' && mpPointEnabled && mpPointAccessToken && mpPointTerminalId

  const productIds = input.items.map((i) => i.product_id)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, tax_exempt, category_id')
    .in('id', productIds)

  const productMap = new Map((products || []).map((p) => [p.id, p]))

  const { data: activeProductCategoryPromos } = await supabaseAdmin
    .from('promotions')
    .select('id, name, target_type, target_ids, discount_type, discount_value, priority, starts_at, ends_at, is_active, current_uses, max_uses')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .in('target_type', ['product', 'category'])

  const now = new Date()
  const validProductCategoryPromos = (activeProductCategoryPromos || []).filter((promo) => isPromotionActive(promo, now))

  let subtotal = 0
  let taxableSubtotal = 0
  const orderItems = input.items.map((item) => {
    const product = productMap.get(item.product_id)
    const productPrice = product ? Number(product.price) : 0
    const productPromotion = product
      ? getBestProductPromotion(
          {
            id: product.id,
            category_id: product.category_id ?? null,
            price: productPrice,
          },
          validProductCategoryPromos,
          now,
        )
      : null

    const expectedPromotionalPrice = productPromotion
      ? Math.max(0, Math.round((productPrice - calculatePromotionDiscount(productPromotion, productPrice)) * 100) / 100)
      : productPrice

    const incomingUnitPrice = item.unit_price
    const unitPrice = incomingUnitPrice != null
      ? Math.min(incomingUnitPrice, expectedPromotionalPrice)
      : expectedPromotionalPrice

    const itemTotal = unitPrice * item.quantity
    subtotal += itemTotal
    const isExempt = taxExemptEnabled && product?.tax_exempt === true
    if (!isExempt) taxableSubtotal += itemTotal
    return {
      order_id: '',
      product_id: item.product_id,
      product_name: product?.name || '',
      quantity: item.quantity,
      unit_price: unitPrice,
      modifiers: item.modifiers,
      notes: item.notes,
    }
  })

  const totalQuantity = input.items.reduce((sum, item) => sum + item.quantity, 0)
  const { data: activeCartPromos } = await supabaseAdmin
    .from('promotions')
    .select('id, name, badge_text, target_type, discount_type, discount_value, min_quantity, min_subtotal, current_uses, max_uses, starts_at, ends_at, is_active')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .eq('target_type', 'cart')

  const {
    appliedPromotions: validatedCartPromotions,
    totalDiscount: validatedPromoDiscount,
  } = computeCartPromotionDiscounts(activeCartPromos || [], subtotal, totalQuantity, now)

  const discount = input.discount || 0
  const promoDiscount = validatedPromoDiscount
  const totalDiscount = discount + promoDiscount

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

  const hasKitchen = (settings?.hasKitchen as boolean) ?? false
  const initialStatus = !hasKitchen && paymentMethod && !isMpPoint ? 'paid' : 'pending'
  const paymentStatus = paymentMethod && !isMpPoint ? 'paid' : 'unpaid'

  const tz = (settings?.timezone as string) || 'UTC'
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: tz })

  const { data: seqData } = await supabase
    .from('orders')
    .select('order_number')
    .eq('store_id', storeId)
    .gte('created_at', todayKey)
    .order('order_number', { ascending: false })
    .limit(1)

  const nextOrderNumber = (seqData?.[0]?.order_number ?? 0) + 1

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      store_id: storeId,
      created_by: userId,
      customer_id: input.customer_id || null,
      table_number: input.table_number || null,
      type: input.type || 'dine-in',
      order_number: nextOrderNumber,
      status: initialStatus,
      payment_status: paymentStatus,
      subtotal,
      tax,
      discount,
      discount_label: input.discount_label || null,
      promo_discount: promoDiscount,
      applied_promotions: validatedCartPromotions,
      total,
      notes: input.notes,
    })
    .select()
    .single()

  if (orderError) throw badRequest(orderError.message)

  const itemsToInsert = orderItems.map((item) => ({
    ...item,
    order_id: order.id,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert)

  if (itemsError) throw badRequest(itemsError.message)

  // Increment current_uses atomically for all applied promotions
  const appliedPromos = validatedCartPromotions
  const promoIdsToIncrement = new Set<string>()

  // 1. Cart-level promos from applied_promotions
  if (appliedPromos && appliedPromos.length > 0) {
    for (const p of appliedPromos) {
      if (p.promotion_id) promoIdsToIncrement.add(p.promotion_id)
    }
  }

  // 2. Product/category promos — resolve from active promos matching ordered items
  const orderProductIds = orderItems.map((i) => i.product_id)
  const catIdSet = new Set((products || []).map((p) => p.category_id).filter(Boolean))

  for (const promo of validProductCategoryPromos) {
    if (!promo.target_ids || !Array.isArray(promo.target_ids)) continue

    if (promo.target_type === 'product') {
      const matched = orderProductIds.some((pid) => promo.target_ids.includes(pid))
      if (matched) promoIdsToIncrement.add(promo.id)
    } else if (promo.target_type === 'category') {
      const matched = [...catIdSet].some((cid) => promo.target_ids.includes(cid))
      if (matched) promoIdsToIncrement.add(promo.id)
    }
  }

  // Atomic increment — avoids race condition of read-then-write
  const promotionUsageIds = [...promoIdsToIncrement]
  for (const pid of promotionUsageIds) {
    await supabaseAdmin.rpc('increment_promotion_uses', { promo_id: pid })
  }

  if (promotionUsageIds.length > 0) {
    await supabase
      .from('orders')
      .update({ metadata: { promotionUsageIds, promotionUsageReverted: false } })
      .eq('id', order.id)
  }

  if (paymentMethod) {
    const paymentData: Record<string, unknown> = {
      order_id: order.id,
      amount: total,
      method: paymentMethod,
      status: isMpPoint ? 'pending' : 'completed',
    }

    if (paymentMethod === 'cash' && cashAmountGiven !== undefined) {
      if (cashAmountGiven < total) {
        throw badRequest('Amount given must be at least the total')
      }
      paymentData.amount_given = cashAmountGiven
      paymentData.change_due = Math.round((cashAmountGiven - total) * 100) / 100
    }

    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert(paymentData)

    if (paymentError) throw badRequest(paymentError.message)
  }

  let mpOrderId: string | null = null

  if (isMpPoint) {
    let mpOrder: Awaited<ReturnType<typeof mpService.createOrder>> | null = null
    let mpAttempt = 0

    while (mpAttempt < 2) {
      mpAttempt++
      try {
        mpOrder = await mpService.createOrder(mpPointAccessToken, {
          totalAmount: total,
          externalReference: order.id,
          description: `Ultimate POS - ${input.items.length} items`,
          terminalId: mpPointTerminalId,
        })
        break
      } catch (err: unknown) {
        const mpErr = err as { status?: number; body?: unknown; message?: string }
        const body = mpErr?.body as { errors?: Array<{ code: string }> } | undefined
        const isQueued = body?.errors?.some((e) => e.code === 'already_queued_order_on_terminal')

        if (isQueued && mpAttempt === 1) {
          await clearStuckMpOrders(supabaseAdmin, mpPointAccessToken, storeId)
          await new Promise((r) => setTimeout(r, 1000))
          continue
        }

        const detail = body ? JSON.stringify(body) : (mpErr?.message || 'MP Point error')

        await supabaseAdmin
          .from('orders')
          .update({ status: 'cancelled', metadata: { mpError: detail } })
          .eq('id', order.id)

        await supabaseAdmin
          .from('payments')
          .update({ status: 'failed' })
          .eq('order_id', order.id)

        throw badRequest(`MP Point payment failed: ${detail}`)
      }
    }

    if (!mpOrder) {
      throw badRequest('MP Point payment failed: could not create order after retry')
    }

    mpOrderId = mpOrder.id

    const metadata = {
      ...(promotionUsageIds.length > 0 ? { promotionUsageIds, promotionUsageReverted: false } : {}),
      mpOrderId: mpOrder.id,
      mpOrderStatus: 'created' as const,
    }
    await supabaseAdmin
      .from('orders')
      .update({ metadata })
      .eq('id', order.id)

    await supabaseAdmin
      .from('payments')
      .update({ reference: mpOrder.id })
      .eq('order_id', order.id)

    // Poll MP status immediately — payment may already be processed at the terminal
    try {
      await new Promise((r) => setTimeout(r, 2000))
      const earlyMp = await mpService.getOrder(mpPointAccessToken, mpOrder.id)
      if (earlyMp.status === 'processed') {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'paid', payment_status: 'paid', metadata: { mpOrderId: mpOrder.id, mpOrderStatus: 'processed' } })
          .eq('id', order.id)
        await supabaseAdmin
          .from('payments')
          .update({ status: 'completed' })
          .eq('order_id', order.id)
        await processMpLoyalty(supabaseAdmin, order.id, storeId).catch(() => {})
      } else if (['canceled', 'expired', 'failed'].includes(earlyMp.status)) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'cancelled', payment_status: 'unpaid', metadata: { mpOrderId: mpOrder.id, mpOrderStatus: earlyMp.status } })
          .eq('id', order.id)
        await supabaseAdmin
          .from('payments')
          .update({ status: 'failed' })
          .eq('order_id', order.id)
      }
    } catch {
      // Not yet processed — webhook will handle it
    }
  }

  // When checkout mode is order-first-pay-later, defer customer stats
  // and loyalty earning to POST /orders/:id/pay to avoid double counting
  const isDeferredPayment = checkoutMode === 'order-first-pay-later' && !paymentMethod

  if (input.customer_id && !isMpPoint && !isDeferredPayment) {
    const { data: cust } = await supabase
      .from('customers')
      .select('total_visits, total_spent')
      .eq('id', input.customer_id)
      .single()

    if (cust) {
      await supabase
        .from('customers')
        .update({
          total_visits: (cust.total_visits || 0) + 1,
          total_spent: (Number(cust.total_spent) || 0) + total,
        })
        .eq('id', input.customer_id)
    }
  }

  // ── Loyalty: process points earn/redeem ──
  let earnedPoints = 0
  const hasLoyalty = (settings?.hasLoyalty as boolean) ?? false
  const customerId = input.customer_id as string | undefined
  if (hasLoyalty && customerId) {
    const { getLoyaltyCard, redeemPoints, earnPoints: doEarn, calculateEarnPoints, syncWallets } = await import('../services/loyalty.service')

    const card = await getLoyaltyCard(customerId, storeId)

    const effectiveCard = card ?? (await (async () => {
      const { enrollCustomer } = await import('../services/loyalty.service')
      await enrollCustomer(storeId, customerId, settings as any)
      return getLoyaltyCard(customerId, storeId)
    })())

    if (effectiveCard) {
      const redeemedPoints = (input as any).redeemed_points || 0

      if (redeemedPoints > 0) {
        try {
          await redeemPoints(effectiveCard.id, redeemedPoints, `Canje en orden #${nextOrderNumber}`)
          syncWallets(effectiveCard.id).catch(() => {})
        } catch (err: unknown) {
          console.error('Failed to redeem points:', err)
        }
      }

      // Defer earning points to POST /orders/:id/pay for order-first-pay-later mode
      if (!isDeferredPayment) {
        const itemsForPoints = input.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.unit_price ?? 0,
        }))
        earnedPoints = await calculateEarnPoints(itemsForPoints, subtotal, discount, settings as any)
        if (earnedPoints > 0 && !isMpPoint) {
          try {
            await doEarn(effectiveCard.id, earnedPoints, `Compra en orden #${nextOrderNumber}`, order.id)
            syncWallets(effectiveCard.id).catch(() => {})
          } catch (err: unknown) {
            console.error('Failed to earn points:', err)
          }
        }
      }
    }
  }

  const { data: fullOrder } = await supabase
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .eq('id', order.id)
    .single()

  const enriched = enrichOrder(fullOrder!)
  const enrichedWithLoyalty = earnedPoints > 0 ? { ...enriched, earned_points: earnedPoints } : enriched
  orderBus.emit('order:created', enrichedWithLoyalty)

  return c.json({ data: enrichedWithLoyalty }, 201)
})

ordersRouter.post('/:id/pay', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const orderId = c.req.param('id')
  const userId = c.get('userId')
  const body = await c.req.json()
  const paymentMethod = body.payment_method as string | undefined
  const cashAmountGiven = body.cash_amount_given as number | undefined

  if (!paymentMethod || !['cash', 'card', 'transfer'].includes(paymentMethod)) {
    throw badRequest('Valid payment method is required (cash, card, or transfer)')
  }

  const { data: store } = await supabase
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const decrypted = decryptSettings((store?.settings as Record<string, unknown>) || {})
  const acceptedMethods = (decrypted?.acceptedPaymentMethods as string[]) ?? ['cash', 'card']

  if (!acceptedMethods.includes(paymentMethod)) {
    throw badRequest(`Payment method "${paymentMethod}" is not accepted`)
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_status, total, subtotal, discount, items:order_items(*), applied_promotions, customer_id, metadata, type')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .single()

  if (!order) throw notFound('Order not found')
  if (order.payment_status === 'paid') throw badRequest('Order is already paid')
  if (order.status === 'cancelled' || order.status === 'refunded') throw badRequest('Cannot pay a cancelled or refunded order')

  if (paymentMethod === 'cash' && cashAmountGiven !== undefined && cashAmountGiven < Number(order.total)) {
    throw badRequest('Amount given must be at least the total')
  }

  const isMpPoint = paymentMethod === 'card' && ((decrypted?.mpPointEnabled as boolean) ?? false)
  const mpPointAccessToken = decrypted?.mpPointAccessToken as string | undefined
  const mpPointTerminalId = decrypted?.mpPointTerminalId as string | undefined

  let paidStatus = 'paid'
  let paidPaymentStatus = 'paid'
  let isMpFlow = false

  if (isMpPoint && mpPointAccessToken && mpPointTerminalId) {
    isMpFlow = true
    paidStatus = 'pending'
    paidPaymentStatus = 'unpaid'
  }

  const paymentData: Record<string, unknown> = {
    order_id: orderId,
    amount: Number(order.total),
    method: paymentMethod,
    status: isMpFlow ? 'pending' : 'completed',
  }

  if (paymentMethod === 'cash' && cashAmountGiven !== undefined) {
    paymentData.amount_given = cashAmountGiven
    paymentData.change_due = Math.round((cashAmountGiven - Number(order.total)) * 100) / 100
  }

  const { error: paymentError } = await supabaseAdmin
    .from('payments')
    .insert(paymentData)

  if (paymentError) throw badRequest(paymentError.message)

  await supabase
    .from('orders')
    .update({
      status: paidStatus,
      payment_status: paidPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  // MP Point flow
  let mpOrderId: string | null = null
  if (isMpFlow && mpPointAccessToken && mpPointTerminalId) {
    let mpAttempt = 0
    while (mpAttempt < 2) {
      mpAttempt++
      try {
        const mpOrder = await mpService.createOrder(mpPointAccessToken, {
          totalAmount: Number(order.total),
          externalReference: orderId,
          description: `Ultimate POS - Pay later #${order.order_number}`,
          terminalId: mpPointTerminalId,
        })
        mpOrderId = mpOrder.id
        await supabase
          .from('orders')
          .update({ metadata: { ...(order.metadata as Record<string, unknown> || {}), mpOrderId: mpOrder.id, mpOrderStatus: 'created' } })
          .eq('id', orderId)
        break
      } catch (err: unknown) {
        if (mpAttempt < 2) {
          await new Promise(r => setTimeout(r, 1000))
          continue
        }
        throw badRequest(`MP Point payment failed: ${(err as { message?: string })?.message || 'Unknown error'}`)
      }
    }
  }

  // Customer stats
  if (order.customer_id) {
    const { data: cust } = await supabase
      .from('customers')
      .select('total_visits, total_spent')
      .eq('id', order.customer_id)
      .single()

    if (cust) {
      await supabase
        .from('customers')
        .update({
          total_visits: (cust.total_visits || 0) + 1,
          total_spent: (Number(cust.total_spent) || 0) + Number(order.total),
        })
        .eq('id', order.customer_id)
    }
  }

  // Loyalty
  const hasLoyalty = (decrypted?.hasLoyalty as boolean) ?? false
  if (hasLoyalty && order.customer_id && !mpOrderId) {
    const { getLoyaltyCard, earnPoints: doEarn, calculateEarnPoints, syncWallets } = await import('../services/loyalty.service')
    const card = await getLoyaltyCard(order.customer_id, storeId)
    if (card) {
      const itemsForPoints = (order.items || []).map((i: any) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        price: Number(i.unit_price ?? 0),
      }))
      const earnedPoints = await calculateEarnPoints(itemsForPoints, Number(order.subtotal), Number(order.discount), decrypted as any)
      if (earnedPoints > 0) {
        await doEarn(card.id, earnedPoints, `Pago orden #${order.order_number}`, orderId).catch(() => {})
        syncWallets(card.id).catch(() => {})
      }
    }
  }

  const { data: fullOrder } = await supabase
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .eq('id', orderId)
    .single()

  const enriched = enrichOrder(fullOrder!)
  if (mpOrderId) {
    enriched.metadata = { ...(enriched.metadata || {}), mpOrderId }
  }
  orderBus.emit('order:status-changed', enriched)

  return c.json({ data: enriched })
})

ordersRouter.post('/:id/cancel-mp', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const orderId = c.req.param('id')

  const { data: store } = await supabase
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const decrypted = decryptSettings((store?.settings as Record<string, unknown>) || {})
  const accessToken = decrypted?.mpPointAccessToken as string | undefined
  if (!accessToken) throw badRequest('MP Point access token not configured')

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, metadata')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .single()

  if (!order) throw notFound('Order not found')

  const meta = (order.metadata as OrderMetadata | null) || {}
  const mpOrderId = meta.mpOrderId
  let mpCancelError: string | null = null

  if (mpOrderId) {
    try {
      await mpService.cancelOrder(accessToken, mpOrderId)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || ''
      if (code === 'cannot_cancel_order') {
        mpCancelError = 'expired'
      } else {
        throw badRequest(`Failed to cancel MP Point order: ${(err as { message?: string })?.message || code}`)
      }
    }
  }

  await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      metadata: {
        ...meta,
        promotionUsageReverted: true,
        mpOrderStatus: mpCancelError === 'expired' ? 'expired' : 'canceled',
      },
    })
    .eq('id', orderId)

  await revertPromotionUsageIfNeeded(
    orderId,
    meta as Record<string, unknown>,
    [],
  ).catch(() => {})

  await reverseMpLoyalty(supabaseAdmin, orderId).catch(() => {})

  return c.json({ success: true, meta: { mpOrderStatus: mpCancelError === 'expired' ? 'expired' : 'canceled' } })
})

ordersRouter.patch('/:id/status', async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const storeId = c.get('storeId')
  const role = c.get('role')
  const { status: newStatus } = await c.req.json()

  if ((newStatus === 'cancelled' || newStatus === 'refunded') && role !== 'admin') {
    throw badRequest('Only admin can cancel or refund orders')
  }

  const { data: store } = await supabase
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const hasKitchen = (store?.settings as Record<string, unknown> | null)?.hasKitchen === true
  const kitchenWorkflow = ((store?.settings as Record<string, unknown> | null)?.kitchenWorkflow || null) as KitchenWorkflowConfig | null

  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (!order) throw notFound('Order not found')

  if (!canTransition(order.status, newStatus, hasKitchen, kitchenWorkflow)) {
    throw badRequest(`Cannot transition from ${order.status} to ${newStatus}`)
  }

  const updatePayload: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
  if (newStatus === 'paid') {
    updatePayload.payment_status = 'paid'
  } else if (newStatus === 'refunded') {
    updatePayload.payment_status = 'refunded'
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', id)
    .eq('store_id', storeId)
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .single()

  if (error) throw badRequest(error.message)

  const enriched = enrichOrder(data!)

  if (newStatus === 'cancelled' || newStatus === 'refunded') {
    await revertPromotionUsageIfNeeded(
      id,
      (data?.metadata as Record<string, unknown> | null | undefined) || {},
      (data?.applied_promotions as Array<{ promotion_id?: string }> | null | undefined) || [],
    )

    const { data: cancelTxs } = await supabase
      .from('loyalty_transactions')
      .select('type, points, loyalty_card_id')
      .eq('reference_id', id)
      .eq('reference_type', 'order')
    if (cancelTxs && cancelTxs.length > 0) {
      const { redeemPoints: doRedeem, syncWallets } = await import('../services/loyalty.service')
      const syncedCardIds = new Set<string>()
      for (const tx of cancelTxs) {
        if (tx.type === 'earn' && tx.points > 0 && tx.loyalty_card_id) {
          await doRedeem(tx.loyalty_card_id, tx.points, `Devolución orden #${data?.order_number}`).catch(() => {})
          syncedCardIds.add(tx.loyalty_card_id)
        }
      }
      for (const cardId of syncedCardIds) {
        syncWallets(cardId).catch(() => {})
      }
    }

    if (data?.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('total_visits, total_spent')
        .eq('id', data.customer_id)
        .single()
      if (cust) {
        await supabase
          .from('customers')
          .update({
            total_visits: Math.max(0, (cust.total_visits || 0) - 1),
            total_spent: Math.max(0, (Number(cust.total_spent) || 0) - Number(data.total || 0)),
          })
          .eq('id', data.customer_id)
      }
    }
  }

  orderBus.emit('order:status-changed', enriched)

  return c.json({ data: enriched })
})

export interface LoyaltyResult {
  pointsEarned: number
  pointsBefore: number
  pointsAfter: number
}

export async function processMpLoyalty(
  supabase: typeof supabaseAdmin,
  orderId: string,
  storeId: string,
): Promise<LoyaltyResult | undefined> {
  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*), order_number, customer_id, discount')
    .eq('id', orderId)
    .single()
  if (!order?.customer_id) return undefined

  const { data: store } = await supabase
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()
  if (!store) return undefined

  const settings = (store.settings || {}) as Record<string, unknown>
  const hasLoyalty = (settings?.hasLoyalty as boolean) ?? false
  if (!hasLoyalty) return undefined

  const { getLoyaltyCard, earnPoints: doEarn, calculateEarnPoints, syncWallets } = await import('../services/loyalty.service')

  const card = await getLoyaltyCard(order.customer_id, storeId)
  if (!card) return undefined

  const { data: existingTxs } = await supabase
    .from('loyalty_transactions')
    .select('id')
    .eq('reference_id', orderId)
    .eq('reference_type', 'order')
    .eq('type', 'earn')
    .limit(1)
  if (existingTxs && existingTxs.length > 0) return undefined

  const items = (order.items || []) as any[]
  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * (i.quantity || 1), 0)
  const discount = Number(order.discount || 0)

  const itemsForPoints = items.map((i: any) => ({
    product_id: i.product_id,
    quantity: i.quantity,
    price: Number(i.unit_price ?? 0),
  }))

  const earnedPoints = await calculateEarnPoints(itemsForPoints, subtotal, discount, settings as any)
  const pointsBefore = card.points || 0

  if (earnedPoints > 0) {
    const result = await doEarn(card.id, earnedPoints, `Compra MP Point orden #${order.order_number}`, orderId)
    syncWallets(card.id).catch(() => {})

    const pointsAfter = result?.new_balance ?? (pointsBefore + earnedPoints)

    const { data: cust } = await supabase
      .from('customers')
      .select('total_visits, total_spent')
      .eq('id', order.customer_id)
      .single()

    if (cust) {
      const total = subtotal - discount
      await supabase
        .from('customers')
        .update({
          total_visits: (cust.total_visits || 0) + 1,
          total_spent: (Number(cust.total_spent) || 0) + total,
        })
        .eq('id', order.customer_id)
    }

    return { pointsEarned: earnedPoints, pointsBefore, pointsAfter }
  }

  return { pointsEarned: 0, pointsBefore, pointsAfter: pointsBefore }
}

export async function reverseMpLoyalty(
  supabase: typeof supabaseAdmin,
  orderId: string,
) {
  const { data: txs } = await supabase
    .from('loyalty_transactions')
    .select('type, points, loyalty_card_id')
    .eq('reference_id', orderId)
    .eq('reference_type', 'order')

  if (!txs || txs.length === 0) return

  const { redeemPoints: doRedeem, syncWallets } = await import('../services/loyalty.service')
  const syncedCardIds = new Set<string>()
  for (const tx of txs) {
    if (tx.type === 'earn' && tx.points > 0 && tx.loyalty_card_id) {
      await doRedeem(tx.loyalty_card_id, tx.points, `Devolución MP orden #${orderId}`).catch(() => {})
      syncedCardIds.add(tx.loyalty_card_id)
    }
  }
  for (const cardId of syncedCardIds) {
    syncWallets(cardId).catch(() => {})
  }
}

async function clearStuckMpOrders(supabase: typeof supabaseAdmin, accessToken: string, storeId: string) {
  const seen = new Set<string>()
  const candidates: Array<{ id: string; metadata: Record<string, unknown> | null }> = []

  const { data: byStatus } = await supabase
    .from('orders')
    .select('id, metadata')
    .eq('store_id', storeId)
    .not('metadata', 'is', null)
    .not('status', 'in', '("paid","cancelled","refunded")')
    .order('created_at', { ascending: false })
    .limit(50)

  for (const o of byStatus || []) {
    if (!seen.has(o.id)) { seen.add(o.id); candidates.push(o) }
  }

  const { data: byMpStatus } = await supabase
    .from('orders')
    .select('id, metadata')
    .eq('store_id', storeId)
    .not('metadata', 'is', null)
    .or('metadata->>mpOrderStatus.eq.created,metadata->>mpOrderStatus.eq.at_terminal')
    .limit(50)

  for (const o of byMpStatus || []) {
    if (!seen.has(o.id)) { seen.add(o.id); candidates.push(o) }
  }

  for (const order of candidates) {
    const meta = order.metadata as OrderMetadata | null
    const mpId = meta?.mpOrderId
    if (!mpId) continue

    try {
      const mpOrder = await mpService.getOrder(accessToken, mpId)
      const mpStatus = mpOrder.status
      const paymentDetail = mpOrder.transactions?.payments?.[0]?.status_detail

      if (mpStatus === 'processed') {
        await supabase
          .from('orders')
          .update({ status: 'paid', payment_status: 'paid', metadata: { ...meta, mpOrderStatus: 'processed', mpPaymentDetail: paymentDetail } })
          .eq('id', order.id)
        await supabase
          .from('payments')
          .update({ status: 'completed' })
          .eq('order_id', order.id)
        await processMpLoyalty(supabase, order.id, storeId).catch(() => {})
        continue
      }

      if (mpStatus === 'canceled' || mpStatus === 'expired' || mpStatus === 'failed') {
        await revertPromotionUsageIfNeeded(
          order.id,
          (meta as Record<string, unknown> | null | undefined) || {},
          [],
        ).catch(() => {})
        await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            metadata: { ...meta, promotionUsageReverted: true, mpOrderStatus: mpStatus, mpPaymentDetail: paymentDetail },
          })
          .eq('id', order.id)
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('order_id', order.id)
        await reverseMpLoyalty(supabase, order.id).catch(() => {})
        continue
      }

      if (mpStatus === 'created' || mpStatus === 'at_terminal') {
        await mpService.cancelOrder(accessToken, mpId)
        await revertPromotionUsageIfNeeded(
          order.id,
          (meta as Record<string, unknown> | null | undefined) || {},
          [],
        ).catch(() => {})
        await supabase
          .from('orders')
          .update({ status: 'cancelled', metadata: { ...meta, promotionUsageReverted: true, mpOrderStatus: 'canceled' } })
          .eq('id', order.id)
        await reverseMpLoyalty(supabase, order.id).catch(() => {})
      }
    } catch {
    }
  }
}
