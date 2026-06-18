'use client'

import { cn } from '@/lib/utils'
import type { OrderStatus } from '@ultimate-pos/shared'

const statusConfig: Record<OrderStatus, { label: string; classes: string }> = {
  pending:   { label: 'Pending',   classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  preparing: { label: 'Preparing', classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  ready:     { label: 'Ready',     classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  served:    { label: 'Served',    classes: 'bg-teal-500/15 text-teal-400 border-teal-500/25' },
  paid:      { label: 'Paid',      classes: 'bg-lime-500/15 text-lime-400 border-lime-500/25' },
  cancelled: { label: 'Cancelled', classes: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25' },
}

interface OrderStatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md'
}

export function OrderStatusBadge({ status, size = 'md' }: OrderStatusBadgeProps) {
  const config = statusConfig[status]
  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-label font-bold leading-none',
        size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
        config.classes,
      )}
    >
      <span className={cn('rounded-full bg-current', size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2')} />
      {config.label}
    </span>
  )
}
