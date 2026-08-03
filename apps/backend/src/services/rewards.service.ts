import { supabaseAdmin } from '../lib/supabase/admin'
import type { StoreSettings } from '@ultimate-pos/shared'

export async function getAvailableRewards(storeId: string, loyaltyCardId: string) {
  const { data: card } = await supabaseAdmin
    .from('loyalty_cards')
    .select('points')
    .eq('id', loyaltyCardId)
    .eq('store_id', storeId)
    .single()

  if (!card) return []

  const now = new Date().toISOString()

  const { data: rewards, error } = await supabaseAdmin
    .from('loyalty_rewards')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .lte('points_required', card.points)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('points_required', { ascending: true })

  if (error) {
    console.error('getAvailableRewards error:', error)
    return []
  }

  return (rewards || []).filter((r) => !r.max_uses || r.current_uses < r.max_uses)
}

export async function createRedemption(
  storeId: string,
  rewardId: string,
  loyaltyCardId: string,
  customerId: string,
  orderId?: string,
) {
  const { data: reward } = await supabaseAdmin
    .from('loyalty_rewards')
    .select('*')
    .eq('id', rewardId)
    .eq('store_id', storeId)
    .single()

  if (!reward) throw new Error('Reward not found')
  if (!reward.is_active) throw new Error('Reward is not active')
  if (reward.max_uses && reward.current_uses >= reward.max_uses) throw new Error('Reward has reached max uses')

  const now = Date.now()
  if (reward.starts_at && new Date(reward.starts_at).getTime() > now) throw new Error('Reward has not started yet')
  if (reward.ends_at && new Date(reward.ends_at).getTime() < now) throw new Error('Reward has expired')

  const { data: card } = await supabaseAdmin
    .from('loyalty_cards')
    .select('points')
    .eq('id', loyaltyCardId)
    .single()

  if (!card) throw new Error('Loyalty card not found')
  if (card.points < reward.points_required) throw new Error('Insufficient points')

  // Deduct points from loyalty card
  const { data: txResult, error: txError } = await supabaseAdmin.rpc('process_loyalty_transaction', {
    p_card_id: loyaltyCardId,
    p_type: 'redeem',
    p_points: -reward.points_required,
    p_description: `Canje: ${reward.name}`,
    p_reference_id: orderId || null,
    p_reference_type: orderId ? 'order' : 'reward',
  })

  if (txError) throw new Error(`Failed to process points: ${txError.message}`)

  // Create redemption record
  const { data: redemption, error: redemptionError } = await supabaseAdmin
    .from('reward_redemptions')
    .insert({
      store_id: storeId,
      reward_id: rewardId,
      loyalty_card_id: loyaltyCardId,
      customer_id: customerId,
      order_id: orderId || null,
      points_spent: reward.points_required,
      metadata: { reward_name: reward.name, reward_type: reward.reward_type },
    })
    .select()
    .single()

  if (redemptionError) throw new Error(`Failed to create redemption: ${redemptionError.message}`)

  // Increment current_uses
  await supabaseAdmin
    .from('loyalty_rewards')
    .update({ current_uses: (reward.current_uses || 0) + 1 })
    .eq('id', rewardId)

  return { redemption, reward, points_spent: reward.points_required, new_balance: (txResult as any)?.new_balance }
}

export async function revertRedemption(orderId: string) {
  const { data: redemptions } = await supabaseAdmin
    .from('reward_redemptions')
    .select('*, loyalty_rewards!inner(store_id)')
    .eq('order_id', orderId)
    .eq('status', 'completed')

  if (!redemptions || redemptions.length === 0) return

  for (const redemption of redemptions) {
    const reward = redemption.loyalty_rewards as unknown as { store_id: string }

    // Mark redemption as reverted
    await supabaseAdmin
      .from('reward_redemptions')
      .update({ status: 'reverted', metadata: { ...(redemption.metadata as Record<string, unknown> || {}), reverted_at: new Date().toISOString() } })
      .eq('id', redemption.id)

    // Return points to card
    await supabaseAdmin.rpc('process_loyalty_transaction', {
      p_card_id: redemption.loyalty_card_id,
      p_type: 'adjust',
      p_points: redemption.points_spent,
      p_description: `Devolución canje orden #${orderId.slice(0, 8)}`,
      p_reference_id: orderId,
      p_reference_type: 'order',
    })

    // Decrement current_uses
    await supabaseAdmin.rpc('decrement_reward_uses', { p_reward_id: redemption.reward_id })
  }
}

export async function getRedemptionByOrder(orderId: string) {
  const { data } = await supabaseAdmin
    .from('reward_redemptions')
    .select('*, loyalty_rewards(name, reward_type, points_required)')
    .eq('order_id', orderId)
    .eq('status', 'completed')
    .maybeSingle()

  return data
}
