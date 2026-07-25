import { supabaseAdmin } from './supabase/admin'

type StoreMembership = {
  store_id: string
  role: string | null
  joined_at?: string | null
}

function roleWeight(role: string | null | undefined): number {
  if (role === 'admin') return 2
  if (role === 'employee') return 1
  return 0
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

export function pickPrimaryMembership(memberships: StoreMembership[]): StoreMembership | null {
  if (memberships.length === 0) return null

  const sorted = [...memberships].sort((a, b) => {
    const roleDiff = roleWeight(b.role) - roleWeight(a.role)
    if (roleDiff !== 0) return roleDiff

    const joinedAtDiff = toTimestamp(b.joined_at) - toTimestamp(a.joined_at)
    if (joinedAtDiff !== 0) return joinedAtDiff

    return a.store_id.localeCompare(b.store_id)
  })

  return sorted[0]
}

export async function getPrimaryMembership(profileId: string): Promise<StoreMembership | null> {
  const { data, error } = await supabaseAdmin
    .from('store_members')
    .select('store_id, role, joined_at')
    .eq('profile_id', profileId)

  if (error || !data) return null
  return pickPrimaryMembership(data as StoreMembership[])
}
