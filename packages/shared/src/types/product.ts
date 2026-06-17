export interface ModifierOption {
  id?: string
  name: string
  price_adjustment: number
  sort_order: number
}

export interface ModifierGroup {
  id?: string
  name: string
  type: 'single' | 'multi'
  is_required: boolean
  sort_order: number
  options: ModifierOption[]
}

export interface Product {
  id: string
  store_id: string
  name: string
  description: string | null
  price: number
  cost: number | null
  sku: string | null
  category_id: string | null
  image_url: string | null
  modifiers: ModifierGroup[]
  points: number | null
  is_active: boolean
  tax_exempt: boolean
  created_at: string
  updated_at: string
}

export interface ProductCategory {
  id: string
  store_id: string
  name: string
  sort_order: number
}
