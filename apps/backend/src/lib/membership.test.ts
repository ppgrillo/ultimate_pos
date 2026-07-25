import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

import { pickPrimaryMembership } from './membership'

describe('pickPrimaryMembership', () => {
  it('returns null for empty memberships', () => {
    expect(pickPrimaryMembership([])).toBeNull()
  })

  it('prioritizes admin role over employee', () => {
    const selected = pickPrimaryMembership([
      { store_id: 'store-employee', role: 'employee', joined_at: '2026-07-01T10:00:00.000Z' },
      { store_id: 'store-admin', role: 'admin', joined_at: '2026-06-01T10:00:00.000Z' },
    ])

    expect(selected?.store_id).toBe('store-admin')
  })

  it('uses newest joined_at when roles are equal', () => {
    const selected = pickPrimaryMembership([
      { store_id: 'store-old', role: 'admin', joined_at: '2026-01-01T10:00:00.000Z' },
      { store_id: 'store-new', role: 'admin', joined_at: '2026-07-01T10:00:00.000Z' },
    ])

    expect(selected?.store_id).toBe('store-new')
  })
})
