import type { PromotionDiscountType } from '@ultimate-pos/shared'

type PromotionLike = {
  id?: string | null
  name?: string | null
  badge_text?: string | null
  is_active?: boolean | null
  target_type?: string | null
  target_ids?: string[] | null
  discount_type?: PromotionDiscountType | string | null
  discount_value?: number | null
  min_quantity?: number | null
  min_subtotal?: number | null
  max_uses?: number | null
  current_uses?: number | null
  priority?: number | null
  starts_at?: string | null
  ends_at?: string | null
}

export interface PromotionTargetProduct {
  id: string
  category_id: string | null
  price: number
}

export interface CartPromotionResult {
  promotion_id: string
  name: string
  discount_amount: number
  badge_text: string | null
  discount_type: string
  discount_value: number
}

function toValidDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function hasPromotionCapacity(promotion: PromotionLike): boolean {
  const maxUses = promotion.max_uses
  if (maxUses == null || maxUses <= 0) return true
  return (promotion.current_uses ?? 0) < maxUses
}

export function isPromotionInDateWindow(promotion: PromotionLike, now = new Date()): boolean {
  const startsAt = toValidDate(promotion.starts_at)
  const endsAt = toValidDate(promotion.ends_at)

  if (startsAt && startsAt.getTime() > now.getTime()) return false
  if (endsAt && endsAt.getTime() < now.getTime()) return false
  return true
}

export function isPromotionActive(promotion: PromotionLike, now = new Date()): boolean {
  return promotion.is_active === true
    && hasPromotionCapacity(promotion)
    && isPromotionInDateWindow(promotion, now)
}

export function hasPromotionalConditions(promotion: PromotionLike): boolean {
  return (promotion.min_quantity != null && promotion.min_quantity > 0)
    || (promotion.min_subtotal != null && promotion.min_subtotal > 0)
}

export function isCartPromotionEligible(
  promotion: PromotionLike,
  subtotal: number,
  totalQuantity: number,
  now = new Date(),
): boolean {
  if (promotion.target_type !== 'cart') return false
  if (!isPromotionActive(promotion, now)) return false

  if (promotion.min_quantity != null && promotion.min_quantity > 0 && totalQuantity < promotion.min_quantity) {
    return false
  }

  if (promotion.min_subtotal != null && promotion.min_subtotal > 0 && subtotal < promotion.min_subtotal) {
    return false
  }

  return true
}

export function calculatePromotionDiscount(promotion: PromotionLike, subtotal: number): number {
  if (subtotal <= 0) return 0

  const discountType = promotion.discount_type
  const discountValue = promotion.discount_value ?? 0

  if (discountType === 'percentage') {
    const ratio = Math.max(0, Math.min(100, discountValue)) / 100
    return subtotal * ratio
  }

  if (discountType === 'fixed') {
    return Math.min(Math.max(0, discountValue), subtotal)
  }

  return 0
}

export function computeCartPromotionDiscounts(
  promotions: PromotionLike[],
  subtotal: number,
  totalQuantity: number,
  now = new Date(),
): { appliedPromotions: CartPromotionResult[]; totalDiscount: number } {
  const appliedPromotions: CartPromotionResult[] = []
  let totalDiscount = 0

  for (const promo of promotions) {
    if (!isCartPromotionEligible(promo, subtotal, totalQuantity, now)) continue
    if (!promo.id || !promo.name) continue

    const discountAmount = calculatePromotionDiscount(promo, subtotal)
    if (discountAmount <= 0) continue

    const roundedAmount = Math.round(discountAmount * 100) / 100
    appliedPromotions.push({
      promotion_id: promo.id,
      name: promo.name,
      discount_amount: roundedAmount,
      badge_text: promo.badge_text ?? null,
      discount_type: String(promo.discount_type ?? ''),
      discount_value: promo.discount_value ?? 0,
    })
    totalDiscount += roundedAmount
  }

  return {
    appliedPromotions,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
  }
}

export interface PromotionTargetLine {
  product_id: string | null
  category_id: string | null
  quantity: number
  price: number
}

export function computeConditionalProductPromotionDiscounts(
  promotions: PromotionLike[],
  items: PromotionTargetLine[],
  now = new Date(),
): { appliedPromotions: CartPromotionResult[]; totalDiscount: number } {
  const appliedPromotions: CartPromotionResult[] = []
  let totalDiscount = 0

  for (const promo of promotions) {
    if (promo.target_type !== 'product' && promo.target_type !== 'category') continue
    if (!hasPromotionalConditions(promo)) continue
    if (!isPromotionActive(promo, now)) continue

    const targetIds = promo.target_ids
    if (!targetIds || targetIds.length === 0) continue

    const matchingLines = items.filter((item) => {
      if (!item.product_id) return false
      if (promo.target_type === 'product') return targetIds.includes(item.product_id)
      return item.category_id != null && targetIds.includes(item.category_id)
    })

    const matchingQty = matchingLines.reduce((sum, item) => sum + item.quantity, 0)
    const matchingSubtotal = Math.round(matchingLines.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100

    if (matchingQty <= 0) continue
    if (promo.min_quantity != null && promo.min_quantity > 0 && matchingQty < promo.min_quantity) continue
    if (promo.min_subtotal != null && promo.min_subtotal > 0 && matchingSubtotal < promo.min_subtotal) continue

    const discountAmount = Math.round(calculatePromotionDiscount(promo, matchingSubtotal) * 100) / 100
    if (discountAmount <= 0) continue
    if (!promo.id || !promo.name) continue

    appliedPromotions.push({
      promotion_id: promo.id,
      name: promo.name,
      discount_amount: discountAmount,
      badge_text: promo.badge_text ?? null,
      discount_type: String(promo.discount_type ?? ''),
      discount_value: promo.discount_value ?? 0,
    })
    totalDiscount += discountAmount
  }

  return {
    appliedPromotions,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
  }
}

export function getBestProductPromotion(
  product: PromotionTargetProduct,
  promotions: PromotionLike[],
  now = new Date(),
): PromotionLike | null {
  let bestPromotion: PromotionLike | null = null
  let bestDiscount = 0

  for (const promotion of promotions) {
    if (!isPromotionActive(promotion, now)) continue
    if (promotion.target_type !== 'product' && promotion.target_type !== 'category') continue
    if (hasPromotionalConditions(promotion)) continue

    const targetIds = promotion.target_ids
    if (!targetIds || targetIds.length === 0) continue

    const matches = promotion.target_type === 'product'
      ? targetIds.includes(product.id)
      : targetIds.includes(product.category_id || '')

    if (!matches) continue

    const discount = calculatePromotionDiscount(promotion, product.price)
    if (discount > bestDiscount) {
      bestDiscount = discount
      bestPromotion = promotion
      continue
    }

    if (discount === bestDiscount && bestPromotion) {
      const currentPriority = promotion.priority ?? 0
      const bestPriority = bestPromotion.priority ?? 0
      if (currentPriority > bestPriority) {
        bestPromotion = promotion
      }
    }
  }

  return bestPromotion
}
