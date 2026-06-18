'use client'

import { getNextKitchenTransitions, getNextRetailTransitions } from '@ultimate-pos/shared'
import type { OrderStatus, OrderStatusTransition } from '@ultimate-pos/shared'
import { cn } from '@/lib/utils'
import { CookingPot, Bell, Hand, DollarSign, XCircle } from 'lucide-react'

const transitionIcons: Record<string, typeof CookingPot> = {
  preparing: CookingPot,
  ready: Bell,
  served: Hand,
  paid: DollarSign,
  cancelled: XCircle,
}

interface KitchenOrderActionsProps {
  status: OrderStatus
  hasKitchen: boolean
  loading?: boolean
  variant?: 'inline' | 'block'
  onTransition: (to: OrderStatus) => void
}

export function KitchenOrderActions({ status, hasKitchen, loading, onTransition, variant = 'inline' }: KitchenOrderActionsProps) {
  const transitions = hasKitchen
    ? getNextKitchenTransitions(status)
    : getNextRetailTransitions(status)

  if (transitions.length === 0) return null

  const forwardTransitions = transitions.filter((t) => t.to !== 'cancelled')
  const cancelTransition = transitions.find((t) => t.to === 'cancelled')

  if (variant === 'block' && forwardTransitions.length > 0) {
    return (
      <div className="flex flex-col gap-1.5">
        {forwardTransitions.map((t) => {
          const Icon = transitionIcons[t.to] || CookingPot
          return (
            <button
              key={t.to}
              onClick={() => onTransition(t.to)}
              disabled={loading}
              className={cn(
                'flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-label font-bold transition-all duration-150',
                'hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100',
                'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30',
              )}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span>{t.label}</span>
            </button>
          )
        })}
        {cancelTransition && (
          <button
            onClick={() => onTransition(cancelTransition.to)}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-label font-bold text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>{cancelTransition.label}</span>
          </button>
        )}
      </div>
    )
  }

  if (transitions.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {transitions.map((t: OrderStatusTransition) => {
        const Icon = transitionIcons[t.to] || CookingPot
        const isCancel = t.to === 'cancelled'

        return (
          <button
            key={t.to}
            onClick={() => onTransition(t.to)}
            disabled={loading}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-sm font-label font-bold transition-all duration-150',
              'hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100',
              isCancel
                ? 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25'
                : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30',
            )}
          >
            {loading ? (
              <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            <span>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
