import 'dotenv/config'
import { supabaseAdmin } from '../src/lib/supabase/admin'
import { compressImageForUpload, type ImageCompressionPreset } from '../src/lib/image'

const BUCKET = 'product-images'
const APPLY = process.argv.includes('--apply')
const PAGE = 100

type ImageFile = { path: string; size: number; mimetype: string }

async function listImages(prefix = ''): Promise<ImageFile[]> {
  const all: ImageFile[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`list("${prefix}") failed: ${error.message}`)
    if (!data || data.length === 0) break
    for (const item of data) {
      if (item.id === null) continue
      const mimetype = item.metadata?.mimetype ?? ''
      if (!mimetype.startsWith('image/')) continue
      const path = prefix ? `${prefix}/${item.name}` : item.name
      all.push({ path, size: item.metadata?.size ?? 0, mimetype })
    }
    offset += PAGE
    if (data.length < PAGE) break
  }
  return all
}

function presetFor(path: string): ImageCompressionPreset {
  if (path.startsWith('receipts/')) return 'receipt'
  if (path.startsWith('logos/')) return 'logo'
  return 'product'
}

async function processImage(file: ImageFile): Promise<{ file: ImageFile; before: number; after: number; skipped: boolean; error?: string }> {
  try {
    const { data: blob, error } = await supabaseAdmin.storage.from(BUCKET).download(file.path)
    if (error || !blob) throw new Error(`download failed: ${error?.message ?? 'no data'}`)

    const buffer = Buffer.from(await blob.arrayBuffer())
    const preset = presetFor(file.path)
    const compressed = await compressImageForUpload(buffer, preset, file.mimetype)

    if (compressed.data.length >= buffer.length) {
      return { file, before: buffer.length, after: buffer.length, skipped: true }
    }

    if (APPLY) {
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(file.path, compressed.data, { contentType: compressed.contentType, upsert: true })
      if (upErr) throw new Error(`upload failed: ${upErr.message}`)
    }

    return { file, before: buffer.length, after: compressed.data.length, skipped: false }
  } catch (err) {
    return { file, before: 0, after: 0, skipped: true, error: err instanceof Error ? err.message : String(err) }
  }
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (escribiendo cambios)' : 'DRY RUN (solo análisis)'} — bucket: ${BUCKET}\n`)

  const folders = ['', 'receipts', 'logos']
  const all: ImageFile[] = []
  for (const folder of folders) {
    all.push(...(await listImages(folder)))
  }

  console.log(`Imágenes encontradas: ${all.length}\n`)

  let totalBefore = 0
  let totalAfter = 0
  let totalSkipped = 0
  let errors = 0

  for (const file of all) {
    const r = await processImage(file)
    if (r.error) {
      errors++
      console.log(`ERROR  ${file.path} — ${r.error}`)
      continue
    }
    totalBefore += r.before
    totalAfter += r.after
    if (r.skipped) {
      totalSkipped++
      continue
    }
    const savedPct = (((r.before - r.after) / r.before) * 100).toFixed(1)
    console.log(
      `  ${APPLY ? 'OK' : '→'}  ${file.path}  ${(r.before / 1024).toFixed(0)}KB → ${(r.after / 1024).toFixed(0)}KB  (-${savedPct}%)`,
    )
  }

  const saved = totalBefore - totalAfter
  console.log('\n===== RESUMEN =====')
  console.log(`  Optimizadas: ${all.length - totalSkipped - errors}  |  Sin cambios: ${totalSkipped}  |  Errores: ${errors}`)
  console.log(`  Total antes:  ${(totalBefore / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  Total después:${(totalAfter / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  Ahorro:       ${(saved / 1024 / 1024).toFixed(2)} MB (${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%)`)
  if (!APPLY) {
    console.log('\nEjecuta con --apply para escribir los cambios en Supabase.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
