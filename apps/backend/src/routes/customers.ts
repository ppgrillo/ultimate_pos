import { supabaseAdmin } from '../lib/supabase/admin'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { customerSchema } from '@ultimate-pos/shared'
import { authMiddleware } from '../middleware/auth'
import { notFound, badRequest } from '../middleware/error'

// Helper: Supabase returns loyalty:loyalty_cards(*) as an array (reverse FK join).
// Convert to a single object so frontend code can access loyalty.points directly.
function normalizeLoyalty<T extends { loyalty?: unknown }>(item: T): T {
  if (Array.isArray(item.loyalty)) {
    return { ...item, loyalty: item.loyalty[0] || null }
  }
  return item
}

export const customersRouter = new Hono()

customersRouter.use('*', authMiddleware)

customersRouter.get('/', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const search = c.req.query('search')
  const tag = c.req.query('tag')
  const source = c.req.query('source')
  const sort = c.req.query('sort') || 'name'

  let query = supabase
    .from('customers')
    .select('*, loyalty:loyalty_cards(*)')
    .eq('store_id', storeId)

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
    )
  }

  if (tag) {
    query = query.contains('tags', [tag])
  }

  if (source) {
    query = query.eq('source', source)
  }

  const orderMap: Record<string, { column: string; ascending: boolean }> = {
    name: { column: 'name', ascending: true },
    total_spent: { column: 'total_spent', ascending: false },
    created_at: { column: 'created_at', ascending: false },
    total_visits: { column: 'total_visits', ascending: false },
  }

  const order = orderMap[sort] || orderMap.name
  query = query.order(order.column, { ascending: order.ascending })

  const { data, error } = await query

  if (error) throw badRequest(error.message)

  return c.json({ data: (data || []).map(normalizeLoyalty) })
})

customersRouter.get('/stats', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')

  const [totalResult, newResult, topResult, visitsResult] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    (async () => {
      const { data: store } = await supabase.from('stores').select('settings').eq('id', storeId).single()
      const tz = ((store?.settings as Record<string, unknown>)?.timezone as string) || 'UTC'
      const firstOfMonth = new Date().toLocaleDateString('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' }) + '-01'
      return supabase.from('customers').select('id', { count: 'exact', head: true }).eq('store_id', storeId).gte('created_at', firstOfMonth)
    })(),
    supabase.from('customers').select('name, total_spent').eq('store_id', storeId).order('total_spent', { ascending: false }).limit(5),
    supabase.from('customers').select('total_visits').eq('store_id', storeId).order('total_visits', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (totalResult.error) throw badRequest(totalResult.error.message)

  const { data: avgData } = await supabase
    .from('orders')
    .select('total')
    .eq('store_id', storeId)
    .not('customer_id', 'is', null)

  const avgOrderValue = avgData?.length
    ? avgData.reduce((sum, o) => sum + Number(o.total), 0) / avgData.length
    : 0

  return c.json({
    data: {
      totalCustomers: totalResult.count || 0,
      newThisMonth: newResult.count || 0,
      topSpenders: topResult.data || [],
      mostVisits: visitsResult.data?.total_visits || 0,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    },
  })
})

customersRouter.get('/:id', async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('customers')
    .select('*, loyalty:loyalty_cards(*)')
    .eq('id', id)
    .single()

  if (error || !data) throw notFound('Customer not found')

  return c.json({ data: normalizeLoyalty(data) })
})

customersRouter.get('/:id/summary', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const customerId = c.req.param('id')

  const { data: customer, error: cError } = await supabase
    .from('customers')
    .select('*, loyalty:loyalty_cards(*)')
    .eq('id', customerId)
    .eq('store_id', storeId)
    .single()

  if (cError || !customer) throw notFound('Customer not found')

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*, items:order_items(*), payments(*)')
    .eq('store_id', storeId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(2)

  const lastVisit = recentOrders && recentOrders.length > 0
    ? recentOrders[0].created_at
    : null

  const upcomingBirthday = customer.birthday
    ? (() => {
        const today = new Date()
        const bd = new Date(customer.birthday)
        const thisYear = new Date(today.getFullYear(), bd.getMonth(), bd.getDate())
        const diff = thisYear.getTime() - today.getTime()
        if (diff >= 0) return Math.ceil(diff / (1000 * 60 * 60 * 24))
        const nextYear = new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate())
        return Math.ceil((nextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      })()
    : null

  return c.json({
    data: {
      customer: normalizeLoyalty(customer),
      recentOrders: recentOrders || [],
      lastVisit,
      upcomingBirthday,
    },
  })
})

customersRouter.get('/:id/orders', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const customerId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit')) || 50, 200)
  const offset = Number(c.req.query('offset')) || 0

  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*), payments(*)')
    .eq('store_id', storeId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

customersRouter.get('/:id/contact', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const customerId = c.req.param('id')

  const { data, error } = await supabase
    .from('customer_communication_log')
    .select('*')
    .eq('store_id', storeId)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

customersRouter.post('/', zValidator('json', customerSchema), async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const body = c.req.valid('json')

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...body, store_id: storeId })
    .select('*, loyalty:loyalty_cards(*)')
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data: normalizeLoyalty(data) }, 201)
})

customersRouter.patch('/:id', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const id = c.req.param('id')
  const body = await c.req.json()

  const { data: existing, error: fetchError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (fetchError || !existing) throw notFound('Customer not found')

  const payload: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }

  if (body.preferences && typeof body.preferences === 'object') {
    payload.preferences = { ...(existing.preferences as Record<string, unknown> || {}), ...body.preferences }
  }

  if (body.social_handles && typeof body.social_handles === 'object') {
    payload.social_handles = { ...(existing.social_handles as Record<string, string> || {}), ...body.social_handles }
  }

  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .select('*, loyalty:loyalty_cards(*)')
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data: normalizeLoyalty(data) })
})

customersRouter.post('/:id/contact', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const userId = c.get('userId')
  const customerId = c.req.param('id')
  const body = await c.req.json()

  const { data: log, error: logError } = await supabase
    .from('customer_communication_log')
    .insert({
      store_id: storeId,
      customer_id: customerId,
      type: body.type || 'note',
      subject: body.subject || null,
      message: body.message || null,
      sent_by: userId,
    })
    .select()
    .single()

  if (logError) throw badRequest(logError.message)

  await supabase
    .from('customers')
    .update({ last_contacted_at: new Date().toISOString() })
    .eq('id', customerId)

  return c.json({ data: log }, 201)
})
