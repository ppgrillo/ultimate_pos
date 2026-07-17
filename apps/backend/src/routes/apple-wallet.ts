import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase/admin'
import { AppleWalletService } from '../services/appleWallet.service'

export const appleWalletRouter = new Hono()
const appleWalletService = new AppleWalletService()

function getAuthToken(c: any): string | null {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('ApplePass ')) return null
  return auth.slice(10)
}

appleWalletRouter.post('/v1/devices/:deviceLibraryId/registrations/:passTypeId/:serialNumber', async (c) => {
  const { deviceLibraryId, passTypeId, serialNumber } = c.req.param()
  const { pushToken } = await c.req.json().catch(() => ({}))
  const authToken = getAuthToken(c)

  const { data: pass } = await supabaseAdmin
    .from('digital_passes')
    .select('id, metadata')
    .eq('id', serialNumber)
    .single()

  if (!pass || authToken !== (pass.metadata as any)?.apple_auth_token) {
    return c.body(null, 401)
  }

  await supabaseAdmin
    .from('apple_registrations')
    .upsert({
      device_library_id: deviceLibraryId,
      pass_type_id: passTypeId,
      serial_number: serialNumber,
      push_token: pushToken || null,
    }, { onConflict: 'device_library_id,pass_type_id,serial_number' })

  // Mark the pass as registered with Apple so syncAppleWallet knows it can push
  await supabaseAdmin
    .from('digital_passes')
    .update({ apple_pass_id: passTypeId })
    .eq('id', serialNumber)
    .is('apple_pass_id', null)

  return c.body(null, 201)
})

appleWalletRouter.get('/v1/devices/:deviceLibraryId/registrations/:passTypeId', async (c) => {
  const { deviceLibraryId, passTypeId } = c.req.param()
  const passesUpdatedSince = c.req.query('passesUpdatedSince')

  const { data: registrations } = await supabaseAdmin
    .from('apple_registrations')
    .select('serial_number')
    .eq('device_library_id', deviceLibraryId)
    .eq('pass_type_id', passTypeId)

  if (!registrations?.length) return c.body(null, 204)

  const serials = registrations.map((r: any) => r.serial_number)
  const { data: passesData } = await supabaseAdmin
    .from('digital_passes')
    .select('id, updated_at')
    .in('id', serials)

  if (!passesData?.length) return c.body(null, 204)

  const passMap = new Map(passesData.map((p: any) => [p.id, p.updated_at]))
  let passes = registrations.map((r: any) => ({
    serial_number: r.serial_number,
    updated_at: passMap.get(r.serial_number) || new Date().toISOString()
  }))

  if (passesUpdatedSince) {
    const since = isNaN(Number(passesUpdatedSince))
      ? new Date(passesUpdatedSince).getTime()
      : Number(passesUpdatedSince) * 1000

    passes = passes.filter(p => new Date(p.updated_at).getTime() > since)
  }

  if (!passes.length) return c.body(null, 204)

  const lastUpdated = passes.reduce((max, p) => {
    const t = new Date(p.updated_at).getTime()
    return t > max ? t : max
  }, 0)

  return c.json({
    lastUpdated: String(Math.floor(lastUpdated / 1000)),
    serialNumbers: passes.map(p => p.serial_number),
  })
})

appleWalletRouter.get('/v1/passes/:passTypeId/:serialNumber', async (c) => {
  const { passTypeId, serialNumber } = c.req.param()
  const authToken = getAuthToken(c)

  const { data: pass, error } = await supabaseAdmin
    .from('digital_passes')
    .select('*, customers(name), stores!inner(name, settings), loyalty_cards(points, tier)')
    .eq('id', serialNumber)
    .single()

  if (error || !pass) return c.body(null, 404)

  if (authToken !== (pass.metadata as any)?.apple_auth_token) {
    return c.body(null, 401)
  }

  const loyaltyCard = Array.isArray(pass.loyalty_cards) ? pass.loyalty_cards[0] : pass.loyalty_cards
  const points = loyaltyCard?.points ?? 0

  // Respect Apple Wallet's If-Modified-Since header per Apple's spec
  // Return 304 Not Modified if the pass hasn't changed since the device last fetched it
  // IMPORTANT: HTTP dates have 1-second precision but Supabase timestamps have millisecond
  // precision. We must truncate both to seconds before comparing, otherwise the 32ms
  // difference causes an infinite loop of 200 responses.
  const ifModifiedSince = c.req.header('If-Modified-Since')
  const passUpdatedAtSec = Math.floor(new Date(pass.updated_at).getTime() / 1000)
  if (ifModifiedSince) {
    const ifModifiedSinceSec = Math.floor(new Date(ifModifiedSince).getTime() / 1000)
    console.log(`🍎 Pass ${serialNumber.slice(0, 8)} | points=${points} | updated_at_sec=${passUpdatedAtSec} | if_modified_since_sec=${ifModifiedSinceSec} | newer=${passUpdatedAtSec > ifModifiedSinceSec}`)
    if (passUpdatedAtSec <= ifModifiedSinceSec) {
      console.log(`🍎 → 304 Not Modified`)
      return c.body(null, 304)
    }
  } else {
    console.log(`🍎 Pass ${serialNumber.slice(0, 8)} | points=${points} | no If-Modified-Since → sending full pass`)
  }

  const buffer = await appleWalletService.createPass({ ...pass, settings: (pass.stores as any)?.settings } as any)

  console.log(`🍎 → 200 OK sending updated pass (points=${points})`)
  return c.newResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.pkpass',
      'Last-Modified': new Date(pass.updated_at).toUTCString(),
    },
  })
})

appleWalletRouter.delete('/v1/devices/:deviceLibraryId/registrations/:passTypeId/:serialNumber', async (c) => {
  const { deviceLibraryId, passTypeId, serialNumber } = c.req.param()
  const authToken = getAuthToken(c)

  const { data: pass } = await supabaseAdmin
    .from('digital_passes')
    .select('id, metadata')
    .eq('id', serialNumber)
    .single()

  if (!pass || authToken !== (pass.metadata as any)?.apple_auth_token) {
    return c.body(null, 401)
  }

  await supabaseAdmin
    .from('apple_registrations')
    .delete()
    .eq('device_library_id', deviceLibraryId)
    .eq('pass_type_id', passTypeId)
    .eq('serial_number', serialNumber)

  return c.body(null, 200)
})

appleWalletRouter.post('/v1/log', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  console.log('🍎 Apple Wallet log:', JSON.stringify(body))
  return c.json({})
})
