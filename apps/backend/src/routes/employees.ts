import { Hono } from 'hono'
import { authMiddleware, requireRole } from '../middleware/auth'
import { createSupabaseClient } from '../lib/supabase/server'
import { notFound, badRequest } from '../middleware/error'

export const employeesRouter = new Hono()

employeesRouter.use('*', authMiddleware, requireRole('admin'))

employeesRouter.get('/', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('store_members')
    .select('*, user:users(*)')
    .eq('store_id', storeId)

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

employeesRouter.patch('/:id/deactivate', async (c) => {
  const supabase = createSupabaseClient(c.get('userId'))
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('store_members')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data })
})
