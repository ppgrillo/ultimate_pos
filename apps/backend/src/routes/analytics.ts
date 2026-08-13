import { supabaseAdmin } from '../lib/supabase/admin'
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { requireAccess } from '../middleware/requireAccess'
import { badRequest } from '../middleware/error'
import {
  getDateRangeInTimezone,
  getHourInTimezone,
  getDateKeyInTimezone,
  getPreviousPeriodRange,
} from '../lib/timezone'

export const analyticsRouter = new Hono()

analyticsRouter.use('*', authMiddleware, requireAccess)

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
    .not('status', 'eq', 'cancelled')
    .not('status', 'eq', 'refunded')
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
    .not('status', 'eq', 'cancelled')
    .not('status', 'eq', 'refunded')

  const prevRevenue = (prevOrders || []).reduce((sum, o) => sum + Number(o.total || 0), 0)
  const prevOrderCount = (prevOrders || []).length
  const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null

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
      revenueChange: revenueChange === null ? null : Math.round(revenueChange * 10) / 10,
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
    .select('id, subtotal, total')
    .eq('store_id', storeId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .not('status', 'eq', 'cancelled')
    .not('status', 'eq', 'refunded')

  if (ordersError) throw badRequest(ordersError.message)

  const orderTotals = new Map<string, { subtotal: number; total: number }>()
  for (const order of orders || []) {
    orderTotals.set(order.id, {
      subtotal: Number(order.subtotal || 0),
      total: Number(order.total || 0),
    })
  }
  const orderIds = Array.from(orderTotals.keys())
  if (orderIds.length === 0) {
    return c.json({ data: [] })
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('order_id, product_id, product_name, quantity, unit_price')
    .in('order_id', orderIds)

  if (itemsError) throw badRequest(itemsError.message)

  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()

  for (const item of items || []) {
    const order = orderTotals.get(item.order_id)
    // Allocate net revenue: order.total is net of discounts (+/- tax), while the
    // line item only knows its gross unit price. Scaling by total/subtotal makes
    // product revenue sum exactly to the Revenue card.
    const factor = order && order.subtotal > 0 ? Math.max(0, order.total) / order.subtotal : 0
    const existing = productMap.get(item.product_id) || {
      name: item.product_name || item.product_id,
      quantity: 0,
      revenue: 0,
    }
    existing.quantity += item.quantity
    existing.revenue += item.quantity * Number(item.unit_price || 0) * factor
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

  const [ordersResult, prevOrdersResult, customersResult, expensesResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, subtotal, tax, discount, promo_discount, metadata, type, payment_status, created_at, payments:payments(method, status, amount)')
      .eq('store_id', storeId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .not('status', 'eq', 'cancelled')
      .not('status', 'eq', 'refunded'),
    supabase
      .from('orders')
      .select('id, total')
      .eq('store_id', storeId)
      .gte('created_at', prevStart.toISOString())
      .lte('created_at', prevEnd.toISOString())
      .not('status', 'eq', 'cancelled')
      .not('status', 'eq', 'refunded'),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    supabase
      .from('expenses')
      .select('amount, type')
      .eq('store_id', storeId)
      .gte('expense_date', getDateKeyInTimezone(start, tz))
      .lte('expense_date', getDateKeyInTimezone(end, tz)),
  ])

  const orders = ordersResult.data || []
  const prevOrders = prevOrdersResult.data || []

  let operatingExpenses = 0
  let inventoryPurchases = 0
  for (const expense of expensesResult.data || []) {
    const amount = Number(expense.amount || 0)
    if (expense.type === 'inventory') inventoryPurchases += amount
    else operatingExpenses += amount
  }

  const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const prevRevenue = prevOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
  const orderCount = orders.length
  const prevOrderCount = prevOrders.length
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0
  const prevAvgOrderValue = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0

  let grossSales = 0
  let discounts = 0
  let taxCollected = 0
  for (const order of orders) {
    grossSales += Number(order.subtotal || 0)
    taxCollected += Number(order.tax || 0)
    const rewardDiscount = Number((order.metadata as Record<string, unknown> | null)?.redeemedRewardDiscount || 0)
    discounts += Number(order.discount || 0) + Number(order.promo_discount || 0) + rewardDiscount
  }

  let itemsSold = 0
  let cogs = 0
  const orderIds = orders.map((o) => o.id)
  if (orderIds.length > 0) {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .in('order_id', orderIds)

    const productIdSet = new Set<string>()
    for (const item of orderItems || []) {
      itemsSold += item.quantity
      if (item.product_id) productIdSet.add(item.product_id)
    }

    const productIds = Array.from(productIdSet)
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, cost')
        .in('id', productIds)
      const costMap = new Map((products || []).map((p) => [p.id, p.cost]))
      for (const item of orderItems || []) {
        const cost = item.product_id ? costMap.get(item.product_id) : undefined
        if (typeof cost === 'number' && cost > 0) cogs += item.quantity * cost
      }
    }
  }

  const grossProfit = revenue - cogs
  const netProfit = grossProfit - operatingExpenses

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
  const countedOrderIds = new Set<string>()
  for (const order of orders) {
    const payments = (order as any).payments
    if (Array.isArray(payments) && payments.length > 0) {
      for (const p of payments) {
        if (p.status !== 'completed') continue
        const method = METHOD_LABELS[p.method] || p.method || 'Other'
        revenueByPayment[method] = (revenueByPayment[method] || 0) + Number(p.amount || 0)
        if (!countedOrderIds.has(order.id)) {
          ordersByPayment[method] = (ordersByPayment[method] || 0) + 1
          countedOrderIds.add(order.id)
        }
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

  const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null
  const orderChange = prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : null
  const avgChange = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 : null

  return c.json({
    data: {
      revenue: Math.round(revenue * 100) / 100,
      revenueChange: revenueChange === null ? null : Math.round(revenueChange * 10) / 10,
      orderCount,
      orderChange: orderChange === null ? null : Math.round(orderChange * 10) / 10,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      avgChange: avgChange === null ? null : Math.round(avgChange * 10) / 10,
      newCustomers: customersResult.count || 0,
      grossSales: Math.round(grossSales * 100) / 100,
      discounts: Math.round(discounts * 100) / 100,
      taxCollected: Math.round(taxCollected * 100) / 100,
      itemsSold,
      cogs: Math.round(cogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      operatingExpenses: Math.round(operatingExpenses * 100) / 100,
      inventoryPurchases: Math.round(inventoryPurchases * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
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
    .not('status', 'eq', 'cancelled')
    .not('status', 'eq', 'refunded')

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
