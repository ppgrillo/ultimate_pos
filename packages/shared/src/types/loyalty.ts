export type LoyaltyTierName = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface RewardTier {
  name: LoyaltyTierName
  label: string
  minPoints: number
  multiplier: number
  color?: string
  benefits?: string[]
}

export interface RedemptionRule {
  points: number
  discount: number
  label: string
  isActive: boolean
}

export interface LoyaltyProgram {
  id: string
  store_id: string
  name: string
  description: string | null
  points_per_currency: number
  currency_unit: string
  signup_bonus_points: number
  tiers: RewardTier[]
  redemption_rules: RedemptionRule[]
  points_expiration_days: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type RewardType = 'free_product' | 'percentage_discount' | 'fixed_discount' | 'custom'

export interface LoyaltyReward {
  id: string
  store_id: string
  name: string
  description: string | null
  reward_type: RewardType
  points_required: number
  product_id: string | null
  discount_value: number | null
  discount_type: 'percentage' | 'fixed' | null
  metadata: Record<string, unknown>
  is_active: boolean
  max_uses: number | null
  current_uses: number
  starts_at: string | null
  ends_at: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface RewardRedemption {
  id: string
  store_id: string
  reward_id: string
  loyalty_card_id: string
  customer_id: string
  order_id: string | null
  points_spent: number
  status: 'completed' | 'reverted'
  metadata: Record<string, unknown>
  created_at: string
}

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'expire' | 'adjust' | 'signup_bonus'

export interface LoyaltyTransaction {
  id: string
  store_id: string
  loyalty_card_id: string
  type: LoyaltyTransactionType
  points: number
  balance_after: number
  description: string | null
  reference_type: string | null
  reference_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}
