export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface Order {
  id: string
  store_id: string
  customer_id: string | null
  employee_id: string
  table_number: string | null
  status: OrderStatus
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
  product_name: string
  quantity: number
  unit_price: number
  modifiers: string[]
  notes: string | null
}
