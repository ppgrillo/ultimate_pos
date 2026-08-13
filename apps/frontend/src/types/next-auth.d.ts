import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      storeId: string
      role: string
      hasAccess: boolean
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    store_id?: string
    role?: string
    has_access?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    storeId: string
    role: string
    hasAccess?: boolean
    accessToken?: string
  }
}
