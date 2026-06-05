export interface Store {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  tax_rate: number
  currency: string
  owner_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoreMember {
  id: string
  store_id: string
  user_id: string
  role: 'admin' | 'employee'
  invited_by: string | null
  is_active: boolean
  created_at: string
}
