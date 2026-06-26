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

  return c.body(null, 201)
})

appleWalletRouter.get('/v1/devices/:deviceLibraryId/registrations/:passTypeId', async (c) => {
  const { deviceLibraryId, passTypeId } = c.req.param()
  const passesUpdatedSince = c.req.query('passesUpdatedSince')

  const { data: registrations } = await supabaseAdmin
    .from('apple_registrations')
    .select('serial_number, created_at')
    .eq('device_library_id', deviceLibraryId)
    .eq('pass_type_id', passTypeId)

  if (!registrations?.length) return c.body(null, 204)

  let passes = registrations

  if (passesUpdatedSince) {
    const since = isNaN(Number(passesUpdatedSince))
      ? new Date(passesUpdatedSince).getTime()
      : Number(passesUpdatedSince) * 1000

    passes = passes.filter(p => new Date(p.created_at).getTime() > since)
  }

  if (!passes.length) return c.body(null, 204)

  const lastUpdated = passes.reduce((max, p) => {
    const t = new Date(p.created_at).getTime()
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

  const buffer = await appleWalletService.createPass({ ...pass, settings: (pass.stores as any)?.settings } as any)

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
