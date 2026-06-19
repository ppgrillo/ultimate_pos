import type { Payment } from './customer'

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled'

export type OrderType = 'dine-in' | 'takeaway' | 'delivery'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface Order {
  id: string
  store_id: string
  customer_id: string | null
  created_by: string
  table_number: number | null
  order_number: number | null
  status: OrderStatus
  type: OrderType
  payment_status: PaymentStatus
  subtotal: number
  tax: number
  discount: number
  total: number
  items: OrderItem[]
  payments?: Payment[]
  customer_name?: string | null
  notes: string | null
  metadata: OrderMetadata
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name?: string
  quantity: number
  unit_price: number
  modifiers: string[]
  notes: string | null
}

export interface OrderStatusTransition {
  from: OrderStatus
  to: OrderStatus
  label: string
}

export const KITCHEN_FLOW: OrderStatusTransition[] = [
  { from: 'pending',   to: 'preparing', label: 'Preparing' },
  { from: 'preparing', to: 'ready',     label: 'Ready to Serve' },
  { from: 'ready',     to: 'served',    label: 'Mark Served' },
  { from: 'served',    to: 'paid',      label: 'Complete Payment' },
]

export function getNextKitchenTransitions(current: OrderStatus): OrderStatusTransition[] {
  const next = KITCHEN_FLOW.filter(t => t.from === current)
  return [
    ...next,
    { from: current, to: 'cancelled', label: 'Cancel Order' },
  ]
}

export function getNextRetailTransitions(current: OrderStatus): OrderStatusTransition[] {
  if (current === 'pending') {
    return [
      { from: 'pending', to: 'paid', label: 'Mark as Paid' },
      { from: 'pending', to: 'cancelled', label: 'Cancel Order' },
    ]
  }
  if (current === 'paid') {
    return [
      { from: 'paid', to: 'cancelled', label: 'Void / Refund' },
    ]
  }
  return []
}

export function canTransition(from: OrderStatus, to: OrderStatus, hasKitchen: boolean): boolean {
  if (to === 'cancelled') return true
  const transitions = hasKitchen ? KITCHEN_FLOW : getNextRetailTransitions(from)
  return transitions.some(t => t.from === from && t.to === to)
}

export interface OrderMetadata {
  [key: string]: unknown
  mpOrderId?: string
  mpOrderStatus?: 'created' | 'at_terminal' | 'processing' | 'processed' | 'failed' | 'expired' | 'canceled' | 'action_required'
  mpStatusDetail?: string
}
