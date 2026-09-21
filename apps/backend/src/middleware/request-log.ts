import type { MiddlewareHandler } from 'hono'
import { createHash, randomUUID } from 'node:crypto'

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string
  }
}

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

export const requestLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const requestId = randomUUID()
    c.set('requestId', requestId)

    const start = performance.now()
    const method = c.req.method
    const path = c.req.path
    const contentType = c.req.header('content-type') || ''

    let bodyHash: string | undefined
    if (WRITE_METHODS.includes(method) && !contentType.includes('multipart/form-data')) {
      const text = await c.req.raw.clone().text().catch(() => '')
      if (text) bodyHash = createHash('sha256').update(text).digest('hex')
    }

    let status = 500
    let errorMessage: string | undefined
    try {
      await next()
      status = c.res.status
    } catch (err) {
      status = c.res.status || 500
      errorMessage = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const durationMs = Math.round(performance.now() - start)
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          requestId,
          method,
          path,
          status,
          durationMs,
          userId: c.get('userId') || undefined,
          storeId: c.get('storeId') || undefined,
          role: c.get('role') || undefined,
          stationId: c.get('stationId') || undefined,
          bodyHash,
          error: errorMessage,
        }),
      )
    }
  }
}