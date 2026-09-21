import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { errorHandler } from '../middleware/error'

const USER_ID = '11111111-1111-1111-1111-111111111111'
const STORE_ID = '22222222-2222-2222-2222-222222222222'

const { rpcMock, fromMock } = vi.hoisted(() => {
  const rpcMock = vi.fn()
  const fromMock = vi.fn()
  return { rpcMock, fromMock }
})

vi.mock('../lib/supabase/admin', () => ({
  supabaseAdmin: { rpc: rpcMock, from: fromMock },
}))

vi.mock('../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('userId', USER_ID)
    c.set('storeId', STORE_ID)
    c.set('role', 'admin')
    c.set('token', 'test-token')
    await next()
  },
  requireRole: () => async (_c: any, next: any) => next(),
}))

vi.mock('../middleware/requireAccess', () => ({
  requireAccess: async (_c: any, next: any) => next(),
}))

import { storesRouter } from './stores'

const app = new Hono().route('/stores', storesRouter)
app.onError(errorHandler)

function singleResult(result: { data: any; error: any }) {
  const query: any = {
    eq: vi.fn(() => query),
    single: vi.fn(async () => result),
    select: vi.fn(() => query),
    update: vi.fn(() => query),
  }
  return query
}

async function putSettings(body: unknown) {
  const req = new Request('http://localhost/stores/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
    body: JSON.stringify(body),
  })
  return app.fetch(req)
}

async function deleteStation(id: string) {
  const req = new Request(`http://localhost/stores/self-checkout/stations/${id}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer test' },
  })
  return app.fetch(req)
}

describe('stores PUT /settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_SECRET = 'test-secret-123'
  })

  it('pushes the full incoming settings (including empty nested strings) to the atomic RPC', async () => {
    rpcMock.mockResolvedValue({
      data: { walletPassDesign: { issuerName: 'Mi Negocio', logoUrl: '' }, hasKitchen: true },
      error: null,
    })
    fromMock.mockImplementation(() => singleResult({ data: { tax_rate: 0 }, error: null }))

    const res = await putSettings({
      settings: { walletPassDesign: { issuerName: 'Mi Negocio', logoUrl: '' }, hasKitchen: true },
    })

    expect(res.status).toBe(200)
    // No client-side merge trickery: the whole incoming object goes to the DB merge.
    const [, args] = rpcMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(rpcMock).toHaveBeenCalledWith(
      'upsert_store_settings',
      expect.objectContaining({ p_store_id: STORE_ID, p_actor: USER_ID }),
    )
    expect((args.p_updates as Record<string, unknown>).walletPassDesign).toEqual({ issuerName: 'Mi Negocio', logoUrl: '' })
  })

  it('updates tax_rate as a separate column when provided', async () => {
    rpcMock.mockResolvedValue({ data: { hasKitchen: true }, error: null })
    fromMock.mockImplementation(() => singleResult({ data: { tax_rate: 8 }, error: null }))

    const res = await putSettings({ settings: { hasKitchen: true, taxRate: 8 } })

    expect(res.status).toBe(200)
    expect(fromMock).toHaveBeenCalledWith('stores')
    const query = fromMock.mock.results[0].value
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ tax_rate: 8 }))
    expect(query.update).not.toHaveBeenCalledWith(expect.objectContaining({ settings: expect.anything() }))
    const body = await res.json()
    expect(body.tax_rate).toBe(8)
  })

  it('reads the current tax_rate without updating it when absent from the payload', async () => {
    rpcMock.mockResolvedValue({ data: { hasKitchen: false }, error: null })
    fromMock.mockImplementation(() => singleResult({ data: { tax_rate: 16 }, error: null }))

    const res = await putSettings({ settings: { hasKitchen: false } })

    expect(res.status).toBe(200)
    expect(fromMock).toHaveBeenCalledTimes(1)
    const query = fromMock.mock.results[0].value
    expect(query.update).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.tax_rate).toBe(16)
  })

  it('strips secret keys from the response', async () => {
    rpcMock.mockResolvedValue({
      data: { mpPointAccessToken: 'enc:secret', clipApiKey: 'enc:secret', hasKitchen: true },
      error: null,
    })
    fromMock.mockImplementation(() => singleResult({ data: { tax_rate: 0 }, error: null }))

    const res = await putSettings({ settings: { hasKitchen: true } })
    const body = await res.json()

    expect(body.settings.mpPointAccessToken).toBeUndefined()
    expect(body.settings.clipApiKey).toBeUndefined()
    expect(body.settings.hasKitchen).toBe(true)
  })
})

async function postStation(body: unknown) {
  const req = new Request('http://localhost/stores/self-checkout/stations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
    body: JSON.stringify(body),
  })
  return app.fetch(req)
}

async function rotateStationToken(id: string) {
  const req = new Request(`http://localhost/stores/self-checkout/stations/${id}/token`, {
    method: 'POST',
    headers: { Authorization: 'Bearer test' },
  })
  return app.fetch(req)
}

describe('stores self-checkout stations (atomic RPCs)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_SECRET = 'test-secret-123'
    fromMock.mockReset()
  })

  it('POST /stations appends atomically via store_station_add and returns 201', async () => {
    fromMock.mockImplementation(() =>
      singleResult({ data: { settings: {} }, error: null }),
    )
    rpcMock.mockResolvedValue({ data: { applied: true, stations: '[]' }, error: null })

    const res = await postStation({ name: 'Caja 1', terminalId: 'T1', provider: 'mercado_pago' })

    expect(res.status).toBe(201)
    expect(rpcMock).toHaveBeenCalledTimes(1)
    const [fn, args] = rpcMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(fn).toBe('store_station_add')
    expect(args.p_store_id).toBe(STORE_ID)
    expect(args.p_actor).toBe(USER_ID)
    expect(args.p_station).toEqual(expect.objectContaining({ name: 'Caja 1', terminalId: 'T1', provider: 'mercado_pago', isActive: true }))
  })

  it('POST /stations rejects when the id already exists', async () => {
    fromMock.mockImplementation(() =>
      singleResult({ data: { settings: {} }, error: null }),
    )
    rpcMock.mockResolvedValue({ data: { applied: false }, error: null })

    const res = await postStation({ name: 'Caja 1', terminalId: 'T1' })
    expect(res.status).toBe(400)
  })

  it('POST /stations/:id/token rotates atomically via store_station_rotate_token', async () => {
    rpcMock.mockResolvedValue({ data: { applied: true }, error: null })

    const res = await rotateStationToken('station-1')

    expect(res.status).toBe(200)
    expect(fromMock).not.toHaveBeenCalled()
    const [fn, args] = rpcMock.mock.calls[0] as [string, Record<string, unknown>]
    expect(fn).toBe('store_station_rotate_token')
    expect(args.p_station_id).toBe('station-1')
    expect(args.p_token).toEqual(expect.any(String))
    const body = await res.json()
    expect(body.data.token).toMatch(/^ey/)
  })

  it('POST /stations/:id/token returns 404 when the station does not exist', async () => {
    rpcMock.mockResolvedValue({ data: { applied: false }, error: null })

    const res = await rotateStationToken('station-missing')
    expect(res.status).toBe(404)
  })

  it('DELETE /stations/:id removes through the atomic RPC without re-reading settings', async () => {
    rpcMock.mockResolvedValue({ data: { applied: true }, error: null })

    const res = await deleteStation('station-1')

    expect(res.status).toBe(200)
    expect(fromMock).not.toHaveBeenCalled()
    expect(rpcMock).toHaveBeenCalledWith('store_station_remove', {
      p_store_id: STORE_ID,
      p_station_id: 'station-1',
      p_actor: USER_ID,
    })
  })

  it('DELETE returns 404 when the station does not exist (rpc applied=false)', async () => {
    rpcMock.mockResolvedValue({ data: { applied: false }, error: null })

    const res = await deleteStation('station-missing')

    expect(res.status).toBe(404)
    expect(rpcMock).toHaveBeenCalledWith('store_station_remove', expect.objectContaining({ p_station_id: 'station-missing' }))
  })
})