import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase/admin'
import { notFound, badRequest } from '../middleware/error'
import { enrollCustomer } from '../services/loyalty.service'
import { GoogleWalletService } from '../services/googleWallet.service'
import { mapProgramToGoogleClass } from '../mappers/googleClassMapper'
import type { StoreSettings } from '@ultimate-pos/shared'

export const publicRouter = new Hono()

publicRouter.get('/stores/:slug', async (c) => {
  const { slug } = c.req.param()

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('id, name, slug, settings')
    .eq('slug', slug.toLowerCase())
    .single()

  if (!store) throw notFound('Tienda no encontrada')

  const settings = (store.settings || {}) as StoreSettings

  const design = (settings?.walletPassDesign as Record<string, unknown>) || {}

  return c.json({
    data: {
      id: store.id,
      name: store.name,
      slug: store.slug,
      logoUrl: (design?.logoImageUrl as string) || null,
      settings: {
        hasLoyalty: settings.hasLoyalty ?? false,
        preferenceFields: settings.preferenceFields ?? [],
      },
    },
  })
})

publicRouter.post('/stores/:slug/customers', async (c) => {
  const { slug } = c.req.param()

  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('id, settings')
    .eq('slug', slug.toLowerCase())
    .single()

  if (!store) throw notFound('Tienda no encontrada')

  const storeId = store.id
  const body = await c.req.json()
  const { name, email, phone, tags, preferences } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw badRequest('El nombre del cliente es obligatorio')
  }

  const customerTags = Array.isArray(tags)
    ? [...new Set(['public-registration', ...tags.map((t: string) => t.trim()).filter(Boolean)])]
    : ['public-registration']

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .insert({
      store_id: storeId,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      source: 'public-registration',
      tags: customerTags,
      preferences:
        preferences && typeof preferences === 'object' && !Array.isArray(preferences)
          ? (preferences as Record<string, unknown>)
          : {},
    })
    .select()
    .single()

  if (error) throw badRequest(error.message)

  let pass = null
  try {
    const settings = (store.settings || {}) as StoreSettings
    if (settings?.hasLoyalty) {
      const result = await enrollCustomer(storeId, customer.id, settings)
      pass = result.pass
    }
  } catch (err) {
    console.error('[enroll] ERROR:', (err as Error)?.message || err)
  }

  return c.json({ data: { customer, pass } }, 201)
})

publicRouter.get('/passes/:passId/google-wallet-url', async (c) => {
  const passId = c.req.param('passId')

  const { data: pass, error } = await supabaseAdmin
    .from('digital_passes')
    .select('*, customers!inner(name), stores!inner(id, name, settings)')
    .eq('id', passId)
    .single()

  if (error || !pass) throw notFound('Pase no encontrado')

  const storeId = (pass.stores as any).id
  const storeName = (pass.stores as any).name
  const storeSettings = ((pass.stores as any).settings || {}) as StoreSettings
  const customerName = (pass.customers as any)?.name || 'Miembro'

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID
  if (!issuerId) throw badRequest('Google Wallet no configurado')

  const gws = new GoogleWalletService()
  const classSuffix = storeId.replace(/-/g, '_')
  const objectSuffix = passId.replace(/-/g, '_')

  const classData = mapProgramToGoogleClass(storeName, storeSettings as any)
  await gws.createClass(classSuffix, classData)

  if (pass.google_pass_id) {
    const jwtUrl = await gws.generateJwt(pass.google_pass_id, classSuffix)
    return c.json({ data: { jwtUrl } })
  }

  const { data: loyaltyCard } = await supabaseAdmin
    .from('loyalty_cards')
    .select('points, tier')
    .eq('digital_pass_id', passId)
    .single()

  const barcode = pass.barcode_value || pass.id
  // Use the store's configured points label when available
  const pointsLabel = ((storeSettings?.walletPassDesign as Record<string, unknown>)?.pointsLabel as string) || 'Puntos'
  await gws.createObject(objectSuffix, classSuffix, {
    state: 'ACTIVE',
    barcode: { type: 'QR_CODE', value: barcode, alternateText: barcode },
    accountId: pass.id,
    accountName: customerName,
    loyaltyPoints: {
      label: pointsLabel,
      balance: { string: String(loyaltyCard?.points ?? 0) },
    },
  })

  await supabaseAdmin
    .from('digital_passes')
    .update({ google_pass_id: objectSuffix })
    .eq('id', passId)

  const jwtUrl = await gws.generateJwt(objectSuffix, classSuffix)

  return c.json({ data: { jwtUrl } })
})
