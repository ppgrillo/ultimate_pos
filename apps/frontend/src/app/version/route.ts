import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

/**
 * Reports the id of the build currently deployed on the server.
 *
 * Deliberately not under `/api/*`: the middleware proxies everything below `/api`
 * to the backend, so a route there would never be reached.
 *
 * Also deliberately outside the `matcher` allowlist in `middleware.ts`, so it is
 * served by this app.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

/** `next build` writes the id next to the compiled output; the cwd differs between workspaces. */
const CANDIDATES = [
  path.join(process.cwd(), '.next', 'BUILD_ID'),
  path.join(process.cwd(), 'apps', 'frontend', '.next', 'BUILD_ID'),
  path.join('/app', 'apps', 'frontend', '.next', 'BUILD_ID'),
]

async function readBuildId(): Promise<string | null> {
  for (const candidate of CANDIDATES) {
    try {
      const id = (await readFile(candidate, 'utf8')).trim()
      if (id) return id
    } catch {
      // try the next candidate
    }
  }
  return null
}

export async function GET() {
  return NextResponse.json(
    { buildId: await readBuildId() },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  )
}
