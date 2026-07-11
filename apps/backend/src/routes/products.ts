import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { modifierGroupSchema, productSchema } from '@ultimate-pos/shared'
import { parse } from 'csv-parse/sync'
import { authMiddleware, requireRole } from '../middleware/auth'
import { supabaseAdmin } from '../lib/supabase/admin'
import { notFound, badRequest } from '../middleware/error'

function parseModifiers(raw: string | undefined | null) {
  if (!raw?.trim()) return []

  const groups: Array<{
    name: string
    type: 'single' | 'multi'
    is_required: boolean
    sort_order: number
    options: Array<{
      name: string
      price_adjustment: number
      sort_order: number
    }>
  }> = []

  for (const [gi, groupStr] of raw.split(';').entries()) {
    const g = groupStr.trim()
    if (!g) continue

    const match = g.match(/^([^(;]+?)(?:\(([^)]*)\))?:(.*)$/)
    if (!match) continue

    const [, name, paramsStr, optionsStr] = match
    const params = paramsStr?.split(',').map((s) => s.trim()) || []
    const type = params.includes('multi') ? 'multi' : 'single'
    const is_required = params.includes('req')

    const options = optionsStr
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((o, oi) => {
        const dollarIdx = o.lastIndexOf('$')
        if (dollarIdx > 0) {
          return {
            name: o.slice(0, dollarIdx).trim(),
            price_adjustment: parseFloat(o.slice(dollarIdx + 1)) || 0,
            sort_order: oi,
          }
        }
        return {
          name: o.trim(),
          price_adjustment: 0,
          sort_order: oi,
        }
      })

    groups.push({
      name: name.trim(),
      type,
      is_required,
      sort_order: gi,
      options,
    })
  }

  return modifierGroupSchema.array().parse(groups)
}

export const productsRouter = new Hono()

productsRouter.use('*', authMiddleware)

productsRouter.get('/', async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('pinned', { ascending: false })
    .order('name')

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

productsRouter.get('/import/template', async (c) => {
  const notes = [
    '# REQUIRED: name, price, sku',
    '# Optional: cost, barcode, category_name, description, stock_qty, track_inventory, low_stock_threshold, tax_exempt, is_active, points, modifiers',
    '# modifiers format: "GroupName(type,req):Option1$price|Option2$price;Group2(multi):Opt1|Opt2"',
    '#   type = "single" (radio) or "multi" (checkboxes)',
    '#   "req" means the group is required (omit for optional)',
    '#   Price after "$" is the extra cost for that option (omit = 0)',
  ].join('\n')
  const headers = [
    'name', 'price', 'cost', 'sku', 'barcode', 'category_name',
    'description', 'stock_qty', 'track_inventory', 'low_stock_threshold',
    'tax_exempt', 'is_active', 'points', 'modifiers',
  ].join(',')

  const example = [
    'Caramel Macchiato', '5.99', '2.50', 'BEV-001', '', 'Beverages',
    'Espresso with caramel and steamed milk', '50', 'TRUE', '10',
    'FALSE', 'TRUE', '10', '"Size(single,req):Small|Medium|Large;Extras(multi):Extra Shot$0.75|Whipped Cream$0.50|Soy Milk$0.50"',
  ].join(',')

  const csv = `${notes}\n${headers}\n${example}\n`

  c.header('Content-Type', 'text/csv')
  c.header('Content-Disposition', 'attachment; filename="product-import-template.csv"')
  return c.body(csv, 200)
})

productsRouter.get('/:id', async (c) => {
  const supabase = supabaseAdmin
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
  const supabase = supabaseAdmin
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

productsRouter.post('/import', requireRole('admin'), async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')

  const body = await c.req.parseBody()
  const file = body.file as File | undefined

  if (!file) throw badRequest('No file uploaded. Send a CSV file as the "file" field.')

  const csvText = await file.text()
  if (!csvText.trim()) throw badRequest('CSV file is empty')

  let records: Record<string, string>[]
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      comment: '#',
      relax_column_count: true,
    })
  } catch (err) {
    throw badRequest(`Invalid CSV: ${err instanceof Error ? err.message : 'parse error'}`)
  }

  if (records.length === 0) throw badRequest('CSV has no data rows')

  // Pre-fetch categories for this store
  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('store_id', storeId)

  const categoryByName = new Map<string, string>()
  if (allCategories) {
    for (const cat of allCategories) {
      categoryByName.set(cat.name.toLowerCase(), cat.id)
    }
  }

  // Pre-fetch existing products by SKU for upsert
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, sku')
    .eq('store_id', storeId)

  const productBySku = new Map<string, string>()
  if (existingProducts) {
    for (const p of existingProducts) {
      if (p.sku) productBySku.set(p.sku.toLowerCase(), p.id)
    }
  }

  // Auto-create missing categories
  const missingCategoryNames = new Set<string>()
  for (const row of records) {
    const categoryName = row.category_name?.trim()
    if (categoryName && !categoryByName.has(categoryName.toLowerCase())) {
      missingCategoryNames.add(categoryName)
    }
  }

  const categoriesCreated: string[] = []
  if (missingCategoryNames.size > 0) {
    const catInserts = Array.from(missingCategoryNames).map((name) => ({
      store_id: storeId,
      name,
    }))
    const { data: newCats, error: catError } = await supabase
      .from('categories')
      .insert(catInserts)
      .select('id, name')

    if (!catError && newCats) {
      for (const cat of newCats) {
        categoryByName.set(cat.name.toLowerCase(), cat.id)
        categoriesCreated.push(cat.name)
      }
    }
  }

  const BATCH_SIZE = 100
  const results: { imported: number; updated: number; failed: number; errors: Array<{ row: number; sku: string; message: string }>; categories_created: string[] } = {
    imported: 0,
    updated: 0,
    failed: 0,
    errors: [],
    categories_created: categoriesCreated,
  }

  const seenSkus = new Set<string>()

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const toInsert: Record<string, unknown>[] = []
    const toUpdate: { id: string; data: Record<string, unknown> }[] = []

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j]
      const rowNumber = i + j + 2 // +2 for header row + 1-indexed

      const name = row.name?.trim()
      if (!name) {
        results.failed++
        results.errors.push({ row: rowNumber, sku: row.sku || '', message: 'Name is required' })
        continue
      }

      const priceStr = row.price?.trim()
      const price = priceStr ? parseFloat(priceStr) : NaN
      if (isNaN(price) || price <= 0) {
        results.failed++
        results.errors.push({ row: rowNumber, sku: row.sku || '', message: `Invalid price: "${priceStr}"` })
        continue
      }

      const sku = row.sku?.trim()
      if (!sku) {
        results.failed++
        results.errors.push({ row: rowNumber, sku: '', message: 'SKU is required. Each product must have a unique SKU for import.' })
        continue
      }

      // Check for duplicate SKUs within the CSV
      const skuLower = sku.toLowerCase()
      if (seenSkus.has(skuLower)) {
        results.failed++
        results.errors.push({ row: rowNumber, sku, message: 'Duplicate SKU in CSV' })
        continue
      }
      seenSkus.add(skuLower)

      // Resolve category (auto-created if missing)
      let categoryId: string | null = null
      const categoryName = row.category_name?.trim()
      if (categoryName) {
        categoryId = categoryByName.get(categoryName.toLowerCase()) || null
      }

      const costStr = row.cost?.trim()
      const cost = costStr ? parseFloat(costStr) : null
      const stockQtyStr = row.stock_qty?.trim()
      const stockQty = stockQtyStr ? parseInt(stockQtyStr, 10) : null
      const lowStockStr = row.low_stock_threshold?.trim()
      const lowStock = lowStockStr ? parseInt(lowStockStr, 10) : null

      const productData: Record<string, unknown> = {
        name,
        price,
        cost: cost && !isNaN(cost) && cost > 0 ? cost : null,
        sku,
        barcode: row.barcode?.trim() || null,
        category_id: categoryId,
        description: row.description?.trim() || null,
        stock_qty: stockQty !== null && !isNaN(stockQty) && stockQty >= 0 ? stockQty : 0,
        track_inventory: row.track_inventory?.toUpperCase() === 'TRUE',
        low_stock_threshold: lowStock !== null && !isNaN(lowStock) && lowStock >= 0 ? lowStock : 10,
        tax_exempt: row.tax_exempt?.toUpperCase() === 'TRUE',
        is_active: row.is_active ? row.is_active.toUpperCase() === 'TRUE' : true,
        points: row.points ? parseInt(row.points, 10) : null,
      }

      if ('modifiers' in row) {
        const modifiersRaw = row.modifiers?.trim()
        if (modifiersRaw) {
          try {
            productData.modifiers = parseModifiers(modifiersRaw)
          } catch {
            results.failed++
            results.errors.push({ row: rowNumber, sku, message: `Invalid modifiers format for "${name}". Use format: Name(type,req):Opt$price|Opt2$price` })
            continue
          }
        } else {
          productData.modifiers = []
        }
      }

      // Upsert by SKU
      if (sku) {
        const existingId = productBySku.get(sku.toLowerCase())
        if (existingId) {
          toUpdate.push({ id: existingId, data: productData })
          continue
        }
      }

      toInsert.push({ ...productData, store_id: storeId })
    }

    // Execute batch inserts
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('products').insert(toInsert)
      if (insertError) {
        // If batch fails, fall back to individual inserts
        for (const item of toInsert) {
          const { error } = await supabase.from('products').insert(item)
          if (error) {
            results.failed++
            results.errors.push({ row: 0, sku: (item.sku as string) || '', message: error.message })
          } else {
            results.imported++
          }
        }
      } else {
        results.imported += toInsert.length
      }
    }

    // Execute batch updates
    for (const { id, data } of toUpdate) {
      const { error: updateError } = await supabase
        .from('products')
        .update(data)
        .eq('id', id)

      if (updateError) {
        results.failed++
        results.errors.push({ row: 0, sku: (data.sku as string) || '', message: updateError.message })
      } else {
        results.updated++
      }
    }
  }

  return c.json(results)
})

productsRouter.post('/upload-images', requireRole('admin'), async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')

  const body = await c.req.parseBody()
  const filesField = body['files']
  const raw: (string | File)[] = Array.isArray(filesField) ? filesField : filesField ? [filesField] : []
  const files: File[] = raw.filter((f): f is File => f instanceof File)

  if (files.length === 0) throw badRequest('No files uploaded. Send images as the "files" field.')
  if (files.length > 50) throw badRequest('Maximum 50 files per upload.')

  // Pre-fetch products by SKU for this store
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id, sku, image_url')
    .eq('store_id', storeId)

  const productBySku = new Map<string, { id: string; image_url: string | null }>()
  if (existingProducts) {
    for (const p of existingProducts) {
      if (p.sku) productBySku.set(p.sku.toLowerCase(), p)
    }
  }

  const results: Array<{ file: string; sku: string; status: 'matched' | 'unmatched'; url?: string }> = []

  for (const file of files) {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      const sku = file.name.replace(/\.[^.]+$/, '')
      results.push({ file: file.name, sku, status: 'unmatched' })
      continue
    }

    const sku = file.name.replace(/\.[^.]+$/, '')
    const skuLower = sku.toLowerCase()
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      results.push({ file: file.name, sku, status: 'unmatched' })
      continue
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(fileName)

    const match = productBySku.get(skuLower)
    if (match) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', match.id)

      if (!updateError) {
        results.push({ file: file.name, sku, status: 'matched', url: publicUrl })
      } else {
        results.push({ file: file.name, sku, status: 'unmatched', url: publicUrl })
      }
    } else {
      results.push({ file: file.name, sku, status: 'unmatched', url: publicUrl })
    }
  }

  return c.json({ data: results })
})

productsRouter.post('/upload-image', requireRole('admin'), async (c) => {
  const body = await c.req.parseBody()
  const file = body.file as File | undefined

  if (!file) throw badRequest('No file uploaded. Send an image as the "file" field.')
  if (!file.type.startsWith('image/')) throw badRequest('File must be an image.')
  if (file.size > 5 * 1024 * 1024) throw badRequest('Image must be under 5MB.')

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('product-images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw badRequest(uploadError.message)

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('product-images')
    .getPublicUrl(fileName)

  return c.json({ data: { url: publicUrl } })
})

productsRouter.delete('/upload-image', requireRole('admin'), async (c) => {
  const { url } = await c.req.json()
  if (!url || typeof url !== 'string') throw badRequest('url is required')

  const fileName = url.split('/').pop()
  if (!fileName) throw badRequest('Could not extract filename from URL')

  const { error } = await supabaseAdmin.storage
    .from('product-images')
    .remove([fileName])

  if (error) throw badRequest(error.message)

  return c.json({ message: 'Image deleted' })
})

productsRouter.post('/:id/toggle-pin', authMiddleware, async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const storeId = c.get('storeId')

  const { data: product } = await supabase
    .from('products')
    .select('pinned')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (!product) throw notFound('Product not found')

  const { data, error } = await supabase
    .from('products')
    .update({ pinned: !product.pinned })
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

productsRouter.put('/:id', requireRole('admin'), zValidator('json', productSchema), async (c) => {
  const supabase = supabaseAdmin
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

productsRouter.patch('/:id/image', requireRole('admin'), zValidator('json', z.object({ image_url: z.string().url().nullable() })), async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')
  const { image_url } = c.req.valid('json')

  const { data, error } = await supabase
    .from('products')
    .update({ image_url })
    .eq('id', id)
    .select()
    .single()

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

productsRouter.delete('/batch', requireRole('admin'), async (c) => {
  const supabase = supabaseAdmin
  const storeId = c.get('storeId')
  const { ids } = await c.req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    throw badRequest('ids must be a non-empty array')
  }

  const { data: products } = await supabase
    .from('products')
    .select('image_url')
    .in('id', ids)

  if (products) {
    const fileNames = products
      .map((p) => p.image_url?.split('/').pop())
      .filter(Boolean) as string[]
    if (fileNames.length > 0) {
      await supabaseAdmin.storage.from('product-images').remove(fileNames).catch(() => {})
    }
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('store_id', storeId)
    .in('id', ids)

  if (error) throw badRequest(error.message)

  return c.json({ deleted: ids.length })
})

productsRouter.delete('/:id', requireRole('admin'), async (c) => {
  const supabase = supabaseAdmin
  const id = c.req.param('id')

  const { data: product } = await supabase
    .from('products')
    .select('image_url')
    .eq('id', id)
    .single()

  if (product?.image_url) {
    const fileName = product.image_url.split('/').pop()
    if (fileName) {
      await supabaseAdmin.storage.from('product-images').remove([fileName]).catch(() => {})
    }
  }

  const { error } = await supabase.from('products').delete().eq('id', id)

  if (error) throw badRequest(error.message)

  return c.json({ message: 'Product deleted' })
})
