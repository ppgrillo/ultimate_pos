const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

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

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
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

  delete: <T>(path: string, options?: ApiOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
