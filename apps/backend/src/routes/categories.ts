import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware, requireRole } from '../middleware/auth'
import { createSupabaseClient } from '../lib/supabase/server'
import { notFound, badRequest } from '../middleware/error'

export const categoriesRouter = new Hono()

categoriesRouter.use('*', authMiddleware)

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional().default(0),
})

categoriesRouter.get('/', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', storeId)
    .order('sort_order')

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

categoriesRouter.get('/:id', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) throw notFound('Category not found')

  return c.json({ data })
})

categoriesRouter.post('/', requireRole('admin'), zValidator('json', categorySchema), async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const input = c.req.valid('json')
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, store_id: storeId })
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data }, 201)
})

categoriesRouter.put('/:id', requireRole('admin'), zValidator('json', categorySchema), async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

categoriesRouter.delete('/:id', requireRole('admin'), async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const id = c.req.param('id')

  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) throw badRequest(error.message)

  return c.json({ message: 'Category deleted' })
})
