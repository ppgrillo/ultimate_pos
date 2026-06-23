// Always route through the Next.js middleware proxy (/api/*).
// NEXT_PUBLIC_API_URL is used server-side only (middleware.ts) for the actual
// backend destination. The client must never call the backend directly to
// avoid CORS issues.
const API_BASE = '/api'

let _token: string | null = null

export function setApiToken(token: string | null) {
  _token = token
  ;(globalThis as any).__apiToken = token
}

export function getApiToken() {
  return _token
}

interface ApiOptions extends RequestInit {
  params?: Record<string, string>
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options

  let url = `${API_BASE}${path}`

  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`
  }

  const res = await fetch(url, {
    headers,
    ...fetchOptions,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const errMsg = typeof body?.error === 'string'
      ? body.error
      : body?.error?.issues
        ? body.error.issues.map((i: any) => i.message).join('; ')
        : body?.error?.message || body?.message || `HTTP ${res.status}`
    const err = new Error(errMsg)
    ;(err as any).body = body
    ;(err as any).status = res.status
    throw err
  }

  return res.json()
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {}
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const err = new Error(
      body?.error?.message || body?.message || `HTTP ${res.status}`,
    )
    ;(err as any).body = body
    ;(err as any).status = res.status
    throw err
  }

  return res.json()
}

export const api = {
  get: <T>(path: string, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),

  upload: <T>(path: string, formData: FormData) =>
    uploadRequest<T>(path, formData),
}
