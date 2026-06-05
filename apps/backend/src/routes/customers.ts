import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { createSupabaseClient } from '../lib/supabase/server'
import { notFound, badRequest } from '../middleware/error'

export const customersRouter = new Hono()

customersRouter.use('*', authMiddleware)

customersRouter.get('/', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .order('name')

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

customersRouter.get('/:id', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) throw notFound('Customer not found')

  return c.json({ data })
})

customersRouter.post('/', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const storeId = c.get('storeId')
  const body = await c.req.json()

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...body, store_id: storeId })
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data }, 201)
})
