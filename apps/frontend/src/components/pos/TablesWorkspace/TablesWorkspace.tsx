'use client'

import { useMemo, useState } from 'react'
import { ChefHat, ChevronDown, Clock3, Table2, Wallet, X } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveView } from '@/store/slices/posSlice'
import { setOrderType, setTable } from '@/store/slices/cartSlice'
import { useCloseCheckMutation, useGetCheckByIdQuery, useGetChecksQuery, useVoidCheckMutation } from '@/store/api'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { getActiveCardProvider, cardProviderShortName } from '@/lib/card-payments'
import { SecureActionDialog } from '@/components/ui/SecureActionDialog'
import type { Check, KitchenWorkflowConfig, PaymentMethod } from '@ultimate-pos/shared'
import { getKitchenStatusLabel } from '@ultimate-pos/shared'

interface TablesWorkspaceProps {
  onCloseAndPay?: (check: Check & { total?: number; has_active_kitchen?: boolean }) => void
  isAdmin?: boolean
}

type OpenCheck = Check & { total?: number; has_active_kitchen?: boolean }

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready to Serve',
  served: 'Mark Served',
  paid: 'Paid',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const statusTone: Record<string, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  preparing: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  ready: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  served: 'border-lime-500/30 bg-lime-500/10 text-lime-300',
  paid: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  cancelled: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  refunded: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
}

function TableCheckRow({
  check,
  expanded,
  onToggle,
  onUseTable,
  onCloseAndPay,
  onVoid,
  workflow,
  isAdmin,
}: {
  check: OpenCheck
  expanded: boolean
  onToggle: () => void
  onUseTable: () => void
  onCloseAndPay: () => void
  onVoid: () => void
  workflow: KitchenWorkflowConfig | null
  isAdmin?: boolean
}) {
  const { data: detail, isFetching } = useGetCheckByIdQuery(check.id, { skip: !expanded })

  const rounds = useMemo(() => {
    const grouped = new Map<number, NonNullable<typeof detail>['orders']>()
    for (const order of detail?.orders || []) {
      const key = Number(order.round_number || 1)
      grouped.set(key, [...(grouped.get(key) || []), order])
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0])
  }, [detail])

  return (
    <article className={cn(
      'rounded-2xl border border-outline-variant/60 bg-surface-container/60 p-4 transition-all duration-200',
      expanded && 'border-primary/45 bg-surface-container-high/35 shadow-[0_0_0_1px_rgba(204,255,0,0.18)]',
    )}>
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Table2 className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-label font-bold text-on-surface">Table {check.table_number}</p>
            <p className="truncate text-[11px] text-on-surface-variant">Check #{check.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-headline font-bold text-on-surface">{formatCurrency(Number(check.total || 0))}</span>
          <ChevronDown className={cn('h-4 w-4 text-on-surface-variant transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          Opened {new Date(check.opened_at).toLocaleTimeString()}
        </span>
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider',
          check.has_active_kitchen
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        )}>
          <ChefHat className="h-3 w-3" />
          {check.has_active_kitchen ? 'Kitchen Active' : 'Ready to Close'}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 rounded-xl border border-outline-variant/50 bg-surface/25 p-3">
          {isFetching ? (
            <p className="text-xs text-on-surface-variant">Loading check detail…</p>
          ) : rounds.length === 0 ? (
            <p className="text-xs text-on-surface-variant">No ticket rounds yet.</p>
          ) : (
            rounds.map(([roundNumber, orders]) => (
              <div key={roundNumber} className="rounded-lg border border-outline-variant/40 bg-surface-container/35 p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
                    Round {roundNumber}
                  </span>
                </div>
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-md border border-outline-variant/30 bg-surface/40 p-2">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider',
                          statusTone[order.status] || 'border-outline-variant/50 bg-surface-container text-on-surface-variant',
                        )}>
                          {['pending', 'preparing', 'ready', 'served', 'paid'].includes(order.status)
                            ? getKitchenStatusLabel(order.status as 'pending' | 'preparing' | 'ready' | 'served' | 'paid', workflow)
                            : (statusLabel[order.status] || order.status)}
                        </span>
                        <span className="text-[11px] font-label font-bold text-on-surface-variant">
                          {formatCurrency(Number(order.total || 0))}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                            <span className="text-on-surface">
                              <span className="font-label font-bold">{item.quantity}x</span> {item.product_name}
                            </span>
                            <span className="text-on-surface-variant">{formatCurrency(Number(item.unit_price || 0) * Number(item.quantity || 0))}</span>
                          </div>
                        ))}
                        {order.notes && (
                          <p className="text-[11px] text-on-surface-variant">Note: {order.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={onUseTable}
          className="rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container-high"
        >
          Use Table
        </button>
        {isAdmin && (
          <button
            onClick={onVoid}
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-label font-bold text-rose-300 hover:bg-rose-500/20"
          >
            Cancel Check
          </button>
        )}
        <button
          onClick={onToggle}
          className="rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container-high"
        >
          {expanded ? 'Hide Detail' : 'View Detail'}
        </button>
        <button
          onClick={onCloseAndPay}
          disabled={check.has_active_kitchen}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-label font-bold text-primary-on hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Wallet className="h-3.5 w-3.5" />
          {check.has_active_kitchen ? 'Finish Kitchen First' : 'Close & Pay'}
        </button>
      </div>
    </article>
  )
}

export function TablesWorkspace({ onCloseAndPay, isAdmin }: TablesWorkspaceProps) {
  const dispatch = useAppDispatch()
  const userRole = useAppSelector((s) => s.auth.user?.role)
  const effectiveAdmin = isAdmin ?? (userRole === 'admin')
  const settings = useAppSelector((s) => s.storeConfig.currentStore?.settings)
  const promoPin = (settings?.promoPin as string | undefined) || null
  const workflow = settings?.kitchenWorkflow ?? null
  const { data: checks = [], isFetching, refetch } = useGetChecksQuery({ status: 'open' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [closeCheckError, setCloseCheckError] = useState<string | null>(null)
  const [localCheckToClose, setLocalCheckToClose] = useState<OpenCheck | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [closeCheck, { isLoading: closingCheck }] = useCloseCheckMutation()
  const [checkToVoid, setCheckToVoid] = useState<OpenCheck | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [showVoidReason, setShowVoidReason] = useState(false)
  const [showVoidPin, setShowVoidPin] = useState(false)
  const [voidCheck, { isLoading: voiding }] = useVoidCheckMutation()
  const [voidError, setVoidError] = useState<string | null>(null)

  const ordered = useMemo(
    () => [...checks].sort((a, b) => Number(a.table_number) - Number(b.table_number)),
    [checks],
  )

  const totals = useMemo(() => {
    const openTotal = ordered.reduce((sum, c) => sum + Number(c.total || 0), 0)
    const kitchenActive = ordered.filter((c) => c.has_active_kitchen).length
    return { openTotal, kitchenActive }
  }, [ordered])

  const handleUseTable = (tableNumber: number) => {
    dispatch(setOrderType('dine-in'))
    dispatch(setTable(tableNumber))
    dispatch(setActiveView('menu'))
  }

  const handleStartVoid = (check: OpenCheck) => {
    setCheckToVoid(check)
    setVoidReason('')
    setShowVoidReason(true)
  }

  const handleVoidConfirm = async () => {
    if (!checkToVoid) return
    try {
      setVoidError(null)
      await voidCheck({ checkId: checkToVoid.id, reason: voidReason }).unwrap()
      setCheckToVoid(null)
      setVoidReason('')
      setShowVoidReason(false)
      setShowVoidPin(false)
    } catch (err) {
      const message = err && typeof err === 'object' && 'data' in err
        ? ((err as { data?: { error?: string } }).data?.error || 'Could not void check')
        : 'Could not void check'
      setVoidError(message)
    }
  }

  const handleLocalCloseConfirm = async (method: PaymentMethod, cashGiven?: number) => {
    if (!localCheckToClose) return
    try {
      setCloseCheckError(null)
      await closeCheck({
        checkId: localCheckToClose.id,
        payment_method: method,
        cash_amount_given: method === 'cash' ? cashGiven : undefined,
      }).unwrap()
      setLocalCheckToClose(null)
      setShowPaymentModal(false)
    } catch (err) {
      const message = err && typeof err === 'object' && 'data' in err
        ? ((err as { data?: { error?: string } }).data?.error || 'Could not close check')
        : 'Could not close check'
      setCloseCheckError(message)
    }
  }

  return (
    <section className="h-full overflow-y-auto p-3 lg:p-4">
      <div className="mx-auto w-full max-w-6xl space-y-3">
        <div className="rounded-2xl border border-outline-variant/60 bg-gradient-to-br from-surface-container-high/45 via-surface-container/40 to-surface-container/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-headline font-bold text-on-surface">Tables Workspace</h2>
              <p className="mt-1 text-xs text-on-surface-variant">Manage active tables, rounds, and close checks with fewer clicks.</p>
            </div>
            <button
              onClick={() => refetch()}
              className="rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container-high"
            >
              Refresh
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-outline-variant/40 bg-surface/25 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Open tables</p>
              <p className="text-base font-headline font-bold text-on-surface">{ordered.length}</p>
            </div>
            <div className="rounded-xl border border-outline-variant/40 bg-surface/25 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Kitchen active</p>
              <p className="text-base font-headline font-bold text-on-surface">{totals.kitchenActive}</p>
            </div>
            <div className="rounded-xl border border-outline-variant/40 bg-surface/25 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Ready to close</p>
              <p className="text-base font-headline font-bold text-on-surface">{ordered.length - totals.kitchenActive}</p>
            </div>
            <div className="rounded-xl border border-outline-variant/40 bg-surface/25 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Open value</p>
              <p className="text-base font-headline font-bold text-on-surface">{formatCurrency(totals.openTotal)}</p>
            </div>
          </div>
        </div>

        {closeCheckError && (
          <p className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs font-label font-bold text-error">
            {closeCheckError}
          </p>
        )}

        {isFetching ? (
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container/40 p-4 text-sm text-on-surface-variant">
            Loading active tables…
          </div>
        ) : ordered.length === 0 ? (
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container/40 p-4 text-sm text-on-surface-variant">
            No open tables right now.
          </div>
        ) : (
          <div className="space-y-2">
            {ordered.map((check) => (
              <TableCheckRow
                key={check.id}
                check={check}
                expanded={expandedId === check.id}
                onToggle={() => setExpandedId((prev) => (prev === check.id ? null : check.id))}
                onUseTable={() => handleUseTable(Number(check.table_number))}
                onCloseAndPay={() => {
                  if (onCloseAndPay) {
                    onCloseAndPay(check)
                    return
                  }
                  setLocalCheckToClose(check)
                  setShowPaymentModal(true)
                }}
                onVoid={() => handleStartVoid(check)}
                workflow={workflow}
                isAdmin={effectiveAdmin}
              />
            ))}
          </div>
        )}
      </div>

      {!onCloseAndPay && (
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={(open) => {
            setShowPaymentModal(open)
            if (!open && localCheckToClose) setLocalCheckToClose(null)
          }}
          total={Number(localCheckToClose?.total || 0)}
          onConfirm={handleLocalCloseConfirm}
          acceptedMethods={settings?.acceptedPaymentMethods ?? ['cash', 'card', 'transfer']}
          mpPointEnabled={settings?.mpPointEnabled ?? false}
          cardProviderLabel={cardProviderShortName(getActiveCardProvider(settings))}
          isLoading={closingCheck}
        />
      )}

      {showVoidReason && checkToVoid && !showVoidPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-container p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-on-surface">
                Cancel Table {checkToVoid.table_number}
              </h3>
              <button
                onClick={() => { setShowVoidReason(false); setCheckToVoid(null) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-on-surface-variant">
              This will void all orders for this table. Enter a reason for the cancellation:
            </p>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Reason for cancellation…"
              rows={3}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowVoidReason(false); setCheckToVoid(null) }}
                className="flex-1 rounded-xl border border-outline-variant/60 py-2.5 text-sm font-label font-bold text-on-surface hover:bg-surface-container-high transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (!voidReason.trim()) return
                  setShowVoidPin(true)
                }}
                disabled={!voidReason.trim()}
                className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-label font-bold text-white hover:bg-rose-600 disabled:opacity-40 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {voidError && (
        <p className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs font-label font-bold text-error mb-2">
          {voidError}
        </p>
      )}

      <SecureActionDialog
        open={showVoidPin}
        onOpenChange={(open) => {
          setShowVoidPin(open)
          if (!open) { setVoidError(null); setCheckToVoid(null); setVoidReason(''); setShowVoidReason(false) }
        }}
        onConfirm={handleVoidConfirm}
        title={`Cancel Table ${checkToVoid?.table_number ?? ''}`}
        description={`This will permanently void all orders for Table ${checkToVoid?.table_number ?? ''}. Reason: ${voidReason}`}
        confirmLabel="Cancel Check"
        isLoading={voiding}
        requiredPin={promoPin}
        pinLabel="Admin PIN"
      />
    </section>
  )
}
