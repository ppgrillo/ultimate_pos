import type { MiddlewareHandler } from 'hono'
import { jwtVerify } from 'jose'
import { unauthorized } from './error'

declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    storeId: string
    role: string
  }
}

const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw unauthorized('Missing or invalid token')
  }

  const token = authHeader.slice(7)

  try {
    const { payload } = await jwtVerify(token, getSecret())

    c.set('userId', payload.sub as string)
    c.set('storeId', payload.store_id as string)
    c.set('role', payload.role as string)

    await next()
  } catch {
    throw unauthorized('Invalid or expired token')
  }
}

export const requireRole = (...roles: string[]): MiddlewareHandler => {
  return async (c, next) => {
    const userRole = c.get('role')
    if (!roles.includes(userRole)) {
      throw unauthorized('Insufficient permissions')
    }
    await next()
  }
}
