'use client'

import { useState, useEffect } from 'react'
import { X, Star, Calendar, GripHorizontal, Search, UserPlus, UserX } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCustomerDrawerOpen } from '@/store/slices/posSlice'
import { setSelectedCustomer, clearSelectedCustomer } from '@/store/slices/customersSlice'
import { setCustomer } from '@/store/slices/cartSlice'
import { useGetCustomersQuery, useGetLoyaltyCardQuery, useGetGoogleWalletSaveUrlQuery } from '@/store/api'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { AddCustomerModal } from '@/components/pos/AddCustomerModal'
import { SendWhatsAppButton } from '@/components/pos/SendWhatsAppButton'
import type { CustomerWithLoyalty } from '@/store/slices/customersSlice'

export function CustomerDrawer() {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.pos.customerDrawerOpen)
  const selectedCustomer = useAppSelector((s) => s.customers.selectedCustomer)
  const [searchQuery, setSearchQuery] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)

  const shouldSearch = open && !selectedCustomer && searchQuery.trim().length >= 2
  const { data: searchResult, isFetching: searching } = useGetCustomersQuery(
    { search: searchQuery.trim(), limit: 50 },
    { skip: !shouldSearch },
  )
  const searchResults = searchResult?.data || []

  const selectedCustomerId = selectedCustomer?.id ?? ''
  const { data: loyaltyCard } = useGetLoyaltyCardQuery(selectedCustomerId, {
    skip: !selectedCustomerId || !open,
  })
  const passId = loyaltyCard?.digital_passes?.id
  const { data: googleWalletData, isLoading: googleLoading } = useGetGoogleWalletSaveUrlQuery(passId ?? '', {
    skip: !passId,
  })
  const googleSaveUrl = googleWalletData?.jwtUrl

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
    }
  }, [open])

  const handleSelectCustomer = (customer: CustomerWithLoyalty) => {
    dispatch(setSelectedCustomer(customer))
    dispatch(setCustomer({
      id: customer.id,
      name: customer.name,
      tier: customer.loyalty?.tier,
      points: customer.loyalty?.points,
    }))
    dispatch(setCustomerDrawerOpen(false))
    setSearchQuery('')
  }

  const handleClose = () => {
    dispatch(setCustomerDrawerOpen(false))
    setSearchQuery('')
  }

  const handleClearCustomer = () => {
    dispatch(clearSelectedCustomer())
    dispatch(setCustomer(null))
    dispatch(setCustomerDrawerOpen(false))
    setSearchQuery('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
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
            <h2 className="font-headline font-bold text-lg text-on-surface">
              {selectedCustomer ? 'Customer Profile' : 'Find Customer'}
            </h2>
            <div className="flex items-center gap-1.5">
              {!selectedCustomer && (
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 text-xs font-label font-bold text-primary hover:bg-primary/20 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
              {selectedCustomer && (
                <button
                  onClick={handleClearCustomer}
                  title="Remove customer"
                  aria-label="Remove customer"
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 text-xs font-label font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <UserX className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
              <button
                onClick={handleClose}
                title="Close"
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {!selectedCustomer ? (
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                autoFocus
                className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            {searching && (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {!searching && searchQuery.trim() && (searchResults?.length ?? 0) === 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <UserPlus className="mb-2 h-8 w-8 text-on-surface-variant/40" />
                <p className="text-sm text-on-surface-variant">No customers found</p>
                <p className="text-xs text-on-surface-variant/60">Try a different search term</p>
              </div>
            )}

            {!searching && (searchResults?.length ?? 0) > 0 && (
              <div className="space-y-1">
                {searchResults!.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-container-high transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-sm font-headline font-bold text-on-surface">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-label font-bold text-sm text-on-surface">{c.name}</p>
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        {c.email && <span className="truncate">{c.email}</span>}
                        {!c.email && c.phone && <span>{c.phone}</span>}
                        {c.loyalty && (
                          <>
                            <span>·</span>
                            <span className="text-primary font-bold">{c.loyalty.points || 0}pts</span>
                          </>
                        )}
                      </div>
                    </div>
                    {c.loyalty?.tier && (
                      <span className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-label font-bold capitalize',
                        c.loyalty.tier === 'platinum' && 'bg-primary/20 text-primary',
                        c.loyalty.tier === 'gold' && 'bg-amber-400/20 text-amber-400',
                        c.loyalty.tier === 'silver' && 'bg-slate-400/20 text-slate-300',
                        c.loyalty.tier === 'bronze' && 'bg-orange-600/20 text-orange-400',
                      )}>
                        {c.loyalty.tier}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!searchQuery.trim() && (
              <div className="flex flex-col items-center py-8 text-center">
                <Search className="mb-2 h-8 w-8 text-on-surface-variant/40" />
                <p className="text-sm text-on-surface-variant">Search for a customer</p>
                <p className="text-xs text-on-surface-variant/60">Type a name, email, or phone number</p>
              </div>
            )}
          </div>
        ) : (
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
                <SendWhatsAppButton
                  iconOnly
                  applePassUrl={passId ? `/api/wallet/apple/${passId}/download` : undefined}
                  googleSaveUrl={googleSaveUrl}
                  customerPhone={selectedCustomer.phone ?? undefined}
                  loading={googleLoading}
                />
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

            <button
              onClick={() => {
                dispatch(clearSelectedCustomer())
                dispatch(setCustomer(null))
              }}
              className="w-full rounded-lg border border-outline-variant py-2.5 text-sm font-label font-bold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Search for another customer
            </button>
          </div>
        )}
      </div>

      <AddCustomerModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onCreated={() => dispatch(setCustomerDrawerOpen(false))}
      />
    </div>
  )
}
