import { supabaseAdmin } from '../lib/supabase/admin'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { orderSchema } from '@ultimate-pos/shared'
import { authMiddleware } from '../middleware/auth'
import { notFound, badRequest } from '../middleware/error'

export const ordersRouter = new Hono()

ordersRouter.use('*', authMiddleware)

ordersRouter.get('/', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const status = c.req.query('status')

  let query = supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('store_id', storeId)

  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

ordersRouter.get('/:id', async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', id)
    .single()

  if (error || !data) throw notFound('Order not found')

  return c.json({ data })
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
  const settings = store?.settings as Record<string, unknown> | null
  const taxEnabled = (settings?.taxEnabled as boolean) ?? false
  const taxInclusive = (settings?.taxInclusive as boolean) ?? false
  const taxExemptEnabled = (settings?.taxExemptEnabled as boolean) ?? false

  const productIds = input.items.map((i) => i.product_id)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, tax_exempt')
    .in('id', productIds)

  const productMap = new Map((products || []).map((p) => [p.id, p]))

  let subtotal = 0
  let taxableSubtotal = 0
  const orderItems = input.items.map((item) => {
    const product = productMap.get(item.product_id)
    const unitPrice = item.unit_price ?? (product ? Number(product.price) : 0)
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

  const discount = 0

  let tax = 0
  if (taxEnabled && taxRate > 0) {
    if (taxInclusive) {
      tax = Math.round((taxableSubtotal - taxableSubtotal / (1 + taxRate)) * 100) / 100
    } else {
      tax = Math.round(taxableSubtotal * taxRate * 100) / 100
    }
  }

  const total = taxInclusive
    ? Math.round((subtotal - discount) * 100) / 100
    : Math.round((subtotal + tax - discount) * 100) / 100

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      store_id: storeId,
      created_by: userId,
      customer_id: input.customer_id || null,
      table_number: input.table_number || null,
      type: input.type || 'dine-in',
      status: 'pending',
      payment_status: 'unpaid',
      subtotal,
      tax,
      discount,
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

  if (input.customer_id) {
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

  const { data: fullOrder } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', order.id)
    .single()

  return c.json({ data: fullOrder }, 201)
})

ordersRouter.patch('/:id/status', async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const { status } = await c.req.json()

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data })
})
