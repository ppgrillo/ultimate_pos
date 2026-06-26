const SUPABASE_STORAGE_RE = /\/storage\/v1\/object\/public\/product-images\/(.+)/

export function proxyImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('/api/files/')) return url
  const match = url.match(SUPABASE_STORAGE_RE)
  if (match) return `/api/files/${match[1]}`
  return url
}
