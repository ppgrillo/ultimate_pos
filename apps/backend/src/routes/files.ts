import { Hono } from 'hono'
import { badRequest, notFound } from '../middleware/error'
import { supabaseAdmin } from '../lib/supabase/admin'

const BUCKET = 'product-images'

export const filesRouter = new Hono()

filesRouter.get('/:path{.*}', async (c) => {
  const filePath = c.req.param('path')
  if (!filePath) throw badRequest('Missing file path')

  const { data } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(filePath)

  if (!data) throw notFound('File not found')

  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', avif: 'image/avif',
  }
  const contentType = mimeMap[ext] || 'application/octet-stream'

  const buffer = await data.arrayBuffer()

  return c.newResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
})
