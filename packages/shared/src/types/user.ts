export type UserRole = 'admin' | 'employee'

export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: UserRole
  store_id: string
  is_active: boolean
  has_access: boolean
  created_at: string
}
