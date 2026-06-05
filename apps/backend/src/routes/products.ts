import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { productSchema } from '@ultimate-pos/shared'
import { authMiddleware, requireRole } from '../middleware/auth'
import { createSupabaseClient } from '../lib/supabase/server'
import { notFound, badRequest } from '../middleware/error'

export const productsRouter = new Hono()

productsRouter.use('*', authMiddleware)

productsRouter.get('/', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('name')

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

productsRouter.get('/:id', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) throw notFound('Product not found')

  return c.json({ data })
})

productsRouter.post('/', requireRole('admin'), zValidator('json', productSchema), async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const input = c.req.valid('json')
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('products')
    .insert({ ...input, store_id: storeId })
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data }, 201)
})

productsRouter.put('/:id', requireRole('admin'), zValidator('json', productSchema), async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

productsRouter.delete('/:id', requireRole('admin'), async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const id = c.req.param('id')

  const { error } = await supabase.from('products').delete().eq('id', id)

  if (error) throw badRequest(error.message)

  return c.json({ message: 'Product deleted' })
})
