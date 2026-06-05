'use client'

import { Search, Star, Heart, BadgePercent } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSelectedCustomer } from '@/store/slices/customersSlice'
import { setCustomer } from '@/store/slices/cartSlice'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function RightPanelCustomer() {
  const dispatch = useAppDispatch()
  const selectedCustomer = useAppSelector((s) => s.customers.selectedCustomer)
  const customers = useAppSelector((s) => s.customers.customers)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="border-b border-outline-variant">
      {!selectedCustomer && !searchOpen ? (
        <button
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          <Search className="h-4 w-4" />
          Search customer...
        </button>
      ) : (
        <div className="p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="h-8 w-full rounded-md border border-outline-variant bg-surface-container pl-8 pr-2 text-xs text-on-body placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              autoFocus
            />
          </div>
          {searchQuery && filtered.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    dispatch(setSelectedCustomer(c))
                    dispatch(setCustomer({ id: c.id, name: c.name, tier: c.loyalty?.tier }))
                    setSearchOpen(false)
                    setSearchQuery('')
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-highest text-[10px] font-headline font-bold text-on-surface">
                    {c.name.charAt(0)}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="font-label font-bold truncate">{c.name}</p>
                    {c.loyalty?.tier && (
                      <p className="text-[10px] text-on-surface-variant capitalize">{c.loyalty.tier}</p>
                    )}
                  </div>
                  {c.loyalty?.points ? (
                    <span className="text-[10px] text-primary font-label font-bold">{c.loyalty.points} pts</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
          {searchQuery && filtered.length === 0 && (
            <p className="text-xs text-on-surface-variant text-center py-2">No customers found</p>
          )}
        </div>
      )}

      {selectedCustomer && !searchOpen && (
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-highest text-sm font-headline font-bold text-on-surface shrink-0">
              {selectedCustomer.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-headline font-bold text-sm text-on-surface truncate">{selectedCustomer.name}</p>
              {selectedCustomer.email && (
                <p className="text-[11px] text-on-surface-variant truncate">{selectedCustomer.email}</p>
              )}
            </div>
            {selectedCustomer.loyalty?.tier && (
              <span className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider',
                selectedCustomer.loyalty.tier === 'platinum' && 'bg-primary/20 text-primary',
                selectedCustomer.loyalty.tier === 'gold' && 'bg-amber-400/20 text-amber-400',
                selectedCustomer.loyalty.tier === 'silver' && 'bg-slate-400/20 text-slate-300',
                selectedCustomer.loyalty.tier === 'bronze' && 'bg-orange-600/20 text-orange-400',
              )}>
                {selectedCustomer.loyalty.tier}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-primary" />
              <span className="font-label font-bold">{selectedCustomer.loyalty?.points || 0} Points</span>
            </div>
            <span className="text-outline-variant">·</span>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-secondary" />
              <span>No favorites yet</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-surface-container-high/50 border border-outline-variant/50 px-2.5 py-1.5">
            <BadgePercent className="h-3 w-3 text-tertiary" />
            <span className="text-[10px] text-on-surface-variant">3 Coupons Available</span>
          </div>
        </div>
      )}
    </div>
  )
}
