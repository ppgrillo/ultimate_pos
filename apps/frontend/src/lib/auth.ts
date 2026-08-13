import NextAuth, { CredentialsSignin } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthConfig } from 'next-auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const config: NextAuthConfig = {
    providers: [
      GoogleProvider({
        clientId: process.env.AUTH_GOOGLE_ID ?? '',
        clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
      }),
      {
        id: 'credentials',
        name: 'credentials',
        type: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          try {
            const res = await fetch(`${API_URL}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(credentials),
            })
            if (!res.ok) {
              const err = await res.json().catch(() => ({}))
              throw new CredentialsSignin(err.message || 'Invalid credentials')
            }
            const user = await res.json()
            return user
          } catch (e) {
            if (e instanceof CredentialsSignin) throw e
            throw new CredentialsSignin('Login failed')
          }
        },
      },
    ],
    callbacks: {
      async signIn({ account, profile }) {
        if (account?.provider === 'google' && profile?.email) {
          try {
            const res = await fetch(`${API_URL}/auth/check-google`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: profile.email,
                name: profile.name,
                avatar_url: (profile as any).image || (profile as any).picture,
              }),
            })
            if (!res.ok) return false
          } catch {
            return false
          }
        }
        return true
      },
      async jwt({ token, account, user }) {
        if (account) {
          if (account.provider === 'credentials') {
            token.id = user.id
            token.storeId = user.store_id
            token.role = user.role
            token.hasAccess = user.has_access
            token.accessToken = (user as any).access_token
          }
          if (account.provider === 'google') {
            try {
              const email = token.email || account.providerAccountId
              const res = await fetch(`${API_URL}/auth/me?email=${encodeURIComponent(email as string)}`, {
                headers: { 'Content-Type': 'application/json' },
              })
              if (res.ok) {
                const data = await res.json()
                token.id = data.profile_id
                token.storeId = data.store_id
                token.role = data.role
                token.hasAccess = data.has_access
                token.accessToken = data.access_token
              }
            } catch {
              // user exists but no store yet
            }
          }
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string ?? token.sub ?? ''
          session.user.storeId = token.storeId as string
          session.user.role = token.role as string
          session.user.hasAccess = Boolean(token.hasAccess)
          ;(session.user as any).accessToken = token.accessToken as string
        }
        return session
      },
    },
  pages: {
    signIn: '/login',
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
