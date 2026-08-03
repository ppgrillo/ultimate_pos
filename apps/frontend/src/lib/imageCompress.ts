const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.7

export interface CompressedImage {
  file: File
  url: string
  width: number
  height: number
  bytes: number
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image file'))
    }
    img.src = url
  })
}

function scaleDown(size: { width: number; height: number }): { width: number; height: number } {
  if (size.width <= MAX_DIMENSION && size.height <= MAX_DIMENSION) return size
  const ratio = Math.min(MAX_DIMENSION / size.width, MAX_DIMENSION / size.height)
  return {
    width: Math.round(size.width * ratio),
    height: Math.round(size.height * ratio),
  }
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new Error('File is not an image')
  if (file.type === 'image/png' || file.type === 'image/webp') {
    return { file, url: URL.createObjectURL(file), width: 0, height: 0, bytes: file.size }
  }

  const img = await loadImage(file)
  const target = scaleDown({ width: img.naturalWidth, height: img.naturalHeight })

  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported in this browser')
  ctx.drawImage(img, 0, 0, target.width, target.height)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
  if (!blob) throw new Error('Could not encode image')

  const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  return {
    file: compressed,
    url: URL.createObjectURL(compressed),
    width: target.width,
    height: target.height,
    bytes: compressed.size,
  }
}
