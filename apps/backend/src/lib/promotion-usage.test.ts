import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockUpdate, mockFreshSingle } = vi.hoisted(() => {
  const mockRpc = vi.fn()
  const mockUpdate = vi.fn((_payload: Record<string, unknown>) => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))
  const mockFreshSingle = vi.fn()
  return { mockRpc, mockUpdate, mockFreshSingle }
})

vi.mock('../lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockFreshSingle })) })),
      update: mockUpdate,
    })),
    rpc: mockRpc,
  },
}))

import { revertPromotionUsageIfNeeded } from './promotion-usage'

describe('revertPromotionUsageIfNeeded', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFreshSingle.mockResolvedValue({
      data: { metadata: { mpOrderId: 'x', mpOrderStatus: 'processing', payment: { providerStatus: 'processing' } } },
      error: null,
    })
  })

  it('merges the flag into fresh DB metadata instead of the stale caller copy', async () => {
    mockFreshSingle.mockResolvedValue({
      data: {
        metadata: { mpOrderId: 'x', mpOrderStatus: 'canceled', payment: { providerStatus: 'canceled' } },
      },
      error: null,
    })

    await revertPromotionUsageIfNeeded(
      'order-1',
      { mpOrderId: 'x', mpOrderStatus: 'processing', payment: { providerStatus: 'processing' } },
      [],
    )

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const calls = mockUpdate.mock.calls as Array<[Record<string, unknown>]>
    const [payload] = calls[0]
    const metadata = payload.metadata as Record<string, unknown>
    expect(metadata).toEqual(
      expect.objectContaining({
        mpOrderStatus: 'canceled',
        promotionUsageReverted: true,
        payment: { providerStatus: 'canceled' },
      }),
    )
  })

  it('does not regress the provider status when the order already reflects a terminal outcome', async () => {
    mockFreshSingle.mockResolvedValue({
      data: {
        metadata: { mpOrderId: 'x', mpOrderStatus: 'canceled', payment: { providerStatus: 'canceled' } },
      },
      error: null,
    })

    await revertPromotionUsageIfNeeded('order-1', { mpOrderStatus: 'processing' }, [])

    const calls = mockUpdate.mock.calls as Array<[Record<string, unknown>]>
    const [payload] = calls[0]
    const metadata = payload.metadata as Record<string, unknown>
    expect(metadata.payment).toEqual({ providerStatus: 'canceled' })
    expect(metadata.mpOrderStatus).toBe('canceled')
  })

  it('decrements promotion usage ids', async () => {
    await revertPromotionUsageIfNeeded('order-1', { promotionUsageIds: ['promo-1', 'promo-2'] }, [])

    expect(mockRpc).toHaveBeenCalledTimes(2)
    expect(mockRpc).toHaveBeenCalledWith('decrement_promotion_uses', { promo_id: 'promo-1' })
    expect(mockRpc).toHaveBeenCalledWith('decrement_promotion_uses', { promo_id: 'promo-2' })
  })

  it('does nothing when already reverted', async () => {
    await revertPromotionUsageIfNeeded('order-1', { promotionUsageReverted: true }, [])

    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
