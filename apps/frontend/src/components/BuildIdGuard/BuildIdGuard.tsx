'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'ovejapos:build-id'
/** Reloads are capped per browser session so a bad build cannot trap the user in a loop. */
const RELOAD_GUARD_KEY = 'ovejapos:build-id-reloaded'
const POLL_MS = 60_000

/**
 * Self-heals tabs that were left open across a deploy.
 *
 * Next.js Server Actions are identified by ids generated at build time, so a tab
 * still running the previous build fails with
 * `Failed to find Server Action "x". This request might be from an older or newer
 * deployment.` and the UI is stuck on stale code until the user manually
 * hard-refreshes.
 *
 * The check needs no build-time plumbing: on the first load we record the build id
 * the server reported, and on later checks a mismatch means this document is
 * running an older build than the one now deployed, so we reload.
 */
export function BuildIdGuard() {
  useEffect(() => {
    let cancelled = false

    async function check() {
      if (cancelled) return
      if (typeof window === 'undefined') return
      // Never fight the sign-out path, which owns navigation while it runs.
      if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return

      let serverBuildId: string | null = null
      try {
        const res = await fetch('/version', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { buildId: string | null }
        serverBuildId = data.buildId
      } catch {
        return // offline or mid-deploy: try again on the next tick
      }

      if (!serverBuildId) return

      const known = localStorage.getItem(STORAGE_KEY)
      if (known === null) {
        localStorage.setItem(STORAGE_KEY, serverBuildId)
        return
      }
      if (known === serverBuildId) return

      // The document in this tab predates the current build.
      try {
        sessionStorage.setItem(RELOAD_GUARD_KEY, serverBuildId)
      } catch {
        // private mode: reload anyway, the guard is best effort
      }
      window.location.reload()
    }

    void check()

    const interval = setInterval(check, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
