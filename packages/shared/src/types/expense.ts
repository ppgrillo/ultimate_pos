export type ExpenseType = 'operating' | 'inventory'

export interface Expense {
  id: string
  store_id: string
  type: ExpenseType
  category: string
  description: string
  amount: number
  expense_date: string
  receipt_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// Fixed category list (admin-only writes, fixed list in MVP).
// `operating` expenses reduce Net Profit; `inventory` purchases do NOT —
// their cost is recognized as COGS when the products are sold.
export const EXPENSE_CATEGORIES: Record<ExpenseType, readonly string[]> = {
  operating: [
    'Rent',
    'Salaries',
    'Utilities',
    'Marketing',
    'Supplies',
    'Equipment',
    'Software',
    'Delivery',
    'Other',
  ],
  inventory: ['Merchandise', 'Raw Materials', 'Other'],
}

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  operating: 'Operating',
  inventory: 'Compras / Inventario',
}
