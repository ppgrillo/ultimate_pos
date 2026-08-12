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

  // Merge the flag into the current metadata from the DB rather than the
  // caller-supplied copy: callers (apply-outcome, order sync) pass the
  // pre-update metadata, so writing it back verbatim would clobber a payment
  // outcome applied moments earlier (e.g. revert `providerStatus` to
  // `processing` after a cancellation).
  const { data: fresh } = await supabaseAdmin
    .from('orders')
    .select('metadata')
    .eq('id', orderId)
    .single()

  const freshMetadata = (fresh?.metadata as Record<string, unknown> | null | undefined) || {}
  await supabaseAdmin
    .from('orders')
    .update({ metadata: { ...freshMetadata, promotionUsageReverted: true } })
    .eq('id', orderId)
}
