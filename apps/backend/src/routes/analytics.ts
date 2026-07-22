import { supabaseAdmin } from '../lib/supabase/admin'
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { badRequest } from '../middleware/error'
import {
  getDateRangeInTimezone,
  getHourInTimezone,
  getDateKeyInTimezone,
  getPreviousPeriodRange,
} from '../lib/timezone'

export const analyticsRouter = new Hono()

analyticsRouter.use('*', authMiddleware)

async function getStoreTimezone(storeId: string, queryTz?: string | null): Promise<string> {
  if (queryTz) return queryTz
  const { data } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()
  return ((data?.settings as Record<string, unknown>)?.timezone as string) || 'UTC'
}

analyticsRouter.get('/sales', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const period = c.req.query('period') || 'today'
  const from = c.req.query('from')
  const to = c.req.query('to')
  const tz = await getStoreTimezone(storeId, c.req.query('tz'))

  const { start, end } = getDateRangeInTimezone(period, tz, from, to)

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total, status, type, payment_status, created_at')
    .eq('store_id', storeId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw badRequest(error.message)

  const revenue = (orders || []).reduce((sum, o) => sum + Number(o.total || 0), 0)
  const orderCount = (orders || []).length
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0

  const { prevStart, prevEnd } = getPreviousPeriodRange(start, end)

  const { data: prevOrders } = await supabase
    .from('orders')
    .select('id, total')
    .eq('store_id', storeId)
    .gte('created_at', prevStart.toISOString())
    .lte('created_at', prevEnd.toISOString())

  const prevRevenue = (prevOrders || []).reduce((sum, o) => sum + Number(o.total || 0), 0)
  const prevOrderCount = (prevOrders || []).length
  const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : revenue > 0 ? 100 : 0

  const isHourly = period === 'today' || (period === 'custom' && from && to && from === to)

  let revenueByTime: Array<{ label: string; revenue: number; count: number }>

  if (isHourly) {
    const hourMap = new Map<number, { revenue: number; count: number }>()
    for (let h = 0; h < 24; h++) hourMap.set(h, { revenue: 0, count: 0 })

    for (const order of orders || []) {
      const hour = getHourInTimezone(new Date(order.created_at), tz)
      const entry = hourMap.get(hour)!
      entry.revenue += Number(order.total || 0)
      entry.count += 1
    }

    revenueByTime = Array.from(hourMap.entries()).map(([hour, data]) => ({
      label: `${hour.toString().padStart(2, '0')}:00`,
      revenue: Math.round(data.revenue * 100) / 100,
      count: data.count,
    }))
  } else {
    const dayMap = new Map<string, { revenue: number; count: number }>()

    for (const order of orders || []) {
      const dateKey = getDateKeyInTimezone(new Date(order.created_at), tz)
      const existing = dayMap.get(dateKey) || { revenue: 0, count: 0 }
      existing.revenue += Number(order.total || 0)
      existing.count += 1
      dayMap.set(dateKey, existing)
    }

    revenueByTime = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        label: date,
        revenue: Math.round(data.revenue * 100) / 100,
        count: data.count,
      }))
  }

  return c.json({
    data: {
      revenue: Math.round(revenue * 100) / 100,
      orderCount,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      previousPeriodRevenue: Math.round(prevRevenue * 100) / 100,
      revenueChange: Math.round(revenueChange * 10) / 10,
      revenueByTime,
    },
  })
})

analyticsRouter.get('/products', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const period = c.req.query('period') || 'today'
  const from = c.req.query('from')
  const to = c.req.query('to')
  const limit = Math.min(Number(c.req.query('limit')) || 10, 50)
  const tz = await getStoreTimezone(storeId, c.req.query('tz'))

  const { start, end } = getDateRangeInTimezone(period, tz, from, to)

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('store_id', storeId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .not('status', 'eq', 'cancelled')

  if (ordersError) throw badRequest(ordersError.message)

  const orderIds = (orders || []).map((o) => o.id)
  if (orderIds.length === 0) {
    return c.json({ data: [] })
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, product_name, quantity, unit_price')
    .in('order_id', orderIds)

  if (itemsError) throw badRequest(itemsError.message)

  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()

  for (const item of items || []) {
    const existing = productMap.get(item.product_id) || {
      name: item.product_name || item.product_id,
      quantity: 0,
      revenue: 0,
    }
    existing.quantity += item.quantity
    existing.revenue += item.quantity * Number(item.unit_price || 0)
    productMap.set(item.product_id, existing)
  }

  const topProducts = Array.from(productMap.entries())
    .map(([productId, data]) => ({
      productId,
      name: data.name,
      quantitySold: data.quantity,
      revenue: Math.round(data.revenue * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)

  return c.json({ data: topProducts })
})

analyticsRouter.get('/overview', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const period = c.req.query('period') || 'today'
  const from = c.req.query('from')
  const to = c.req.query('to')
  const tz = await getStoreTimezone(storeId, c.req.query('tz'))

  const { start, end } = getDateRangeInTimezone(period, tz, from, to)
  const { prevStart, prevEnd } = getPreviousPeriodRange(start, end)

  const [ordersResult, prevOrdersResult, customersResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, type, payment_status, created_at, payments:payments(method, status, amount)')
      .eq('store_id', storeId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    supabase
      .from('orders')
      .select('id, total')
      .eq('store_id', storeId)
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString()),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
  ])

  const orders = ordersResult.data || []
  const prevOrders = prevOrdersResult.data || []

  const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const prevRevenue = prevOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const orderCount = orders.length
  const prevOrderCount = prevOrders.length
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0
  const prevAvgOrderValue = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0

  const TYPE_LABELS: Record<string, string> = {
    'dine-in': 'Dine-in',
    'takeaway': 'Takeaway',
    'delivery': 'Delivery',
  }

  const ordersByType: Record<string, number> = {}
  for (const order of orders) {
    const t = TYPE_LABELS[order.type] || order.type || 'Other'
    ordersByType[t] = (ordersByType[t] || 0) + 1
  }

  const METHOD_LABELS: Record<string, string> = {
    'cash': 'Cash',
    'card': 'Card',
    'transfer': 'Transfer',
    'mercadopago': 'Mercado Pago',
    'mp_point': 'MP Point',
  }

  const ordersByPayment: Record<string, number> = {}
  const revenueByPayment: Record<string, number> = {}
  for (const order of orders) {
    const payments = (order as any).payments
    if (Array.isArray(payments) && payments.length > 0) {
      for (const p of payments) {
        const method = METHOD_LABELS[p.method] || p.method || 'Other'
        ordersByPayment[method] = (ordersByPayment[method] || 0) + 1
        revenueByPayment[method] = (revenueByPayment[method] || 0) + Number(p.amount || 0)
      }
    } else if (order.payment_status === 'paid') {
      ordersByPayment['Other'] = (ordersByPayment['Other'] || 0) + 1
      revenueByPayment['Other'] = (revenueByPayment['Other'] || 0) + Number(order.total || 0)
    }
  }

  const paymentStatusBreakdown: Record<string, number> = {}
  for (const order of orders) {
    const status = order.payment_status || 'unknown'
    paymentStatusBreakdown[status] = (paymentStatusBreakdown[status] || 0) + 1
  }

  const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : revenue > 0 ? 100 : 0
  const orderChange = prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : orderCount > 0 ? 100 : 0
  const avgChange = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : avgOrderValue > 0 ? 100 : 0

  return c.json({
    data: {
      revenue: Math.round(revenue * 100) / 100,
      revenueChange: Math.round(revenueChange * 10) / 10,
      orderCount,
      orderChange: Math.round(orderChange * 10) / 10,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      avgChange: Math.round(avgChange * 10) / 10,
      newCustomers: customersResult.count || 0,
      ordersByType,
      ordersByPayment,
      revenueByPayment,
      paymentStatusBreakdown,
    },
  })
})

analyticsRouter.get('/dashboard-stats', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const tz = await getStoreTimezone(storeId, c.req.query('tz'))

  const startOfDay = new Date()
  const { start: todayStart } = getDateRangeInTimezone('today', tz)

  const { data: todayOrders, error } = await supabase
    .from('orders')
    .select('id, total, status, created_at')
    .eq('store_id', storeId)
    .gte('created_at', todayStart.toISOString())

  if (error) throw badRequest(error.message)

  const todayRevenue = (todayOrders || []).reduce((sum, o) => sum + Number(o.total || 0), 0)
  const todayOrderCount = (todayOrders || []).length
  const activeOrders = (todayOrders || []).filter(
    (o) => o.status === 'pending' || o.status === 'preparing',
  ).length

  const hourMap = new Map<number, { revenue: number; count: number }>()
  for (let h = 0; h < 24; h++) hourMap.set(h, { revenue: 0, count: 0 })
  for (const order of todayOrders || []) {
    const hour = getHourInTimezone(new Date(order.created_at), tz)
    const entry = hourMap.get(hour)!
    entry.revenue += Number(order.total || 0)
    entry.count += 1
  }

  const salesByHour = Array.from(hourMap.entries()).map(([hour, data]) => ({
    hour,
    label: `${hour.toString().padStart(2, '0')}:00`,
    revenue: Math.round(data.revenue * 100) / 100,
    count: data.count,
  }))

  return c.json({
    data: {
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      todayOrderCount,
      activeOrders,
      avgOrderValue: todayOrderCount > 0 ? Math.round((todayRevenue / todayOrderCount) * 100) / 100 : 0,
      salesByHour,
    },
  })
})
