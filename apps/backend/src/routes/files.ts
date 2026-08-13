import { Hono } from 'hono'
import sharp from 'sharp'
import { badRequest, notFound } from '../middleware/error'
import { supabaseAdmin } from '../lib/supabase/admin'

const BUCKET = 'product-images'
const MAX_RESIZE_WIDTH = 2000

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
  let contentType = mimeMap[ext] || 'application/octet-stream'
  let body: Uint8Array<ArrayBuffer> = new Uint8Array(await data.arrayBuffer())

  const widthParam = c.req.query('w')
  const width = widthParam ? Number.parseInt(widthParam, 10) : NaN
  if (Number.isInteger(width) && width > 0 && width <= MAX_RESIZE_WIDTH && contentType.startsWith('image/')) {
    try {
      const resized = await sharp(Buffer.from(body))
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      body = Uint8Array.from(resized)
      contentType = 'image/webp'
    } catch (err) {
      console.warn(`[files] Failed to resize ${filePath}: ${(err as Error).message}`)
    }
  }

  return c.newResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
    },
  })
})
