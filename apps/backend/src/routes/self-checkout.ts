import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase/admin'
import { selfCheckoutAuth } from '../middleware/self-checkout'
import { notFound, badRequest } from '../middleware/error'
import type { SelfCheckoutStation } from '@ultimate-pos/shared'
import { decryptSettings } from '../lib/settings'
import {
  isPromotionActive,
  computeCartPromotionDiscounts,
  getBestProductPromotion,
  calculatePromotionDiscount,
} from '../lib/promotion-rules'
import { revertPromotionUsageIfNeeded } from '../lib/promotion-usage'
import { getAvailableRewards, createRedemption, revertRedemption } from '../services/rewards.service'
import { orderBus } from '../events'
import {
  getCardProvider,
  getProviderCredentials,
  getActiveCardProvider,
  cardProviderDisplayName,
} from '../services/payments'
import { buildPaymentMetadata } from '../services/payments/metadata'
import { isFailedCardStatus } from '../services/payments/status'
import type { CardOrderStatus, CardPaymentProviderName, CardProviderCredentials, PaymentProvider } from '../services/payments/types'

export const selfCheckoutRouter = new Hono()

selfCheckoutRouter.use('*', selfCheckoutAuth)

function resolveStationPayment(
  settings: Record<string, unknown>,
  station: SelfCheckoutStation,
): { provider: PaymentProvider; providerName: CardPaymentProviderName; credentials: CardProviderCredentials; terminalId: string } {
  const providerName: CardPaymentProviderName = station.provider || getActiveCardProvider(settings)
  return {
    provider: getCardProvider(providerName),
    providerName,
    credentials: getProviderCredentials(settings, providerName),
    terminalId: station.terminalId,
  }
}

selfCheckoutRouter.get('/verify', async (c) => {
  const storeId = c.get('storeId')
  const station = c.get('station')

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('id, name, slug, currency, settings')
    .eq('id', storeId)
    .single()

  if (!store) throw notFound('Store not found')

  const safeSettings = { ...(store.settings as Record<string, unknown>) }
  delete safeSettings.mpPointAccessToken
  delete safeSettings.mpClientSecret
  delete safeSettings.clipApiKey
  delete safeSettings.clipApiSecret

  return c.json({
    data: {
      store: { ...store, settings: safeSettings },
      station,
    },
  })
})

// GET /self-checkout/rewards/available/:cardId — rewards for a loyalty card
selfCheckoutRouter.get('/rewards/available/:cardId', async (c) => {
  const storeId = c.get('storeId')
  const cardId = c.req.param('cardId')
  const rewards = await getAvailableRewards(storeId, cardId)
  return c.json({ data: rewards })
})

selfCheckoutRouter.get('/products', async (c) => {
  const storeId = c.get('storeId')

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('pinned', { ascending: false })
    .order('name')

  if (error) throw badRequest(error.message)

  return c.json({ data: data || [] })
})

selfCheckoutRouter.get('/categories', async (c) => {
  const storeId = c.get('storeId')

  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .order('sort_order')

  if (error) throw badRequest(error.message)

  return c.json({ data: data || [] })
})

selfCheckoutRouter.post('/customers', async (c) => {
  const storeId = c.get('storeId')

  const body = await c.req.json()
  const { name, email, phone } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw badRequest('Customer name is required')
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert({
      store_id: storeId,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      source: 'self-checkout',
      tags: ['self-checkout'],
    })
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data }, 201)
})

selfCheckoutRouter.get('/customers/lookup', async (c) => {
  const storeId = c.get('storeId')
  const code = c.req.query('code')

  if (!code) throw badRequest('Code is required')

  const { data: customers, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .or(`phone.eq.${code},phone.ilike.%${code}%,email.eq.${code},email.ilike.%${code}%,name.ilike.%${code}%`)
    .limit(1)

  if (error) throw badRequest(`Lookup query failed: ${error.message}`)

  const data = customers?.[0] ?? null

  if (!data) return c.json({ data: null })

  return c.json({ data })
})

selfCheckoutRouter.get('/customers/:id/detail', async (c) => {
  const storeId = c.get('storeId')
  const customerId = c.req.param('id')

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('store_id', storeId)
    .single()

  if (!customer) throw notFound('Customer not found')

  const { data: loyaltyCard } = await supabaseAdmin
    .from('loyalty_cards')
    .select('id, tier, points, digital_pass_id, google_pass_id, apple_pass_id')
    .eq('customer_id', customerId)
    .eq('store_id', storeId)
    .maybeSingle()

  const { data: recentOrders } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, total, created_at, items:order_items(product_name, quantity)')
    .eq('store_id', storeId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(5)

  return c.json({ data: { customer, loyaltyCard, recentOrders: recentOrders || [] } })
})

// ── POST /promotions/validate — compute cart-level promo discounts ──
selfCheckoutRouter.post('/promotions/validate', async (c) => {
  const storeId = c.get('storeId')
  const body = await c.req.json()

  const items: Array<{ product_id: string; quantity: number; price: number; category_id?: string | null }> = body.items || []
  const subtotal: number = body.subtotal ?? items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const { data: promos, error } = await supabaseAdmin
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

  return c.json({
    data: {
      applied_promotions: appliedPromotions,
      total_discount: totalDiscount,
    },
  })
})

selfCheckoutRouter.post('/orders', async (c) => {
  const storeId = c.get('storeId')
  const station = c.get('station')

  const body = await c.req.json()
  const { items, customer_id, discount, discount_label, redeemed_reward_id } = body

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw badRequest('At least one item is required')
  }

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings, tax_rate')
    .eq('id', storeId)
    .single()

  if (!store) throw notFound('Store not found')

  const settings = decryptSettings((store.settings as Record<string, unknown>) || {})
  if (!station.terminalId) {
    throw badRequest('Station has no terminal assigned. Contact the store admin.')
  }

  const stationPayment = resolveStationPayment(settings, station)
  if (!stationPayment.credentials.accessToken) {
    throw badRequest(`${cardProviderDisplayName(stationPayment.providerName)} is not configured for this station. Contact the store admin.`)
  }

  const taxRate = store.tax_rate ? Number(store.tax_rate) / 100 : 0
  const taxEnabled = (settings.taxEnabled as boolean) ?? false
  const taxInclusive = (settings.taxInclusive as boolean) ?? false
  const taxExemptEnabled = (settings.taxExemptEnabled as boolean) ?? false

  const productIds = items.map((i: { product_id: string }) => i.product_id)
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, price, tax_exempt, category_id')
    .in('id', productIds)

  const productMap = new Map((products || []).map((p) => [p.id, p]))

  // ── Reward fetching ──
  let redeemedRewardData: {
    id: string
    name: string
    reward_type: string
    points_required: number
    product_id?: string | null
    discount_value?: number | null
    discount_type?: string | null
  } | null = null

  if (redeemed_reward_id) {
    const { data: reward } = await supabaseAdmin
      .from('loyalty_rewards')
      .select('id, name, reward_type, points_required, product_id, discount_value, discount_type')
      .eq('id', redeemed_reward_id)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .single()

    if (reward) redeemedRewardData = reward
  }

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
  const orderItems = items.map((item: { product_id: string; quantity: number; unit_price?: number; modifiers?: string[]; notes?: string | null }) => {
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
      product_id: item.product_id,
      product_name: product?.name || '',
      quantity: item.quantity,
      unit_price: unitPrice,
      modifiers: item.modifiers || [],
      notes: item.notes || null,
    }
  })

  const totalQuantity = items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)
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

  const disc = discount || 0
  const promoDisc = validatedPromoDiscount
  let rewardDiscount = 0

  if (redeemedRewardData && (redeemedRewardData.reward_type === 'percentage_discount' || redeemedRewardData.reward_type === 'fixed_discount' || redeemedRewardData.reward_type === 'custom')) {
    if (redeemedRewardData.reward_type === 'percentage_discount' || (redeemedRewardData.reward_type === 'custom' && redeemedRewardData.discount_type === 'percentage')) {
      rewardDiscount = Math.round(subtotal * (redeemedRewardData.discount_value || 0) / 100 * 100) / 100
    } else {
      rewardDiscount = Math.min(redeemedRewardData.discount_value || 0, subtotal)
    }
  }

  const totalDiscount = disc + promoDisc + rewardDiscount

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

  const { data: owner } = await supabaseAdmin
    .from('store_members')
    .select('profile_id')
    .eq('store_id', storeId)
    .eq('role', 'admin')
    .limit(1)
    .single()

  const createdBy = owner?.profile_id

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      store_id: storeId,
      created_by: createdBy,
      customer_id: customer_id || null,
      type: 'takeaway',
      order_number: nextOrderNumber,
      status: 'pending',
      payment_status: 'unpaid',
      subtotal,
      tax,
      discount: disc,
      discount_label: disc > 0 ? (discount_label || 'Discount') : null,
      promo_discount: promoDisc,
      applied_promotions: validatedCartPromotions,
      total,
      notes: null,
      metadata: { stationId: station.id, stationName: station.name, source: 'self-checkout' },
    })
    .select()
    .single()

  if (orderError) throw badRequest(orderError.message)

  const itemsToInsert = orderItems.map((item: Record<string, unknown>) => ({
    ...item,
    order_id: order.id,
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(itemsToInsert)

  if (itemsError) throw badRequest(itemsError.message)

  // Increment current_uses for applied promotions
  const allPromoIds: string[] = []
  // 1. Cart-level promos validated on server
  if (validatedCartPromotions.length > 0) {
    for (const p of validatedCartPromotions) {
      if (p.promotion_id) allPromoIds.push(p.promotion_id)
    }
  }
  // 2. Product/category promos — resolve from active promos matching ordered items
  const orderProductIds = orderItems.map((i: Record<string, unknown>) => i.product_id as string)
  const { data: productsWithCategory } = await supabaseAdmin
    .from('products')
    .select('id, category_id')
    .in('id', orderProductIds)
  const catIdSet = new Set((productsWithCategory || []).map((p) => p.category_id).filter(Boolean))
  for (const promo of validProductCategoryPromos) {
    if (!promo.target_ids || !Array.isArray(promo.target_ids)) continue
    if (promo.target_type === 'product') {
      if (orderProductIds.some((pid) => promo.target_ids.includes(pid))) allPromoIds.push(promo.id)
    } else if (promo.target_type === 'category') {
      if ([...catIdSet].some((cid) => promo.target_ids.includes(cid))) allPromoIds.push(promo.id)
    }
  }

  // Atomic increment — avoids race condition of read-then-write
  const uniquePromoIds = [...new Set(allPromoIds)]
  for (const pid of uniquePromoIds) {
    await supabaseAdmin.rpc('increment_promotion_uses', { promo_id: pid })
  }

  if (uniquePromoIds.length > 0) {
    await supabaseAdmin
      .from('orders')
      .update({
        metadata: {
          stationId: station.id,
          stationName: station.name,
          source: 'self-checkout',
          promotionUsageIds: uniquePromoIds,
          promotionUsageReverted: false,
        },
      })
      .eq('id', order.id)
  }

  // ── Reward redemption ──
  let rewardMeta: Record<string, unknown> = {}
  if (redeemedRewardData && customer_id) {
    const { getLoyaltyCard } = await import('../services/loyalty.service')
    const card = await getLoyaltyCard(customer_id, storeId)
    if (!card) throw badRequest('Customer must have an enrolled loyalty card to redeem rewards')

    await createRedemption(
      storeId,
      redeemedRewardData.id,
      card.id,
      customer_id,
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
    await supabaseAdmin
      .from('orders')
      .update({
        metadata: {
          stationId: station.id,
          stationName: station.name,
          source: 'self-checkout',
          ...(uniquePromoIds.length > 0 ? { promotionUsageIds: uniquePromoIds, promotionUsageReverted: false } : {}),
          ...rewardMeta,
        },
      })
      .eq('id', order.id)
  }

  const { error: paymentError } = await supabaseAdmin
    .from('payments')
    .insert({
      order_id: order.id,
      amount: total,
      method: 'card',
      status: 'pending',
    })

  if (paymentError) throw badRequest(paymentError.message)

  const stationBaseMeta: Record<string, unknown> = {
    stationId: station.id,
    stationName: station.name,
    source: 'self-checkout',
    ...(uniquePromoIds.length > 0 ? { promotionUsageIds: uniquePromoIds, promotionUsageReverted: false } : {}),
  }

  let providerOrderId: string | null = null
  let providerStatus: CardOrderStatus = 'created'

  try {
    const payment = await stationPayment.provider.createPayment({
      totalAmount: total,
      externalReference: order.id,
      description: `Self-checkout - ${items.length} items`,
      terminalId: stationPayment.terminalId,
    }, stationPayment.credentials)

    providerOrderId = payment.providerOrderId

    await supabaseAdmin
      .from('orders')
      .update({ metadata: buildPaymentMetadata(stationBaseMeta, stationPayment.providerName, providerOrderId, 'created') })
      .eq('id', order.id)

    await supabaseAdmin
      .from('payments')
      .update({ reference: providerOrderId, provider: stationPayment.providerName })
      .eq('order_id', order.id)

    // Poll the provider immediately — payment may already be processed at the terminal
    try {
      const early = await stationPayment.provider.getPayment(providerOrderId, stationPayment.credentials)
      if (early.status === 'processed') {
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'paid',
            payment_status: 'paid',
            metadata: buildPaymentMetadata({ ...order.metadata, ...stationBaseMeta }, stationPayment.providerName, providerOrderId, 'processed', early.paymentDetail),
          })
          .eq('id', order.id)
        await supabaseAdmin
          .from('payments')
          .update({ status: 'completed' })
          .eq('order_id', order.id)
      } else if (isFailedCardStatus(early.status)) {
        await revertPromotionUsageIfNeeded(
          order.id,
          { ...stationBaseMeta },
          [],
        ).catch(() => {})
          await revertRedemption(order.id).catch(() => {})

          await supabaseAdmin
          .from('orders')
          .update({
            status: 'cancelled',
            payment_status: 'unpaid',
            metadata: buildPaymentMetadata(
              { ...order.metadata, ...stationBaseMeta, promotionUsageReverted: true },
              stationPayment.providerName,
              providerOrderId,
              early.status,
              early.paymentDetail,
            ),
          })
          .eq('id', order.id)
        await supabaseAdmin
          .from('payments')
          .update({ status: 'failed' })
          .eq('order_id', order.id)
      }
    } catch {
      // Not yet processed — client polling will catch it
    }
  } catch (err: unknown) {
    const payErr = err as { message?: string; body?: unknown }
    const detail = JSON.stringify(payErr?.body || payErr?.message || `${cardProviderDisplayName(stationPayment.providerName)} error`)

    await revertPromotionUsageIfNeeded(
      order.id,
      { ...stationBaseMeta },
      [],
    ).catch(() => {})
      await revertRedemption(order.id).catch(() => {})

      await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
        metadata: {
          ...stationBaseMeta,
          mpError: detail,
          promotionUsageReverted: true,
        },
      })
      .eq('id', order.id)

    await supabaseAdmin
      .from('payments')
      .update({ status: 'failed' })
      .eq('order_id', order.id)

    throw badRequest(`Payment error: ${payErr?.message || 'Could not connect to terminal'}`)
  }

  const { data: fullOrder } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .eq('id', order.id)
    .single()

  const enriched = fullOrder ? {
    ...fullOrder,
    customer_name: (fullOrder as Record<string, unknown>).customer ? ((fullOrder as Record<string, unknown>).customer as Record<string, unknown>).name : null,
    customer: undefined,
    metadata: { ...((fullOrder.metadata as Record<string, unknown>) || {}), mpOrderId: providerOrderId, mpOrderStatus: providerStatus },
  } : null

  if (enriched) {
    orderBus.emit('order:created', enriched)
  }

  return c.json({ data: enriched }, 201)
})

selfCheckoutRouter.get('/orders/:id', async (c) => {
  const storeId = c.get('storeId')
  const orderId = c.req.param('id')

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, status, payment_status, metadata')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .single()

  if (!order) throw notFound('Order not found')

  const meta = (order.metadata as Record<string, unknown>) || {}

  let loyaltyData: { pointsEarned: number; pointsBefore: number; pointsAfter: number } | undefined

  const providerOrderId = (meta.payment as { providerOrderId?: string } | undefined)?.providerOrderId ?? (meta.mpOrderId as string | undefined)
  const providerStatus = (meta.payment as { providerStatus?: CardOrderStatus } | undefined)?.providerStatus ?? (meta.mpOrderStatus as CardOrderStatus | undefined)

  if (providerOrderId && (providerStatus === 'created' || providerStatus === 'at_terminal')) {
    const settings = await getStoreSettings(storeId)
    const providerName = (meta.payment as { provider?: CardPaymentProviderName } | undefined)?.provider ?? getActiveCardProvider(settings)
    const credentials = getProviderCredentials(settings, providerName)
    if (credentials.accessToken) {
      try {
        const payment = await getCardProvider(providerName).getPayment(providerOrderId, credentials)
        const status = payment.status
        if (status !== providerStatus) {
          const updates: Record<string, unknown> = {
            metadata: buildPaymentMetadata(meta, providerName, providerOrderId, status, payment.paymentDetail),
          }
          if (status === 'processed') {
            updates.status = 'paid'
            updates.payment_status = 'paid'
            await supabaseAdmin
              .from('payments')
              .update({ status: 'completed' })
              .eq('order_id', orderId)
            const { processMpLoyalty } = await import('../routes/orders')
            const loyaltyResult = await processMpLoyalty(supabaseAdmin, orderId, storeId).catch(() => undefined)
            if (loyaltyResult) {
              loyaltyData = loyaltyResult
            }
          } else if (['canceled', 'expired', 'failed'].includes(status)) {
            await revertPromotionUsageIfNeeded(
              orderId,
              meta,
              [],
            ).catch(() => {})
            await revertRedemption(orderId).catch(() => {})

            updates.metadata = {
              ...(updates.metadata as Record<string, unknown>),
              promotionUsageReverted: true,
            }
            updates.status = 'cancelled'
            updates.payment_status = 'unpaid'
            await supabaseAdmin
              .from('payments')
              .update({ status: 'failed' })
              .eq('order_id', orderId)
            const { reverseMpLoyalty } = await import('../routes/orders')
            await reverseMpLoyalty(supabaseAdmin, orderId).catch(() => {})
          }
          await supabaseAdmin.from('orders').update(updates).eq('id', orderId)
          meta.mpOrderStatus = status
        }
      } catch {
      }
    }
  }

  return c.json({
    data: {
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      metadata: meta,
      ...(loyaltyData ? { loyalty: loyaltyData } : {}),
    },
  })
})

selfCheckoutRouter.post('/loyalty/scan', async (c) => {
  const storeId = c.get('storeId')
  const { barcode } = await c.req.json()
  if (!barcode) throw badRequest('barcode is required')

  const code = barcode.trim()
  const candidates = [code]

  const uuidDash = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const uuidUnderscore = /^[0-9a-f]{8}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{12}$/i
  if (uuidDash.test(code)) {
    candidates.push(code.replace(/-/g, '_'))
  } else if (uuidUnderscore.test(code)) {
    candidates.push(code.replace(/_/g, '-'))
  }

  if (code.includes('.')) {
    const suffix = code.split('.').pop()
    if (suffix && !candidates.includes(suffix)) candidates.push(suffix)
  }

  for (const candidate of candidates) {
    const { data: card } = await supabaseAdmin
      .from('loyalty_cards')
      .select('*, customers!inner(*)')
      .eq('id', candidate)
      .eq('store_id', storeId)
      .single()

    if (card) {
      const customer = card.customers as Record<string, unknown>
      delete (card as Record<string, unknown>).customers
      return c.json({ data: { customer, loyaltyCard: card } })
    }
  }

  const { data: passByBarcode } = await supabaseAdmin
    .from('digital_passes')
    .select('id')
    .in('barcode_value', candidates)
    .eq('store_id', storeId)
    .maybeSingle()

  if (passByBarcode) {
    const { data: card } = await supabaseAdmin
      .from('loyalty_cards')
      .select('*, customers!inner(*)')
      .eq('digital_pass_id', passByBarcode.id)
      .eq('store_id', storeId)
      .single()

    if (card) {
      const customer = card.customers as Record<string, unknown>
      delete (card as Record<string, unknown>).customers
      return c.json({ data: { customer, loyaltyCard: card } })
    }
  }

  const { data: passById } = await supabaseAdmin
    .from('digital_passes')
    .select('id')
    .in('id', candidates)
    .eq('store_id', storeId)
    .maybeSingle()

  if (passById) {
    const { data: card } = await supabaseAdmin
      .from('loyalty_cards')
      .select('*, customers!inner(*)')
      .eq('digital_pass_id', passById.id)
      .eq('store_id', storeId)
      .single()

    if (card) {
      const customer = card.customers as Record<string, unknown>
      delete (card as Record<string, unknown>).customers
      return c.json({ data: { customer, loyaltyCard: card } })
    }
  }

  const lowerCaseVariants = candidates.map(c => c.toLowerCase())
  const upperCaseVariants = candidates.map(c => c.toUpperCase())
  const allCaseVariants = [...new Set([...lowerCaseVariants, ...upperCaseVariants])]

  const { data: passByCase } = await supabaseAdmin
    .from('digital_passes')
    .select('id')
    .in('barcode_value', allCaseVariants)
    .eq('store_id', storeId)
    .maybeSingle()

  if (passByCase) {
    const { data: card } = await supabaseAdmin
      .from('loyalty_cards')
      .select('*, customers!inner(*)')
      .eq('digital_pass_id', passByCase.id)
      .eq('store_id', storeId)
      .single()

    if (card) {
      const customer = card.customers as Record<string, unknown>
      delete (card as Record<string, unknown>).customers
      return c.json({ data: { customer, loyaltyCard: card } })
    }
  }

  throw notFound('Tarjeta de lealtad no encontrada')
})

async function getStoreSettings(storeId: string) {
  const { data } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()
  return decryptSettings((data?.settings as Record<string, unknown>) || {})
}
