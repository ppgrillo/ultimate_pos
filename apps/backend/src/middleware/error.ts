import type { ErrorHandler } from 'hono'

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(err)

  const status = err instanceof HTTPError ? err.status : 500
  const message = err instanceof HTTPError ? err.message : 'Internal Server Error'

  return c.json({ error: message }, status as Parameters<typeof c.json>[1])
}

export class HTTPError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HTTPError'
  }
}

export function notFound(message = 'Not found') {
  return new HTTPError(404, message)
}

export function badRequest(message: string) {
  return new HTTPError(400, message)
}

export function unauthorized(message = 'Unauthorized') {
  return new HTTPError(401, message)
}

export function forbidden(message = 'Forbidden') {
  return new HTTPError(403, message)
}
