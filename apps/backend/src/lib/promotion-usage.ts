import { supabaseAdmin } from './supabase/admin'

export function getPromotionUsageIds(
  metadata: Record<string, unknown> | null | undefined,
  appliedPromotions: Array<{ promotion_id?: string }> | null | undefined,
): string[] {
  const metadataIds = Array.isArray(metadata?.promotionUsageIds)
    ? metadata.promotionUsageIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []

  if (metadataIds.length > 0) {
    return [...new Set(metadataIds)]
  }

  const appliedIds = (appliedPromotions || [])
    .map((promotion) => promotion.promotion_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)

  return [...new Set(appliedIds)]
}

export async function revertPromotionUsageIfNeeded(
  orderId: string,
  metadata: Record<string, unknown> | null | undefined,
  appliedPromotions: Array<{ promotion_id?: string }> | null | undefined,
) {
  if (metadata?.promotionUsageReverted === true) return

  const promotionIds = getPromotionUsageIds(metadata, appliedPromotions)
  for (const promotionId of promotionIds) {
    await supabaseAdmin.rpc('decrement_promotion_uses', { promo_id: promotionId })
  }

  await supabaseAdmin
    .from('orders')
    .update({ metadata: { ...(metadata || {}), promotionUsageReverted: true } })
    .eq('id', orderId)
}
