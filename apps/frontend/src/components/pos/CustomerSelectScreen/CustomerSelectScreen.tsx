'use client'

import { Search, Star, ShoppingBag, Calendar, Tag, Heart, ArrowRight, Clock } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchCustomers, fetchCustomerSummary, setSelectedCustomer } from '@/store/slices/customersSlice'
import { setCustomer } from '@/store/slices/cartSlice'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import type { CustomerWithLoyalty } from '@/store/slices/customersSlice'

interface CustomerSelectScreenProps {
  onStartOrder?: () => void
  onSkip?: () => void
}

export function CustomerSelectScreen({ onStartOrder, onSkip }: CustomerSelectScreenProps) {
  const dispatch = useAppDispatch()
  const customers = useAppSelector((s) => s.customers.customers)
  const customerSummary = useAppSelector((s) => s.customers.customerSummary)
  const isLoadingSummary = useAppSelector((s) => s.customers.isLoadingSummary)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchCustomers({ sort: 'name' }))
  }, [dispatch])

  useEffect(() => {
    if (selectedCustomerId) {
      dispatch(fetchCustomerSummary(selectedCustomerId))
    }
  }, [dispatch, selectedCustomerId])

  const q = searchQuery.toLowerCase()
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(q) ||
    c.email?.toLowerCase().includes(q) ||
    c.phone?.toLowerCase().includes(q),
  )

  const handleSelectCustomer = (customer: CustomerWithLoyalty) => {
    setSelectedCustomerId(customer.id)
  }

  const handleStartOrder = () => {
    if (!customerSummary) return
    dispatch(setSelectedCustomer(customerSummary.customer))
    dispatch(setCustomer({
      id: customerSummary.customer.id,
      name: customerSummary.customer.name,
      tier: customerSummary.customer.loyalty?.tier,
    }))
    onStartOrder?.()
  }

  const handleSkip = () => {
    onSkip?.()
  }

  const summary = customerSummary?.customer.id === selectedCustomerId ? customerSummary : null
  const customer = summary?.customer || customers.find((c) => c.id === selectedCustomerId)

  const formatDate = (iso: string | null) => {
    if (!iso) return null
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Search header */}
      <div className="border-b border-outline-variant px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSelectedCustomerId(null)
            }}
            placeholder="Search by name, email, or phone..."
            className="h-10 w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-4 text-sm text-on-body placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedCustomerId && searchQuery && (
          <>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Search className="h-10 w-10 text-on-surface-variant/30 mb-3" />
                <p className="text-sm text-on-surface-variant">No customers found</p>
                <p className="text-xs text-on-surface-variant/50 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/50">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-container transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest text-sm font-headline font-bold text-on-surface shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-label font-bold text-sm text-on-surface truncate">{c.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'}
                      </p>
                    </div>
                    {c.loyalty?.points ? (
                      <span className="text-xs text-primary font-label font-bold">{c.loyalty.points} pts</span>
                    ) : null}
                    <ArrowRight className="h-4 w-4 text-on-surface-variant shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {selectedCustomerId && (
          <div className="p-4 space-y-4">
            {/* Customer header */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-highest text-lg font-headline font-bold text-on-surface shrink-0">
                {customer?.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-headline font-bold text-base text-on-surface truncate">
                  {customer?.name || 'Loading...'}
                </p>
                {customer?.email && (
                  <p className="text-xs text-on-surface-variant truncate">{customer.email}</p>
                )}
                {customer?.phone && (
                  <p className="text-xs text-on-surface-variant truncate">{customer.phone}</p>
                )}
              </div>
              {customer?.loyalty?.tier && (
                <span className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider',
                  customer.loyalty.tier === 'platinum' && 'bg-primary/20 text-primary',
                  customer.loyalty.tier === 'gold' && 'bg-amber-400/20 text-amber-400',
                  customer.loyalty.tier === 'silver' && 'bg-slate-400/20 text-slate-300',
                  customer.loyalty.tier === 'bronze' && 'bg-orange-600/20 text-orange-400',
                )}>
                  {customer.loyalty.tier}
                </span>
              )}
            </div>

            {/* Loyalty & Stats row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                <Star className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="font-label font-bold text-sm text-on-surface">{customer?.loyalty?.points || 0}</p>
                <p className="text-[10px] text-on-surface-variant">Points</p>
              </div>
              <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                <ShoppingBag className="h-4 w-4 text-secondary mx-auto mb-1" />
                <p className="font-label font-bold text-sm text-on-surface">${Number(customer?.total_spent || 0).toLocaleString()}</p>
                <p className="text-[10px] text-on-surface-variant">Total Spent</p>
              </div>
              <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                <Tag className="h-4 w-4 text-tertiary mx-auto mb-1" />
                <p className="font-label font-bold text-sm text-on-surface">{customer?.total_visits || 0}</p>
                <p className="text-[10px] text-on-surface-variant">Visits</p>
              </div>
            </div>

            {/* Recent info */}
            {summary && (
              <div className="space-y-2">
                {summary.lastVisit && (
                  <div className="flex items-center gap-2 rounded-xl bg-surface-container/40 border border-outline-variant/30 px-3 py-2">
                    <Clock className="h-4 w-4 text-on-surface-variant" />
                    <span className="text-xs text-on-surface-variant">
                      Last visit: <span className="font-label font-bold text-on-surface">{formatDate(summary.lastVisit)}</span>
                    </span>
                  </div>
                )}
                {summary.upcomingBirthday !== null && (
                  <div className="flex items-center gap-2 rounded-xl bg-surface-container/40 border border-outline-variant/30 px-3 py-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-xs text-on-surface-variant">
                      Birthday in <span className="font-label font-bold text-primary">{summary.upcomingBirthday} days</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {customer?.tags && customer.tags.length > 0 && (
              <div>
                <p className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-[10px] font-label text-on-surface-variant border border-outline-variant/50">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences */}
            {customer?.preferences && Object.keys(customer.preferences).length > 0 && (
              <div>
                <p className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1">
                  <Heart className="h-3 w-3" /> Preferences
                </p>
                <div className="space-y-1">
                  {Object.entries(customer.preferences).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-lg bg-surface-container/40 px-3 py-1.5 text-xs">
                      <span className="text-on-surface-variant capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-label font-bold text-on-surface">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent orders */}
            {summary?.recentOrders && summary.recentOrders.length > 0 && (
              <div>
                <p className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">
                  Recent Orders
                </p>
                <div className="space-y-1.5">
                  {summary.recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between rounded-lg bg-surface-container/40 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <ShoppingBag className="h-3 w-3 text-on-surface-variant shrink-0" />
                        <span className="text-on-surface-variant truncate">
                          {order.items?.length || 0} items
                        </span>
                      </div>
                      <span className="font-label font-bold text-on-surface shrink-0">
                        ${Number(order.total || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoadingSummary && (
              <div className="flex items-center justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        )}

        {/* No search yet — show hint */}
        {!searchQuery && !selectedCustomerId && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Search className="h-12 w-12 text-on-surface-variant/20 mb-4" />
            <p className="text-sm text-on-surface-variant">Search for a customer</p>
            <p className="text-xs text-on-surface-variant/50 mt-1">
              Find by name, email, or phone number
            </p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-outline-variant p-4 space-y-2">
        {summary ? (
          <button
            onClick={handleStartOrder}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-label font-bold text-primary-on hover:bg-primary/90 transition-colors"
          >
            Start Order
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
        <button
          onClick={handleSkip}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          Continue without customer
        </button>
      </div>
    </div>
  )
}
