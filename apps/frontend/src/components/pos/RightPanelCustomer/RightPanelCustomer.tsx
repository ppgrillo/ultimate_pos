'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Calendar, ChevronDown, ChevronUp, Clock, Heart, QrCode, Search, ShoppingBag, Star, Tag, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSelectedCustomer } from '@/store/slices/customersSlice'
import { setCustomer } from '@/store/slices/cartSlice'
import { cn } from '@/lib/utils'
import { useGetCustomersQuery, useGetCustomerSummaryQuery, useGetLoyaltyCardQuery, useGetGoogleWalletSaveUrlQuery } from '@/store/api'
import { QRScannerPopover } from '@/components/pos/QRScannerPopover'
import { QuickCustomerRegister } from '@/components/pos/QuickCustomerRegister'
import { SendWhatsAppButton } from '@/components/pos/SendWhatsAppButton'
import type { CustomerWithLoyalty } from '@/store/api'

export function RightPanelCustomer() {
  const dispatch = useAppDispatch()
  const selectedCustomer = useAppSelector((s) => s.customers?.selectedCustomer)
  const cartItemCount = useAppSelector((s) => s.cart.items.length)
  const [searchQuery, setSearchQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const previousCartItemCount = useRef(cartItemCount)
  const sliceCustomers = useAppSelector((s) => ((s as any).customers?.customers ?? []) as CustomerWithLoyalty[])
  const sliceSummary = useAppSelector((s) => (s as any).customers?.customerSummary)
  const sliceLoadingSummary = useAppSelector((s) => Boolean((s as any).customers?.isLoadingSummary))
  const { data: result } = useGetCustomersQuery({ limit: 500 })
  const queryCustomers = result?.data || []
  const { data: customerSummary, isFetching: isLoadingSummary } = useGetCustomerSummaryQuery(selectedCustomer?.id || '', {
    skip: !selectedCustomer?.id,
  })
  const selectedCustomerId = selectedCustomer?.id ?? ''
  const { data: loyaltyCard } = useGetLoyaltyCardQuery(selectedCustomerId, { skip: !selectedCustomerId })
  const passId = loyaltyCard?.digital_passes?.id
  const { data: googleWalletData, isLoading: googleLoading } = useGetGoogleWalletSaveUrlQuery(passId ?? '', { skip: !passId })
  const googleSaveUrl = googleWalletData?.jwtUrl
  const customers: CustomerWithLoyalty[] = queryCustomers.length > 0 ? queryCustomers : sliceCustomers

  useEffect(() => {
    if (selectedCustomer) {
      setExpanded(true)
    } else {
      setExpanded(false)
    }
  }, [dispatch, selectedCustomer])

  useEffect(() => {
    if (previousCartItemCount.current === 0 && cartItemCount > 0) {
      setExpanded(false)
    }
    previousCartItemCount.current = cartItemCount
  }, [cartItemCount])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return customers.filter((c: CustomerWithLoyalty) =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q),
    )
  }, [customers, searchQuery])

  const handleClear = () => {
    dispatch(setSelectedCustomer(null))
    dispatch(setCustomer(null))
    setExpanded(false)
  }

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

  const summary = selectedCustomer && customerSummary?.customer.id === selectedCustomer.id
    ? customerSummary
    : selectedCustomer && sliceSummary?.customer.id === selectedCustomer.id
      ? sliceSummary
      : null
  const summaryLoading = selectedCustomer?.id ? isLoadingSummary || sliceLoadingSummary : false

  return (
    <div className="border-b border-outline-variant">
      <div className="relative px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers..."
            className="h-10 w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-10 text-sm text-on-body placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <button
            onClick={() => setScannerOpen(true)}
            className={cn(
              'absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-lg transition-colors',
              scannerOpen
                ? 'bg-primary/15 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
            )}
            title="Scan loyalty card"
          >
            <QrCode className="h-4 w-4" />
          </button>
        </div>

        <QRScannerPopover
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          variant="popover"
        />

        {!selectedCustomer && <QuickCustomerRegister className="border-b-0" />}

        {!selectedCustomer ? (
          <div className="space-y-0.5 pb-1">
            <p className="text-xs text-on-surface-variant">Search for a customer</p>
            <p className="text-[10px] text-on-surface-variant/60">Find by name, email, or phone number</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-3 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-sm font-headline font-bold text-on-surface">
                {selectedCustomer.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="min-w-0 truncate font-headline font-bold text-sm text-on-surface">{selectedCustomer.name}</p>
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
                {selectedCustomer.email && <p className="truncate text-[11px] text-on-surface-variant">{selectedCustomer.email}</p>}
                {selectedCustomer.phone && <p className="truncate text-[11px] text-on-surface-variant">{selectedCustomer.phone}</p>}
              </div>
              <button
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? 'Collapse customer details' : 'Expand customer details'}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200',
                  expanded
                    ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(204,255,0,0.12),0_0_18px_rgba(204,255,0,0.18)] hover:bg-primary/20'
                    : 'border-outline-variant/70 bg-surface-container/70 text-on-surface-variant hover:border-primary/30 hover:bg-surface-container-high hover:text-on-surface',
                )}
                title={expanded ? 'Collapse customer details' : 'Expand customer details'}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={handleClear}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                title="Remove customer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-primary" />
                  <span className="font-label font-bold">{selectedCustomer.loyalty?.points || 0} Points</span>
                </div>
                <span className="text-outline-variant">·</span>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-secondary" />
                  <span>{selectedCustomer.total_visits} visits</span>
                </div>
              </div>

              <SendWhatsAppButton
                applePassUrl={passId ? `/api/wallet/apple/${passId}/download` : undefined}
                googleSaveUrl={googleSaveUrl}
                customerPhone={selectedCustomer.phone ?? undefined}
                className="w-full"
                loading={googleLoading}
              />

            <div
              className={cn(
                'grid transition-[grid-template-rows,opacity,transform,margin-top] duration-300 ease-in-out',
                expanded ? 'mt-0 opacity-100 grid-rows-[1fr]' : '-mt-1 opacity-0 grid-rows-[0fr] pointer-events-none',
              )}
              aria-hidden={!expanded}
            >
              <div className="overflow-hidden">
                <div className="space-y-2 pt-1">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                    <Star className="mx-auto mb-1 h-4 w-4 text-primary" />
                    <p className="text-sm font-bold text-on-surface">{selectedCustomer.loyalty?.points || 0}</p>
                    <p className="text-[10px] text-on-surface-variant">Points</p>
                  </div>
                  <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                    <ShoppingBag className="mx-auto mb-1 h-4 w-4 text-secondary" />
                    <p className="text-sm font-bold text-on-surface">${Number(selectedCustomer.total_spent || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-on-surface-variant">Total Spent</p>
                  </div>
                  <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                    <Tag className="mx-auto mb-1 h-4 w-4 text-tertiary" />
                    <p className="text-sm font-bold text-on-surface">{selectedCustomer.total_visits}</p>
                    <p className="text-[10px] text-on-surface-variant">Visits</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {(summary?.lastVisit || selectedCustomer.last_contacted_at) && (
                    <div className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container/40 px-3 py-2">
                      <Clock className="h-4 w-4 text-on-surface-variant" />
                      <span className="text-xs text-on-surface-variant">
                        Last visit: <span className="font-bold text-on-surface">{formatDate(summary?.lastVisit || selectedCustomer.last_contacted_at)}</span>
                      </span>
                    </div>
                  )}

                  {summary && summary.upcomingBirthday !== null && (
                    <div className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container/40 px-3 py-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-xs text-on-surface-variant">
                        Birthday in <span className="font-bold text-primary">{summary.upcomingBirthday} days</span>
                      </span>
                    </div>
                  )}
                </div>

                {selectedCustomer.tags?.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      <Tag className="h-3 w-3" /> Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCustomer.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-outline-variant/50 bg-surface-container-high px-2.5 py-0.5 text-[10px] text-on-surface-variant">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(selectedCustomer.preferences || {}).length > 0 && (
                  <div className="space-y-1">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Preferences</p>
                    {Object.entries(selectedCustomer.preferences).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between rounded-lg bg-surface-container/40 px-3 py-1.5 text-xs">
                        <span className="capitalize text-on-surface-variant">{key.replace(/_/g, ' ')}</span>
                        <span className="font-bold text-on-surface">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {summary?.recentOrders && summary.recentOrders.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Recent Orders</p>
                    <div className="space-y-1.5">
                      {summary.recentOrders.map((order: any) => (
                        <div key={order.id} className="rounded-lg bg-surface-container/40 px-3 py-2 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <ShoppingBag className="h-3 w-3 text-on-surface-variant" />
                              <span className="text-on-surface-variant">#{String(order.order_number ?? '').slice(-6) || order.id.slice(0, 6)}</span>
                            </div>
                            <span className="font-bold text-on-surface">${Number(order.total || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(order.items || []).map((item: any, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                                {item.product_name || 'Product'}
                                {item.quantity > 1 && <span className="text-primary/50">x{item.quantity}</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summaryLoading && (
                  <div className="flex items-center justify-center py-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        )}

        {searchQuery && !selectedCustomer && (
          <div className="space-y-0.5 pb-1">
            {filtered.length > 0 ? (
              <div className="max-h-44 overflow-y-auto space-y-0.5 rounded-xl border border-outline-variant/50 bg-surface-container/40 p-1">
                      {filtered.map((c: CustomerWithLoyalty) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      dispatch(setSelectedCustomer(c))
                      dispatch(setCustomer({ id: c.id, name: c.name, tier: c.loyalty?.tier }))
                      setSearchQuery('')
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-highest text-[10px] font-bold text-on-surface">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-bold">{c.name}</p>
                      <p className="truncate text-[10px] text-on-surface-variant">{c.email || c.phone || 'No contact info'}</p>
                    </div>
                    {c.loyalty?.points ? <span className="shrink-0 text-[10px] font-bold text-primary">{c.loyalty.points} pts</span> : null}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-outline-variant/50 bg-surface-container/30 px-3 py-2 text-xs text-on-surface-variant">No customers found</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
