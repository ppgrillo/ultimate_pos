'use client'

import { Star, ShoppingBag, Sparkles } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'

export function CustomerQuickPanel() {
  const selectedCustomer = useAppSelector((s) => s.customers.selectedCustomer)
  const cartCustomerName = useAppSelector((s) => s.cart.customer_name)

  if (!selectedCustomer && !cartCustomerName) return null

  const displayName = cartCustomerName || selectedCustomer?.name || 'Customer'

  return (
    <div className="rounded-xl bg-surface-container/80 border border-outline-variant p-3 backdrop-blur-glass">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="font-headline font-bold text-sm text-on-surface">{displayName}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-surface-container-high/50 p-2 text-center">
          <ShoppingBag className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
          <p className="text-[10px] text-on-surface-variant">Favorites</p>
        </div>
        <div className="rounded-lg bg-surface-container-high/50 p-2 text-center">
          <Star className="h-3.5 w-3.5 text-secondary mx-auto mb-0.5" />
          <p className="text-[10px] text-on-surface-variant">Points</p>
        </div>
        <div className="rounded-lg bg-surface-container-high/50 p-2 text-center">
          <Sparkles className="h-3.5 w-3.5 text-tertiary mx-auto mb-0.5" />
          <p className="text-[10px] text-on-surface-variant">Promo</p>
        </div>
      </div>
    </div>
  )
}
