'use client'

import { useEffect } from 'react'
import { useSession, SessionProvider } from 'next-auth/react'
import { Provider, useDispatch } from 'react-redux'
import { store } from './index'
import type { AppDispatch } from './index'
import { setApiToken } from '@/lib/api/client'
import { setUser } from './slices/authSlice'
import type { User } from '@ultimate-pos/shared'

/**
 * Runs inside the Redux Provider so it can use useDispatch.
 * Bridges the NextAuth session → Redux auth state on every session change.
 */
function SessionSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    const raw = session?.user as any

    // Sync access token to HTTP client
    setApiToken(raw?.accessToken ?? null)

    // Sync user into Redux so components can read role/store_id without useSession
    if (session?.user && raw?.accessToken) {
      const user: User = {
        id: raw.id ?? '',
        email: session.user.email ?? '',
        name: session.user.name ?? null,
        avatar_url: session.user.image ?? null,
        role: raw.role ?? 'employee',
        store_id: raw.storeId ?? '',
        is_active: true,
        created_at: '',
      }
      dispatch(setUser(user))
    } else {
      dispatch(setUser(null))
    }
  }, [session, dispatch])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Provider store={store}>
        <SessionSyncProvider>{children}</SessionSyncProvider>
      </Provider>
    </SessionProvider>
  )
}
