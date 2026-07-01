import type { MiddlewareHandler } from 'hono'
import { jwtVerify } from 'jose'
import { unauthorized } from './error'
import { supabaseAdmin } from '../lib/supabase/admin'
import type { SelfCheckoutStation } from '@ultimate-pos/shared'

declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    storeId: string
    role: string
    token: string
    stationId: string
    station: SelfCheckoutStation
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
    c.set('token', token)
    await next()
  } catch {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (error || !user) throw unauthorized('Invalid token')

      c.set('userId', user.id)
      c.set('token', token)

      const { data: membership } = await supabaseAdmin
        .from('store_members')
        .select('store_id, role')
        .eq('profile_id', user.id)
        .maybeSingle()

      c.set('storeId', membership?.store_id ?? '')
      c.set('role', membership?.role ?? '')
      await next()
    } catch {
      throw unauthorized('Invalid or expired token')
    }
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
