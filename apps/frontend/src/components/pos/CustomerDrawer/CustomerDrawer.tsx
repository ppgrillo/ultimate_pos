'use client'

import { X, History, Star, Calendar, GripHorizontal } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCustomerDrawerOpen } from '@/store/slices/posSlice'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function CustomerDrawer() {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.pos.customerDrawerOpen)
  const selectedCustomer = useAppSelector((s) => s.customers.selectedCustomer)

  if (!open || !selectedCustomer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => dispatch(setCustomerDrawerOpen(false))} />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-t-2xl bg-surface-container shadow-xl',
          'animate-slide-up max-h-[85vh] overflow-y-auto',
        )}
      >
        <div className="sticky top-0 bg-surface-container z-10 rounded-t-2xl border-b border-outline-variant">
          <div className="flex justify-center pt-2 pb-1">
            <GripHorizontal className="h-5 w-5 text-on-surface-variant/50" />
          </div>
          <div className="flex items-center justify-between px-4 pb-3">
            <h2 className="font-headline font-bold text-lg text-on-surface">Customer Profile</h2>
            <button
              onClick={() => dispatch(setCustomerDrawerOpen(false))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-highest text-2xl font-headline font-bold text-on-surface mb-3">
              {selectedCustomer.name.charAt(0)}
            </div>
            <h3 className="font-headline font-bold text-xl text-on-surface">{selectedCustomer.name}</h3>
            {selectedCustomer.email && (
              <p className="text-sm text-on-surface-variant">{selectedCustomer.email}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <span className={cn(
                'rounded-full px-3 py-0.5 text-xs font-label font-bold',
                selectedCustomer.loyalty?.tier === 'platinum' && 'bg-primary/20 text-primary',
                selectedCustomer.loyalty?.tier === 'gold' && 'bg-amber-400/20 text-amber-400',
                selectedCustomer.loyalty?.tier === 'silver' && 'bg-slate-400/20 text-slate-300',
                selectedCustomer.loyalty?.tier === 'bronze' && 'bg-orange-600/20 text-orange-400',
                !selectedCustomer.loyalty?.tier && 'bg-surface-container-high text-on-surface-variant',
              )}>
                {selectedCustomer.loyalty?.tier || 'Bronze'}
              </span>
              <span className="rounded-full bg-surface-container-high px-3 py-0.5 text-xs font-label font-bold text-on-surface-variant">
                {selectedCustomer.total_visits} visits
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface-container-high/50 border border-outline-variant p-3 text-center">
              <Star className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="font-headline font-bold text-lg text-on-surface">{selectedCustomer.loyalty?.points || 0}</p>
              <p className="text-xs text-on-surface-variant">Points</p>
            </div>
            <div className="rounded-xl bg-surface-container-high/50 border border-outline-variant p-3 text-center">
              <Calendar className="h-5 w-5 text-secondary mx-auto mb-1" />
              <p className="font-headline font-bold text-lg text-on-surface">{formatCurrency(selectedCustomer.total_spent)}</p>
              <p className="text-xs text-on-surface-variant">Total Spent</p>
            </div>
          </div>

          <div>
            <h4 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">
              History & Activity
            </h4>
            <div className="space-y-1">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <History className="h-4 w-4" />
                Recent Activity
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <Star className="h-4 w-4" />
                Loyalty Status
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors">
                <Calendar className="h-4 w-4" />
                Visit History
              </button>
            </div>
          </div>

          <button className="w-full rounded-lg border border-outline-variant py-2.5 text-sm font-label font-bold text-on-surface hover:bg-surface-container-high transition-colors">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  )
}
