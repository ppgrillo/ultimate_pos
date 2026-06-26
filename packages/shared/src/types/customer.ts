export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface PreferenceField {
  key: string
  label: string
  type: 'text' | 'select' | 'multiselect'
  options?: string[]
  placeholder?: string
}

export interface Customer {
  id: string
  store_id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  tags: string[]
  preferences: Record<string, unknown>
  birthday: string | null
  source: string | null
  social_handles: Record<string, string>
  preferred_contact: string | null
  last_contacted_at: string | null
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
  digital_pass_id: string | null
  created_at: string
  updated_at: string
}

export interface CommunicationLog {
  id: string
  store_id: string
  customer_id: string
  type: 'sms' | 'email' | 'whatsapp' | 'call' | 'note'
  subject: string | null
  message: string | null
  sent_by: string | null
  response: string | null
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
  amount_given?: number | null
  change_due?: number | null
  created_at: string
}

export type PaymentMethod = Payment['method']
