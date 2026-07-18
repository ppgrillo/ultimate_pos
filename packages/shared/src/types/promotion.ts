export type PromotionTargetType = 'product' | 'category' | 'cart'
export type PromotionDiscountType = 'percentage' | 'fixed'

export interface Promotion {
  id: string
  store_id: string
  name: string
  description: string | null
  is_active: boolean
  target_type: PromotionTargetType
  target_ids: string[] | null
  discount_type: PromotionDiscountType
  discount_value: number
  min_quantity: number | null
  min_subtotal: number | null
  max_uses: number | null
  current_uses: number
  priority: number
  starts_at: string | null
  ends_at: string | null
  badge_text: string | null
  created_at: string
  updated_at: string
}

export interface AppliedPromotion {
  promotion_id: string
  name: string
  discount_amount: number
  badge_text: string | null
  discount_type: PromotionDiscountType
  discount_value: number
}

export interface PromotionValidationItem {
  product_id: string
  quantity: number
  price: number
  category_id: string | null
}

export interface PromotionValidationResponse {
  applied_promotions: AppliedPromotion[]
  total_discount: number
}

export interface PromotionFormData {
  name: string
  description: string | null
  is_active: boolean
  target_type: PromotionTargetType
  target_ids: string[] | null
  discount_type: PromotionDiscountType
  discount_value: number
  min_quantity: number | null
  min_subtotal: number | null
  max_uses: number | null
  current_uses: number
  priority: number
  starts_at: string | null
  ends_at: string | null
  badge_text: string | null
}
