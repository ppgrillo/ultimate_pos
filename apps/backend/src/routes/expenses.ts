import { supabaseAdmin } from '../lib/supabase/admin'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth'
import { notFound, badRequest } from '../middleware/error'

const BUCKET = 'product-images'
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024

export const expensesRouter = new Hono()

expensesRouter.use('*', authMiddleware)

const expenseSchema = z.object({
  type: z.enum(['operating', 'inventory']),
  category: z.string().min(1),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  receipt_url: z.string().url().nullable().optional(),
})

function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

expensesRouter.get('/', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const from = c.req.query('from')
  const to = c.req.query('to')
  const type = c.req.query('type')
  const category = c.req.query('category')
  const limit = Math.min(Number(c.req.query('limit')) || 100, 500)
  const offset = Math.max(Number(c.req.query('offset')) || 0, 0)

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('store_id', storeId)

  if (from) query = query.gte('expense_date', from)
  if (to) query = query.lte('expense_date', to)
  if (type === 'operating' || type === 'inventory') query = query.eq('type', type)
  if (category) query = query.eq('category', category)

  const { data, error } = await query
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

expensesRouter.get('/summary', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const from = c.req.query('from')
  const to = c.req.query('to')

  let query = supabase
    .from('expenses')
    .select('amount, type')
    .eq('store_id', storeId)

  if (from) query = query.gte('expense_date', from)
  if (to) query = query.lte('expense_date', to)

  const { data, error } = await query

  if (error) throw badRequest(error.message)

  let operatingTotal = 0
  let inventoryTotal = 0
  for (const row of data || []) {
    const amount = Number(row.amount || 0)
    if (row.type === 'inventory') inventoryTotal += amount
    else operatingTotal += amount
  }

  return c.json({
    data: {
      operatingTotal: Math.round(operatingTotal * 100) / 100,
      inventoryTotal: Math.round(inventoryTotal * 100) / 100,
      count: (data || []).length,
    },
  })
})

expensesRouter.post('/', requireRole('admin'), zValidator('json', expenseSchema), async (c) => {
  const supabase = supabaseAdmin
  const input = c.req.valid('json')
  const storeId = c.get('storeId')
  const userId = c.get('userId')

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...input,
      store_id: storeId,
      expense_date: input.expense_date || todayKey(),
      receipt_url: input.receipt_url ?? null,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data }, 201)
})

expensesRouter.put('/:id', requireRole('admin'), zValidator('json', expenseSchema), async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const { data, error } = await supabase
    .from('expenses')
    .update({
      ...input,
      expense_date: input.expense_date || todayKey(),
      receipt_url: input.receipt_url ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw notFound('Expense not found')

  return c.json({ data })
})

expensesRouter.delete('/:id', requireRole('admin'), async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')

  const { error } = await supabase.from('expenses').delete().eq('id', id)

  if (error) throw notFound('Expense not found')

  return c.json({ message: 'Expense deleted' })
})

expensesRouter.post('/upload-receipt', requireRole('admin'), async (c) => {
  const body = await c.req.parseBody()
  const file = body.file as File | undefined

  if (!file) throw badRequest('No file uploaded. Send an image as the "file" field.')
  if (!file.type.startsWith('image/')) throw badRequest('File must be an image.')
  if (!ALLOWED_MIME.includes(file.type)) throw badRequest('Invalid file type. Allowed: PNG, JPEG, WebP, AVIF')
  if (file.size > MAX_RECEIPT_SIZE) throw badRequest('Image must be under 5MB.')

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `receipts/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw badRequest(uploadError.message)

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(fileName)

  return c.json({ data: { url: publicUrl } })
})

expensesRouter.delete('/upload-receipt', requireRole('admin'), async (c) => {
  const { url } = await c.req.json()
  if (!url || typeof url !== 'string') throw badRequest('url is required')

  const fileName = url.split('/').pop()
  if (!fileName) throw badRequest('Could not extract filename from URL')

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove([`receipts/${fileName}`])

  if (error) throw badRequest(error.message)

  return c.json({ message: 'Receipt deleted' })
})
