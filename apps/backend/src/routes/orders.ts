import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { orderSchema } from '@ultimate-pos/shared'
import { authMiddleware } from '../middleware/auth'
import { createSupabaseClient } from '../lib/supabase/server'
import { notFound, badRequest } from '../middleware/error'

export const ordersRouter = new Hono()

ordersRouter.use('*', authMiddleware)

ordersRouter.get('/', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
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
  const supabase = createSupabaseClient(c.get('userId'))
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
  const supabase = createSupabaseClient(c.get('userId'))
  const input = c.req.valid('json')
  const storeId = c.get('storeId')
  const employeeId = c.get('userId')

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      store_id: storeId,
      employee_id: employeeId,
      customer_id: input.customer_id || null,
      table_number: input.table_number || null,
      status: 'pending',
      payment_status: 'unpaid',
      notes: input.notes,
    })
    .select()
    .single()

  if (orderError) throw badRequest(orderError.message)

  const orderItems = input.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    modifiers: item.modifiers,
    notes: item.notes,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems)

  if (itemsError) throw badRequest(itemsError.message)

  const { data: fullOrder } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', order.id)
    .single()

  return c.json({ data: fullOrder }, 201)
})

ordersRouter.patch('/:id/status', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
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
