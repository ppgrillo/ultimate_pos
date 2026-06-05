'use client'

import { ChevronDown, ChevronUp, Star, Sparkles, Heart } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCustomerBarExpanded, setCustomerDrawerOpen } from '@/store/slices/posSlice'
import { cn } from '@/lib/utils'

export function CustomerQuickBar() {
  const dispatch = useAppDispatch()
  const selectedCustomer = useAppSelector((s) => s.customers.selectedCustomer)
  const cartCustomerName = useAppSelector((s) => s.cart.customer_name)
  const cartCustomerTier = useAppSelector((s) => s.cart.customer_tier)
  const expanded = useAppSelector((s) => s.pos.customerBarExpanded)

  const displayName = cartCustomerName || selectedCustomer?.name || null
  const tier = cartCustomerTier || selectedCustomer?.loyalty?.tier || null
  const points = selectedCustomer?.loyalty?.points ?? null

  if (!displayName) return null

  return (
    <div className="border-b border-outline-variant bg-surface-container/60">
      <button
        onClick={() => dispatch(setCustomerBarExpanded(!expanded))}
        className="flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container-high"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest text-sm font-headline font-bold text-on-surface shrink-0">
          {displayName.charAt(0)}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-headline font-bold text-sm text-on-surface truncate">
              {displayName}
            </span>
            {tier && (
              <span className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider',
                tier === 'platinum' && 'bg-primary/20 text-primary',
                tier === 'gold' && 'bg-amber-400/20 text-amber-400',
                tier === 'silver' && 'bg-slate-400/20 text-slate-300',
                tier === 'bronze' && 'bg-orange-600/20 text-orange-400',
              )}>
                {tier}
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-on-surface-variant shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-on-surface-variant shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-surface-container-high/50 border border-outline-variant/50 p-2.5 text-center">
              <Heart className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-[10px] text-on-surface-variant font-label font-bold">Favorites</p>
            </div>
            <div className="rounded-lg bg-surface-container-high/50 border border-outline-variant/50 p-2.5 text-center">
              <Star className="h-4 w-4 text-secondary mx-auto mb-1" />
              <p className="text-[10px] text-on-surface-variant font-label font-bold">{points ?? 0} pts</p>
            </div>
            <div className="rounded-lg bg-surface-container-high/50 border border-outline-variant/50 p-2.5 text-center">
              <Sparkles className="h-4 w-4 text-tertiary mx-auto mb-1" />
              <p className="text-[10px] text-on-surface-variant font-label font-bold">Promo</p>
            </div>
          </div>
          <button
            onClick={() => {
              dispatch(setCustomerDrawerOpen(true))
              dispatch(setCustomerBarExpanded(false))
            }}
            className="w-full rounded-lg bg-surface-container-high py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            View Profile
          </button>
        </div>
      )}
    </div>
  )
}
