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

/**
 * Guards the recovery path: a page fires many parallel requests, so without this
 * every one of them would try to sign out and redirect.
 */
let unauthorizedHandled = false

/**
 * Last-resort recovery for a 401 from the backend.
 *
 * The most common cause of a dead session is an access token the backend no longer
 * accepts (expired, or minted with a different signing secret). Retrying is
 * useless in that case, and the old behaviour just threw at every call site,
 * leaving the operator staring at a half-loaded screen with no way out.
 *
 * Clearing the NextAuth session is what actually fixes it: the next sign-in mints
 * a fresh access token. Talking to `/api/auth/signout` directly (instead of
 * `signOut()` from next-auth/react) keeps this callable from plain fetch code
 * outside the React tree.
 */
export async function recoverFromUnauthorized(): Promise<void> {
  if (unauthorizedHandled) return
  unauthorizedHandled = true

  setApiToken(null)

  if (typeof window === 'undefined') return

  try {
    const csrfRes = await fetch('/api/auth/csrf', { cache: 'no-store' })
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
    const body = new URLSearchParams({
      csrfToken,
      callbackUrl: `${window.location.origin}/login?reason=session-expired`,
    })
    await fetch('/api/auth/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
  } catch {
    // Sign-out is best effort: the redirect below still gets the user to a usable
    // login screen even if the session cookie survives.
  }

  window.location.replace(`/login?reason=session-expired`)
}

/** Test seam. */
export function __resetUnauthorizedGuard() {
  unauthorizedHandled = false
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
    if (res.status === 401) {
      void recoverFromUnauthorized()
    }
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
    if (res.status === 401) {
      void recoverFromUnauthorized()
    }
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
