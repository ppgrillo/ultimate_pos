import sharp from 'sharp'

export type ImageCompressionPreset = 'product' | 'logo' | 'hero' | 'receipt'

const PRESETS: Record<ImageCompressionPreset, { maxWidth: number; maxHeight: number; quality: number }> = {
  product: { maxWidth: 1400, maxHeight: 1400, quality: 78 },
  logo: { maxWidth: 900, maxHeight: 900, quality: 82 },
  hero: { maxWidth: 1400, maxHeight: 900, quality: 76 },
  receipt: { maxWidth: 1600, maxHeight: 1600, quality: 72 },
}

function toBuffer(input: File | Buffer | Uint8Array): Promise<Buffer> {
  if (Buffer.isBuffer(input)) return Promise.resolve(input)
  if (input instanceof Uint8Array) return Promise.resolve(Buffer.from(input))
  return input.arrayBuffer().then((ab) => Buffer.from(ab))
}

function formatToContentType(format?: string, fallback = 'image/jpeg'): string {
  switch (format) {
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg'
    default:
      return fallback
  }
}

function contentTypeToExt(contentType?: string): string | null {
  switch (contentType) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/avif':
      return 'avif'
    case 'image/jpeg':
      return 'jpg'
    default:
      return null
  }
}

export async function compressImageForUpload(
  input: File | Buffer | Uint8Array,
  preset: ImageCompressionPreset,
  originalContentType?: string,
): Promise<{ data: Buffer; contentType: string; fileName: string }> {
  const buffer = await toBuffer(input)
  const config = PRESETS[preset]
  const img = sharp(buffer).rotate()
  const meta = await img.metadata()

  const width = meta.width ?? config.maxWidth
  const height = meta.height ?? config.maxHeight
  const smallEnough = width <= config.maxWidth && height <= config.maxHeight && buffer.length <= 300 * 1024

  if (smallEnough) {
    const ext = contentTypeToExt(originalContentType) ?? (meta.format === 'png' ? 'png' : meta.format === 'webp' ? 'webp' : 'jpg')
    return {
      data: buffer,
      contentType: formatToContentType(meta.format, originalContentType),
      fileName: `compressed.${ext}`,
    }
  }

  const data = await img
    .resize({ width: config.maxWidth, height: config.maxHeight, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: config.quality, effort: 4 })
    .toBuffer()

  return {
    data,
    contentType: 'image/webp',
    fileName: 'compressed.webp',
  }
}
