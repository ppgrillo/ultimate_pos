import { supabaseAdmin } from '../lib/supabase/admin'
import type { StoreSettings } from '@ultimate-pos/shared'

export async function calculateEarnPoints(
  items: Array<{ product_id: string; quantity: number; price: number }>,
  subtotal: number,
  discount: number,
  settings: StoreSettings,
): Promise<number> {
  if (!settings.hasLoyalty) return 0
  const rate = settings.pointsPerCurrency || 10

  const productIds = [...new Set(items.map(i => i.product_id))]
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, points')
    .in('id', productIds)

  const perProductPoints = new Map<string, number | null>(
    (products ?? []).map((p: any) => [p.id, p.points as number | null])
  )

  let totalPoints = 0
  for (const item of items) {
    const pp = perProductPoints.get(item.product_id)
    if (pp != null && pp > 0) {
      totalPoints += pp * item.quantity
    } else {
      totalPoints += Math.floor(item.price * rate) * item.quantity
    }
  }

  if (subtotal > 0 && discount > 0) {
    totalPoints = Math.floor(totalPoints * Math.max(0, subtotal - discount) / subtotal)
  }

  return totalPoints
}

function generateAuthToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  )
}

function getObjectSuffix(id: string): string {
  return id.replace(/-/g, '_')
}

export async function enrollCustomer(
  storeId: string,
  customerId: string,
  settings: StoreSettings,
) {
  const bonusPoints = settings.signupBonusPoints || 0

  const { data: card, error: cardError } = await supabaseAdmin
    .from('loyalty_cards')
    .insert({
      store_id: storeId,
      customer_id: customerId,
      points: bonusPoints,
      tier: (settings.walletPassDesign?.defaultTier || 'bronze').toLowerCase(),
    })
    .select()
    .single()

  if (cardError) throw new Error(`Failed to create loyalty card: ${cardError.message}`)

  const authToken = generateAuthToken()
  const { data: pass, error: passError } = await supabaseAdmin
    .from('digital_passes')
    .insert({
      store_id: storeId,
      customer_id: customerId,
      pass_type: 'loyalty',
      status: 'active',
      barcode_value: card.id,
      metadata: { apple_auth_token: authToken },
    })
    .select()
    .single()

  if (passError) {
    await supabaseAdmin.from('loyalty_cards').delete().eq('id', card.id)
    throw new Error(`Failed to create digital pass: ${passError.message}`)
  }

  await supabaseAdmin
    .from('loyalty_cards')
    .update({ digital_pass_id: pass.id })
    .eq('id', card.id)

  if (bonusPoints > 0) {
    await supabaseAdmin.rpc('process_loyalty_transaction', {
      p_card_id: card.id,
      p_type: 'signup_bonus',
      p_points: bonusPoints,
      p_description: 'Puntos de bienvenida',
    })
  }

  return { card, pass }
}

export async function getLoyaltyCard(customerId: string, storeId: string) {
  const { data } = await supabaseAdmin
    .from('loyalty_cards')
    .select('*, digital_passes(*)')
    .eq('customer_id', customerId)
    .eq('store_id', storeId)
    .maybeSingle()

  return data
}

export async function earnPoints(
  cardId: string,
  points: number,
  description: string,
  referenceId?: string,
) {
  if (points <= 0) return null

  const { data, error } = await supabaseAdmin.rpc('process_loyalty_transaction', {
    p_card_id: cardId,
    p_type: 'earn',
    p_points: points,
    p_description: description,
    p_reference_id: referenceId,
    p_reference_type: referenceId ? 'order' : null,
  })

  if (error) throw new Error(`Failed to earn points: ${error.message}`)
  return data as { success: boolean; new_balance: number }
}

export async function redeemPoints(cardId: string, points: number, description: string) {
  const { data, error } = await supabaseAdmin.rpc('process_loyalty_transaction', {
    p_card_id: cardId,
    p_type: 'redeem',
    p_points: -points,
    p_description: description,
  })

  if (error) throw new Error(`Failed to redeem points: ${error.message}`)
  return data as { success: boolean; new_balance: number }
}

export async function syncGoogleWallet(cardId: string) {
  try {
    const { GoogleWalletService } = await import('./googleWallet.service')
    const gws = new GoogleWalletService()

    const { data: card } = await supabaseAdmin
      .from('loyalty_cards')
      .select('*, digital_passes(*), customers(name), stores(name, settings)')
      .eq('id', cardId)
      .single()

    if (!card?.digital_passes?.google_pass_id) return

    const suffix = getObjectSuffix(card.digital_passes.id)
    const classSuffix = getObjectSuffix(card.store_id)

    // Use store settings' walletPassDesign.pointsLabel when available
    const storeSettings = ((card.stores as any)?.settings || {}) as StoreSettings
    const pointsLabel = ((storeSettings?.walletPassDesign as Record<string, unknown>)?.pointsLabel as string) || 'Puntos'

    await gws.patchObject(suffix, {
      loyaltyPoints: {
        label: pointsLabel,
        balance: { string: String(card.points) },
      },
      accountName: card.customers?.name || 'Miembro',
    })
  } catch (err) {
    console.error('Failed to sync Google Wallet:', err)
  }
}

export async function syncAppleWallet(cardId: string) {
  try {
    const { data: card } = await supabaseAdmin
      .from('loyalty_cards')
      .select('id, digital_pass_id, digital_passes(apple_pass_id, metadata)')
      .eq('id', cardId)
      .single()

    const digitalPass = card?.digital_passes as { apple_pass_id?: string; metadata?: any } | null
    const passId = card?.digital_pass_id
    if (!passId) return

    const { sendApplePushNotification } = await import('./appleWallet.apns')

    // Look up registrations using the digital_passes id (serial_number)
    const { data: registrations } = await supabaseAdmin
      .from('apple_registrations')
      .select('push_token')
      .eq('serial_number', passId)

    if (!registrations?.length) return

    await supabaseAdmin
      .from('digital_passes')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', passId)

    const tokens = registrations.filter((r: any) => r.push_token).map((r: any) => r.push_token!)
    await Promise.allSettled(tokens.map((t: any) => sendApplePushNotification(t)))
  } catch (err) {
    console.error('Failed to sync Apple Wallet:', err)
  }
}

export async function syncWallets(cardId: string) {
  await Promise.allSettled([
    syncGoogleWallet(cardId),
    syncAppleWallet(cardId),
  ])
}
