import type { MiddlewareHandler } from 'hono'
import { jwtVerify } from 'jose'
import { unauthorized } from './error'
import { supabaseAdmin } from '../lib/supabase/admin'
import type { SelfCheckoutStation } from '@ultimate-pos/shared'

const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export const selfCheckoutAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw unauthorized('Missing or invalid token')
  }

  const token = authHeader.slice(7)

  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.role !== 'self_checkout') {
      throw unauthorized('Invalid token role')
    }

    const storeId = payload.store_id as string
    const stationId = payload.station_id as string

    if (!storeId || !stationId) {
      throw unauthorized('Invalid token payload')
    }

    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('settings')
      .eq('id', storeId)
      .single()

    if (!store) throw unauthorized('Store not found')

    const settings = (store.settings as Record<string, unknown>) || {}
    const stations = (settings.selfCheckoutStations as SelfCheckoutStation[]) || []
    const station = stations.find((s) => s.id === stationId)

    if (!station) throw unauthorized('Station not found')
    if (!station.isActive) throw unauthorized('Station is deactivated')

    c.set('storeId', storeId)
    c.set('stationId', stationId)
    c.set('station', station)
    c.set('role', 'self_checkout')
    c.set('token', token)

    await next()
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'response' in err) throw err
    throw unauthorized('Invalid or expired token')
  }
}
