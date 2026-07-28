import type { Order } from './order'

export type CheckStatus = 'open' | 'closed' | 'void'

export interface Check {
  id: string
  store_id: string
  table_number: number
  customer_id: string | null
  status: CheckStatus
  opened_by: string
  closed_by: string | null
  void_reason: string | null
  notes: string | null
  opened_at: string
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface CheckWithOrders extends Check {
  orders: Order[]
  total: number
}
