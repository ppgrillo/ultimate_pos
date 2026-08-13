import type { MiddlewareHandler } from 'hono'
import { forbidden } from './error'
import { getBillingInfo } from '../lib/billing'

/**
 * Backend enforcement of the subscription paywall. Must run AFTER authMiddleware.
 * Blocks authenticated users whose billing record is not in an active state.
 */
export const requireAccess: MiddlewareHandler = async (c, next) => {
  const userId = c.get('userId')
  if (!userId) {
    throw forbidden('No access')
  }

  const info = await getBillingInfo(userId)
  if (!info.hasAccess) {
    throw forbidden('Active subscription required to use Oveja POS')
  }

  await next()
}
