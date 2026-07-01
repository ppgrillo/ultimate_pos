import { auth } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const protectedPaths = [
  '/dashboard',
  '/pos',
  '/products',
  '/orders',
  '/employees',
  '/customers',
  '/settings',
]

const apiRoutesWithHandlers = ['/api/auth', '/api/register']

function matchesAny(path: string, patterns: string[]) {
  return patterns.some((p) => path === p || path.startsWith(p + '/'))
}

export default auth((req) => {
  const path = req.nextUrl.pathname

  if (path.startsWith('/api/') && !matchesAny(path, apiRoutesWithHandlers)) {
    const destPath = path.replace('/api', '')
    const dest = new URL(destPath + req.nextUrl.search, API_URL)

    const headers = new Headers(req.headers)
    // req.auth is the Session object; accessToken lives on session.user
    const existingAuth = headers.get('Authorization')
    if (!existingAuth) {
      const accessToken = (req.auth as any)?.user?.accessToken as string | undefined
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`)
      }
    }

    const isBodyMethod = !['GET', 'HEAD'].includes(req.method)
    return fetch(dest, {
      method: req.method,
      headers,
      body: isBodyMethod ? req.body : undefined,
      // @ts-expect-error duplex required for streaming bodies in Node
      duplex: isBodyMethod ? 'half' : undefined,
    })
  }

  if (matchesAny(path, protectedPaths) && !req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', path)
    return Response.redirect(loginUrl)
  }
})

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/pos/:path*',
    '/products/:path*',
    '/orders/:path*',
    '/employees/:path*',
    '/customers/:path*',
    '/settings/:path*',
  ],
}
