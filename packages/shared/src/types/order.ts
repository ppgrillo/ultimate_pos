export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled'

export type OrderType = 'dine-in' | 'takeaway' | 'delivery'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface Order {
  id: string
  store_id: string
  customer_id: string | null
  created_by: string
  table_number: number | null
  status: OrderStatus
  type: OrderType
  payment_status: PaymentStatus
  subtotal: number
  tax: number
  discount: number
  total: number
  items: OrderItem[]
  notes: string | null
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
