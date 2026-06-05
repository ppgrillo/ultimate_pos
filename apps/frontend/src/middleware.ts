import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

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
    return NextResponse.rewrite(new URL(destPath, API_URL))
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
