const SUPABASE_STORAGE_RE = /\/storage\/v1\/object\/public\/product-images\/(.+)/

export function proxyImageUrl(url: string | null | undefined, width?: number): string | null {
  if (!url) return null
  const suffix = width ? `?w=${width}` : ''
  if (url.startsWith('/api/files/')) {
    return width ? `${url}${url.includes('?') ? '&' : '?'}w=${width}` : url
  }
  const match = url.match(SUPABASE_STORAGE_RE)
  if (match) return `/api/files/${match[1]}${suffix}`
  return url
}
