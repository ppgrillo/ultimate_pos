export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Customer {
  id: string
  store_id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  total_visits: number
  total_spent: number
  created_at: string
  updated_at: string
}

export interface LoyaltyCard {
  id: string
  store_id: string
  customer_id: string
  points: number
  tier: LoyaltyTier
  google_pass_id: string | null
  apple_pass_id: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  method: 'cash' | 'card' | 'transfer' | 'wallet' | 'other'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  reference: string | null
  terminal_provider?: string | null
  amount_given?: number | null
  change_due?: number | null
  created_at: string
}

export type PaymentMethod = Payment['method']
