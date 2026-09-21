import { supabaseAdmin } from '../lib/supabase/admin'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth'
import { requireAccess } from '../middleware/requireAccess'
import { notFound, badRequest } from '../middleware/error'

export const suppliersRouter = new Hono()

suppliersRouter.use('*', authMiddleware, requireAccess)

const supplierSchema = z.object({
  name: z.string().min(1),
  contact_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

interface ExpenseRow {
  supplier_id: string
  amount: number | string
  expense_date: string
  delivery_days: number | null
}

function buildSupplierStats(rows: ExpenseRow[]): {
  totalSpent: number
  purchaseCount: number
  avgExpense: number
  lastPurchaseDate: string | null
  avgDeliveryDays: number | null
} {
  let totalSpent = 0
  let lastPurchaseDate: string | null = null
  let deliverySum = 0
  let deliveryCount = 0

  for (const row of rows) {
    totalSpent += Number(row.amount || 0)
    if (row.expense_date && (!lastPurchaseDate || row.expense_date > lastPurchaseDate)) {
      lastPurchaseDate = row.expense_date
    }
    if (row.delivery_days != null && row.delivery_days > 0) {
      deliverySum += Number(row.delivery_days)
      deliveryCount++
    }
  }

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    purchaseCount: rows.length,
    avgExpense: rows.length > 0 ? Math.round((totalSpent / rows.length) * 100) / 100 : 0,
    lastPurchaseDate,
    avgDeliveryDays: deliveryCount > 0 ? Math.round((deliverySum / deliveryCount) * 100) / 100 : null,
  }
}

async function fetchStatsMap(supplierIds: string[]): Promise<Map<string, ReturnType<typeof buildSupplierStats>>> {
  const map = new Map<string, ReturnType<typeof buildSupplierStats>>()
  if (supplierIds.length === 0) return map

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('supplier_id, amount, expense_date, delivery_days')
    .in('supplier_id', supplierIds)

  if (error) return map

  const grouped = new Map<string, ExpenseRow[]>()
  for (const row of data as ExpenseRow[]) {
    const list = grouped.get(row.supplier_id) || []
    list.push(row)
    grouped.set(row.supplier_id, list)
  }
  for (const [id, rows] of grouped) {
    map.set(id, buildSupplierStats(rows))
  }
  return map
}

suppliersRouter.get('/', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const search = c.req.query('search')

  let query = supabase.from('suppliers').select('*').eq('store_id', storeId)
  if (search) {
    const term = `%${search}%`
    query = query.or(`name.ilike.${term},contact_name.ilike.${term}`)
  }

  const { data, error } = await query.order('name')

  if (error) throw badRequest(error.message)

  const suppliers = data || []
  const statsMap = await fetchStatsMap(suppliers.map((s) => s.id))

  return c.json({
    data: suppliers.map((supplier) => ({
      ...supplier,
      stats: statsMap.get(supplier.id) || buildSupplierStats([]),
    })),
  })
})

suppliersRouter.post('/', requireRole('admin'), zValidator('json', supplierSchema), async (c) => {
  const supabase = supabaseAdmin
  const input = c.req.valid('json')
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...input, store_id: storeId, is_active: input.is_active ?? true })
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data: { ...data, stats: buildSupplierStats([]) } }, 201)
})

suppliersRouter.get('/:id', async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) throw notFound('Supplier not found')

  const statsMap = await fetchStatsMap([data.id])

  return c.json({ data: { ...data, stats: statsMap.get(data.id) || buildSupplierStats([]) } })
})

suppliersRouter.get('/:id/expenses', async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const from = c.req.query('from')
  const to = c.req.query('to')

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('supplier_id', id)

  if (from) query = query.gte('expense_date', from)
  if (to) query = query.lte('expense_date', to)

  const { data, error } = await query
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

suppliersRouter.put('/:id', requireRole('admin'), zValidator('json', supplierSchema), async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const { data, error } = await supabase
    .from('suppliers')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw notFound('Supplier not found')

  const statsMap = await fetchStatsMap([data.id])

  return c.json({ data: { ...data, stats: statsMap.get(data.id) || buildSupplierStats([]) } })
})

suppliersRouter.delete('/:id', requireRole('admin'), async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')

  const { error: detachError } = await supabase
    .from('expenses')
    .update({ supplier_id: null })
    .eq('supplier_id', id)

  if (detachError) throw badRequest(detachError.message)

  const { error } = await supabase.from('suppliers').delete().eq('id', id)

  if (error) throw notFound('Supplier not found')

  return c.json({ message: 'Supplier deleted' })
})