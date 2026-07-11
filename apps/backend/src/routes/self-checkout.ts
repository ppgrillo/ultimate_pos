import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase/admin'
import { selfCheckoutAuth } from '../middleware/self-checkout'
import { notFound, badRequest } from '../middleware/error'
import { mpService } from '../services/mp-point'
import type { SelfCheckoutStation } from '@ultimate-pos/shared'
import { decryptSettings } from '../lib/settings'

export const selfCheckoutRouter = new Hono()

selfCheckoutRouter.use('*', selfCheckoutAuth)

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

  return c.json({
    data: {
      store: { ...store, settings: safeSettings },
      station,
    },
  })
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

selfCheckoutRouter.post('/orders', async (c) => {
  const storeId = c.get('storeId')
  const station = c.get('station')

  const body = await c.req.json()
  const { items, customer_id, discount, discount_label } = body

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
  const mpPointAccessToken = settings.mpPointAccessToken as string | undefined

  if (!mpPointAccessToken) {
    throw badRequest('MP Point is not configured. Contact the store admin.')
  }

  if (!station.terminalId) {
    throw badRequest('Station has no terminal assigned. Contact the store admin.')
  }

  const taxRate = store.tax_rate ? Number(store.tax_rate) / 100 : 0
  const taxEnabled = (settings.taxEnabled as boolean) ?? false
  const taxInclusive = (settings.taxInclusive as boolean) ?? false
  const taxExemptEnabled = (settings.taxExemptEnabled as boolean) ?? false

  const productIds = items.map((i: { product_id: string }) => i.product_id)
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, price, tax_exempt')
    .in('id', productIds)

  const productMap = new Map((products || []).map((p) => [p.id, p]))

  let subtotal = 0
  let taxableSubtotal = 0
  const orderItems = items.map((item: { product_id: string; quantity: number; unit_price?: number; modifiers?: string[]; notes?: string | null }) => {
    const product = productMap.get(item.product_id)
    const unitPrice = item.unit_price ?? (product ? Number(product.price) : 0)
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

  const disc = discount || 0

  let tax = 0
  if (taxEnabled && taxRate > 0) {
    if (taxInclusive) {
      tax = Math.round((taxableSubtotal - taxableSubtotal / (1 + taxRate)) * 100) / 100
    } else {
      tax = Math.round(taxableSubtotal * taxRate * 100) / 100
    }
  }

  const total = taxInclusive
    ? Math.round((subtotal - disc) * 100) / 100
    : Math.round((subtotal + tax - disc) * 100) / 100

  const { data: seqData } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .eq('store_id', storeId)
    .gte('created_at', new Date().toISOString().slice(0, 10))
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

  const { error: paymentError } = await supabaseAdmin
    .from('payments')
    .insert({
      order_id: order.id,
      amount: total,
      method: 'card',
      status: 'pending',
    })

  if (paymentError) throw badRequest(paymentError.message)

  let mpOrderId: string | null = null
  let mpOrderStatus = 'created'

  try {
    const mpOrder = await mpService.createOrder(mpPointAccessToken, {
      totalAmount: total,
      externalReference: order.id,
      description: `Self-checkout - ${items.length} items`,
      terminalId: station.terminalId,
    })

    mpOrderId = mpOrder.id

    await supabaseAdmin
      .from('orders')
      .update({
        metadata: {
          stationId: station.id,
          stationName: station.name,
          source: 'self-checkout',
          mpOrderId: mpOrder.id,
          mpOrderStatus: 'created',
        },
      })
      .eq('id', order.id)

    await supabaseAdmin
      .from('payments')
      .update({ reference: mpOrder.id })
      .eq('order_id', order.id)
  } catch (err: unknown) {
    const mpErr = err as { message?: string; body?: unknown }
    const detail = JSON.stringify(mpErr?.body || mpErr?.message || 'MP Point error')

    await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled', metadata: { mpError: detail, stationId: station.id, source: 'self-checkout' } })
      .eq('id', order.id)

    await supabaseAdmin
      .from('payments')
      .update({ status: 'failed' })
      .eq('order_id', order.id)

    throw badRequest(`Payment error: ${mpErr?.message || 'Could not connect to terminal'}`)
  }

  const { data: fullOrder } = await supabaseAdmin
    .from('orders')
    .select('*, items:order_items(*), payments(*), customer:customer_id(name)')
    .eq('id', order.id)
    .single()

  return c.json({
    data: fullOrder ? {
      ...fullOrder,
      customer_name: (fullOrder as Record<string, unknown>).customer ? ((fullOrder as Record<string, unknown>).customer as Record<string, unknown>).name : null,
      customer: undefined,
      metadata: { ...((fullOrder.metadata as Record<string, unknown>) || {}), mpOrderId, mpOrderStatus },
    } : null,
  }, 201)
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

  if (meta.mpOrderId && (meta.mpOrderStatus === 'created' || meta.mpOrderStatus === 'at_terminal')) {
    const settings = await getStoreSettings(storeId)
    const accessToken = (settings?.mpPointAccessToken as string)
    if (accessToken) {
      try {
        const mpOrder = await mpService.getOrder(accessToken, meta.mpOrderId as string)
        const mpStatus = mpOrder.status
        if (mpStatus !== meta.mpOrderStatus) {
          const updates: Record<string, unknown> = {
            metadata: { ...meta, mpOrderStatus: mpStatus },
          }
          if (mpStatus === 'processed') {
            updates.status = 'paid'
            updates.payment_status = 'paid'
            await supabaseAdmin
              .from('payments')
              .update({ status: 'completed' })
              .eq('order_id', orderId)
            const { processMpLoyalty } = await import('../routes/orders')
            await processMpLoyalty(supabaseAdmin, orderId, storeId).catch(() => {})
          } else if (['canceled', 'expired', 'failed'].includes(mpStatus)) {
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
          meta.mpOrderStatus = mpStatus
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
