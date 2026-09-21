export interface Supplier {
  id: string
  store_id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SupplierStats {
  totalSpent: number
  purchaseCount: number
  avgExpense: number
  lastPurchaseDate: string | null
  avgDeliveryDays: number | null
}

export interface SupplierWithStats extends Supplier {
  stats: SupplierStats
}

export interface SupplierInput {
  name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  notes?: string | null
  is_active?: boolean
}