import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      storeId: string
      role: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    store_id?: string
    role?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    storeId: string
    role: string
    accessToken?: string
  }
}
