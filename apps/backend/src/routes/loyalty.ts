import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase/admin'
import { authMiddleware, requireRole } from '../middleware/auth'
import { notFound, badRequest } from '../middleware/error'
import { enrollCustomer, getLoyaltyCard, earnPoints, redeemPoints, syncWallets, calculateEarnPoints } from '../services/loyalty.service'
import type { StoreSettings } from '@ultimate-pos/shared'

export const loyaltyRouter = new Hono()

loyaltyRouter.use('*', authMiddleware)

loyaltyRouter.post('/enroll', async (c) => {
  const storeId = c.get('storeId')
  const { customer_id } = await c.req.json()

  if (!customer_id) throw badRequest('customer_id is required')

  const existing = await getLoyaltyCard(customer_id, storeId)
  if (existing) return c.json({ data: existing })

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('settings')
    .eq('id', storeId)
    .single()

  const settings = (store?.settings || {}) as StoreSettings

  const result = await enrollCustomer(storeId, customer_id, settings)
  return c.json({ data: result }, 201)
})

loyaltyRouter.get('/card/:customerId', async (c) => {
  const storeId = c.get('storeId')
  const customerId = c.req.param('customerId')

  const card = await getLoyaltyCard(customerId, storeId)
  if (!card) throw notFound('Loyalty card not found')

  return c.json({ data: card })
})

loyaltyRouter.post('/scan', async (c) => {
  const storeId = c.get('storeId')
  const { barcode } = await c.req.json()
  if (!barcode) throw badRequest('barcode is required')

  const code = barcode.trim()
  const candidates = [code]

  // Handle UUID formats: underscore ↔ dash (Google Wallet vs DB)
  const uuidDash = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const uuidUnderscore = /^[0-9a-f]{8}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{4}_[0-9a-f]{12}$/i
  if (uuidDash.test(code)) {
    candidates.push(code.replace(/-/g, '_'))
  } else if (uuidUnderscore.test(code)) {
    candidates.push(code.replace(/_/g, '-'))
  }

  // Handle Google/Apple Wallet "issuerId.objectSuffix" format
  if (code.includes('.')) {
    const suffix = code.split('.').pop()
    if (suffix && !candidates.includes(suffix)) candidates.push(suffix)
  }

  // --- Multi-strategy sequential lookup ---

  // Strategy 1: match by loyalty_cards.id directly
  for (const candidate of candidates) {
    const { data: card } = await supabaseAdmin
      .from('loyalty_cards')
      .select('*, customers!inner(*)')
      .eq('id', candidate)
      .eq('store_id', storeId)
      .single()

    if (card) {
      const customer = card.customers as Record<string, unknown>
      delete (card as Record<string, unknown>).customers
      return c.json({ data: { customer, loyaltyCard: card } })
    }
  }

  // Strategy 2: match by digital_passes.barcode_value (via loyalty_cards.digital_pass_id)
  const { data: passByBarcode } = await supabaseAdmin
    .from('digital_passes')
    .select('id')
    .in('barcode_value', candidates)
    .eq('store_id', storeId)
    .maybeSingle()

  if (passByBarcode) {
    const { data: card } = await supabaseAdmin
      .from('loyalty_cards')
      .select('*, customers!inner(*)')
      .eq('digital_pass_id', passByBarcode.id)
      .eq('store_id', storeId)
      .single()

    if (card) {
      const customer = card.customers as Record<string, unknown>
      delete (card as Record<string, unknown>).customers
      return c.json({ data: { customer, loyaltyCard: card } })
    }
  }

  // Strategy 3: match by digital_passes.id (Google/Apple pass UUID from QR)
  const { data: passById } = await supabaseAdmin
    .from('digital_passes')
    .select('id')
    .in('id', candidates)
    .eq('store_id', storeId)
    .maybeSingle()

  if (passById) {
    const { data: card } = await supabaseAdmin
      .from('loyalty_cards')
      .select('*, customers!inner(*)')
      .eq('digital_pass_id', passById.id)
      .eq('store_id', storeId)
      .single()

    if (card) {
      const customer = card.customers as Record<string, unknown>
      delete (card as Record<string, unknown>).customers
      return c.json({ data: { customer, loyaltyCard: card } })
    }
  }

  // Strategy 4: case-variant barcode_value
  const lowerCaseVariants = candidates.map(c => c.toLowerCase())
  const upperCaseVariants = candidates.map(c => c.toUpperCase())
  const allCaseVariants = [...new Set([...lowerCaseVariants, ...upperCaseVariants])]

  const { data: passByCase } = await supabaseAdmin
    .from('digital_passes')
    .select('id')
    .in('barcode_value', allCaseVariants)
    .eq('store_id', storeId)
    .maybeSingle()

  if (passByCase) {
    const { data: card } = await supabaseAdmin
      .from('loyalty_cards')
      .select('*, customers!inner(*)')
      .eq('digital_pass_id', passByCase.id)
      .eq('store_id', storeId)
      .single()

    if (card) {
      const customer = card.customers as Record<string, unknown>
      delete (card as Record<string, unknown>).customers
      return c.json({ data: { customer, loyaltyCard: card } })
    }
  }

  throw notFound('Tarjeta de lealtad no encontrada')
})

loyaltyRouter.get('/transactions/:cardId', async (c) => {
  const storeId = c.get('storeId')
  const cardId = c.req.param('cardId')
  const limit = Math.min(Number(c.req.query('limit')) || 50, 200)
  const offset = Number(c.req.query('offset')) || 0

  const { data, error } = await supabaseAdmin
    .from('loyalty_transactions')
    .select('*')
    .eq('loyalty_card_id', cardId)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw badRequest(error.message)

  return c.json({ data })
})

loyaltyRouter.get('/program', async (c) => {
  const storeId = c.get('storeId')

  const { data, error } = await supabaseAdmin
    .from('loyalty_programs')
    .select('*')
    .eq('store_id', storeId)
    .single()

  if (error && error.code !== 'PGRST116') throw badRequest(error.message)

  return c.json({ data })
})

// POST /loyalty/adjust — manually add or remove points from a card (admin only).
// points can be positive (add) or negative (remove). Balance never goes below 0.
loyaltyRouter.post('/adjust', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')
  const { card_id, points, description } = await c.req.json()

  if (!card_id) throw badRequest('card_id is required')
  if (typeof points !== 'number' || points === 0) throw badRequest('points must be a non-zero number')

  const { data: card } = await supabaseAdmin
    .from('loyalty_cards')
    .select('id')
    .eq('id', card_id)
    .eq('store_id', storeId)
    .single()

  if (!card) throw notFound('Loyalty card not found')

  const { data, error } = await supabaseAdmin.rpc('process_loyalty_transaction', {
    p_card_id: card_id,
    p_type: 'adjust',
    p_points: points,
    p_description: description || (points > 0 ? 'Manual adjustment (add)' : 'Manual adjustment (remove)'),
    p_reference_id: null,
    p_reference_type: null,
  })

  if (error) throw badRequest(error.message)

  await syncWallets(card_id)

  return c.json({ data })
})
