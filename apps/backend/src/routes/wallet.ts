import { Hono } from 'hono'
import crypto from 'crypto'
import { supabaseAdmin } from '../lib/supabase/admin'
import { authMiddleware, requireRole } from '../middleware/auth'
import { requireAccess } from '../middleware/requireAccess'
import { notFound, badRequest } from '../middleware/error'
import { GoogleWalletService } from '../services/googleWallet.service'
import { mapProgramToGoogleClass } from '../mappers/googleClassMapper'

function generateAuthToken(): string {
  return crypto.randomBytes(20).toString('base64url')
}

// ─── Unauthenticated routes ───────────────────────────────────────────────────
// Apple Wallet download must NOT require JWT — the iPhone downloads the pass
// without a user session. The passId UUID is the security token.
const publicWalletRouter = new Hono()

publicWalletRouter.get('/apple/:passId/download', async (c) => {
  const passId = c.req.param('passId')

  const { data: pass, error } = await supabaseAdmin
    .from('digital_passes')
    .select('*, customers(name), stores!inner(name, settings), loyalty_cards(points, tier)')
    .eq('id', passId)
    .single()

  if (error || !pass) throw notFound('Pass not found')

  // Ensure apple_auth_token exists (required by Apple Wallet Web Service protocol)
  const metadata = (pass.metadata as Record<string, unknown>) || {}
  if (!metadata.apple_auth_token) {
    const token = generateAuthToken()
    await supabaseAdmin
      .from('digital_passes')
      .update({ metadata: { ...metadata, apple_auth_token: token } })
      .eq('id', passId)
    metadata.apple_auth_token = token
  }

  const { AppleWalletService } = await import('../services/appleWallet.service')
  const service = new AppleWalletService()
  const buffer = await service.createPass({
    ...pass,
    metadata,
    settings: (pass.stores as any)?.settings,
  } as any)

  return c.newResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': 'attachment; filename="pass.pkpass"',
      'Cache-Control': 'no-store',
    },
  })
})

// ─── Authenticated routes ─────────────────────────────────────────────────────
const authWalletRouter = new Hono()

authWalletRouter.use('*', authMiddleware, requireAccess)

// POST /wallet/google/class — admin creates or updates the store's LoyaltyClass.
// Idempotent: 409 from Google API → falls back to patchClass automatically.
// Call this once after configuring wallet settings, or whenever design changes.
authWalletRouter.post('/google/class', requireRole('admin'), async (c) => {
  const storeId = c.get('storeId')

  const { data: store, error } = await supabaseAdmin
    .from('stores')
    .select('name, settings')
    .eq('id', storeId)
    .single()

  if (error || !store) throw notFound('Store not found')

  const settings = (store.settings as Record<string, unknown>) || {}
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID

  if (!issuerId) throw badRequest('Google Wallet issuer ID not configured. Add it in Settings → Wallet.')

  const gws = new GoogleWalletService()
  const classSuffix = storeId.replace(/-/g, '_')
  const classData = mapProgramToGoogleClass(store.name, settings)

  const result = await gws.createClass(classSuffix, classData)
  const classId = `${issuerId}.${classSuffix}`

  return c.json({ data: { classId, result } })
})

// GET /wallet/google/:passId/save-url — returns "Add to Google Wallet" JWT URL.
// First call: ensures LoyaltyClass exists, creates LoyaltyObject, persists google_pass_id.
// Subsequent calls: just regenerate the JWT — no Google API object mutations.
authWalletRouter.get('/google/:passId/save-url', async (c) => {
  const storeId = c.get('storeId')
  const passId = c.req.param('passId')

  // Fetch pass + store info. Loyalty card is queried separately because
  // loyalty_cards.digital_pass_id is the FK direction — joining from digital_passes
  // returns an array, not an object, causing card.points to be undefined.
  const { data: pass, error } = await supabaseAdmin
    .from('digital_passes')
    .select('*, customers(name), stores(name, settings)')
    .eq('id', passId)
    .single()

  if (error || !pass) throw notFound('Pass not found')
  if (pass.store_id !== storeId) throw notFound('Pass not found')

  const storeSettings = (pass.stores as any)?.settings || {}
  const storeName = (pass.stores as any)?.name || 'Ultimate POS'
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID

  if (!issuerId) throw badRequest('Google Wallet issuer ID not configured')

  const gws = new GoogleWalletService()
  const classSuffix = storeId.replace(/-/g, '_')
  const objectSuffix = passId.replace(/-/g, '_')

  // If the object was already registered, skip all Google API mutations and
  // just regenerate the JWT. This prevents resetting points on every page open.
  if (pass.google_pass_id) {
    const jwtUrl = await gws.generateJwt(pass.google_pass_id, classSuffix)
    return c.json({ data: { jwtUrl } })
  }

  // Step 1: Ensure the LoyaltyClass exists (idempotent upsert).
  const classData = mapProgramToGoogleClass(storeName, storeSettings)
  await gws.createClass(classSuffix, classData)

  // Step 2: Query the loyalty card separately to get correct points.
  const { data: loyaltyCard } = await supabaseAdmin
    .from('loyalty_cards')
    .select('points, tier')
    .eq('digital_pass_id', passId)
    .single()

  const customer = (pass.customers as any) || {}
  const points = loyaltyCard?.points ?? 0
  const design = (storeSettings.walletPassDesign as Record<string, unknown>) || {}
  const pointsLabel = (design.pointsLabel as string) || 'Puntos'
  const barcode = pass.barcode_value || pass.id

  // Step 3: Create the LoyaltyObject (first time only).
  await gws.createObject(objectSuffix, classSuffix, {
    state: 'ACTIVE',
    barcode: { type: 'QR_CODE', value: barcode, alternateText: barcode },
    accountId: pass.id,
    accountName: customer.name || 'Miembro',
    loyaltyPoints: { label: pointsLabel, balance: { string: String(points) } },
  })

  // Step 4: Persist the object suffix so syncGoogleWallet() can patch it later.
  await supabaseAdmin
    .from('digital_passes')
    .update({ google_pass_id: objectSuffix })
    .eq('id', passId)

  const jwtUrl = await gws.generateJwt(objectSuffix, classSuffix)

  return c.json({ data: { jwtUrl } })
})

// ─── Combined export ──────────────────────────────────────────────────────────
// Mount order matters: publicWalletRouter handles /apple/* without auth,
// authWalletRouter handles everything else with JWT.
export const walletRouter = new Hono()
walletRouter.route('/', publicWalletRouter)
walletRouter.route('/', authWalletRouter)
