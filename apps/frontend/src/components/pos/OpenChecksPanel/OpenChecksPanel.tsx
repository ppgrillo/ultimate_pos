'use client'

import { useMemo } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { setOrderType, setTable } from '@/store/slices/cartSlice'
import { setActiveView } from '@/store/slices/posSlice'
import { useGetChecksQuery } from '@/store/api'
import { formatCurrency } from '@/lib/utils'
import { Table2, ReceiptText, Wallet, Clock3, ChefHat, ChevronDown, Eye, UtensilsCrossed, LayoutPanelTop } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Check } from '@ultimate-pos/shared'
import { useState } from 'react'

interface OpenChecksPanelProps {
  onCloseAndPay?: (check: Check & { total?: number; has_active_kitchen?: boolean }) => void
  showCloseAction?: boolean
  variant?: 'compact' | 'workspace'
  enableWorkspaceShortcut?: boolean
}

export function OpenChecksPanel({
  onCloseAndPay,
  showCloseAction = true,
  variant = 'compact',
  enableWorkspaceShortcut = true,
}: OpenChecksPanelProps) {
  const dispatch = useAppDispatch()
  const { data: checks = [], isFetching, refetch } = useGetChecksQuery({ status: 'open' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [panelCollapsed, setPanelCollapsed] = useState(variant === 'compact')
  const isCompact = variant === 'compact'

  const ordered = useMemo(
    () => [...checks].sort((a, b) => Number(a.table_number) - Number(b.table_number)),
    [checks],
  )

  return (
    <div className={cn(
      variant === 'compact'
        ? 'w-full'
        : 'rounded-2xl border border-outline-variant/60 bg-surface-container/40 p-4',
      variant === 'workspace' && 'bg-gradient-to-br from-surface-container/60 via-surface-container/40 to-surface-container-high/30',
    )}>
      <div className={cn('mb-3 flex items-center justify-between', variant === 'compact' && 'border-b border-outline-variant/40 pb-2')}>
        <h3 className="flex items-center gap-2 text-sm font-headline font-bold text-on-surface">
          <ReceiptText className="h-4 w-4 text-primary" />
          {variant === 'workspace' ? 'Tables Workspace' : 'Open Tables'}
        </h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-label font-bold uppercase tracking-wider text-primary">
            {ordered.length} open
          </span>
          <button
            onClick={() => refetch()}
            className="text-xs font-label font-bold text-on-surface-variant hover:text-on-surface"
          >
            Refresh
          </button>
          {isCompact && ordered.length > 0 && (
            <button
              onClick={() => setPanelCollapsed((prev) => !prev)}
              aria-label={panelCollapsed ? 'Expand open tables' : 'Collapse open tables'}
              title={panelCollapsed ? 'Expand open tables' : 'Collapse open tables'}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-outline-variant/60 bg-surface-container/50 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !panelCollapsed && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>

      {variant === 'compact' && enableWorkspaceShortcut && (
        <button
          onClick={() => dispatch(setActiveView('tables'))}
          className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/20 px-3 py-2.5 text-sm font-label font-bold text-primary shadow-[0_0_0_1px_rgba(204,255,0,0.15)] hover:bg-primary/30"
        >
          <LayoutPanelTop className="h-4 w-4" />
          Open Workspace
        </button>
      )}

      {isFetching ? (
        <p className="text-xs text-on-surface-variant">Loading open checks…</p>
      ) : ordered.length === 0 ? (
        <p className="text-xs text-on-surface-variant">No open tables right now.</p>
      ) : variant === 'compact' && panelCollapsed ? (
        <div className="h-0" aria-hidden="true" />
      ) : (
        <div className="space-y-2">
          {ordered.map((check) => {
            const isExpanded = expandedId === check.id

            return (
              <div
                key={check.id}
                className={cn(
                  'transition-all',
                  isCompact
                    ? 'border-b border-outline-variant/40 py-2 last:border-b-0'
                    : 'rounded-xl border border-outline-variant/50 bg-surface-container/60 p-3',
                  isExpanded && (isCompact ? 'bg-surface-container-high/30' : 'border-primary/40 bg-surface-container-high/40'),
                )}
              >
              <button
                onClick={() => setExpandedId((prev) => (prev === check.id ? null : check.id))}
                className={cn('flex w-full items-center justify-between gap-2 text-left', !isCompact && 'mb-2')}
              >
                <div className="flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-label font-bold text-on-surface">Table {check.table_number}</span>
                  {(!isCompact || isExpanded) && (
                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-label font-bold text-on-surface-variant">
                      #{check.id.slice(0, 6)}
                    </span>
                  )}
                  {isCompact && check.has_active_kitchen && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-label font-bold uppercase tracking-wide text-amber-300">
                      Kitchen
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-headline font-bold text-on-surface">{formatCurrency(Number(check.total || 0))}</span>
                  <ChevronDown className={cn('h-4 w-4 text-on-surface-variant transition-transform', isExpanded && 'rotate-180')} />
                </div>
              </button>

              {(!isCompact || isExpanded) && (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>Opened {new Date(check.opened_at).toLocaleTimeString()}</span>
                  {check.has_active_kitchen && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-label font-bold text-amber-300">
                      <ChefHat className="h-3 w-3" />
                      Kitchen active
                    </span>
                  )}
                </div>
              )}

              {isExpanded && (
                <div className="mb-3 grid grid-cols-1 gap-2 rounded-lg border border-outline-variant/50 bg-surface/30 p-2.5 text-[11px] text-on-surface-variant sm:grid-cols-2">
                  <div className="flex items-center gap-1.5">
                    <UtensilsCrossed className="h-3.5 w-3.5" />
                    <span>Status: {check.has_active_kitchen ? 'In Kitchen' : 'Ready to close'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{variant === 'workspace' ? 'Tap Use Table to add items quickly' : 'Use table for next round'}</span>
                  </div>
                </div>
              )}

              {(!isCompact || isExpanded) && (
                <div className={cn('grid gap-2', variant === 'workspace' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2')}>
                  <button
                    onClick={() => {
                      dispatch(setOrderType('dine-in'))
                      dispatch(setTable(Number(check.table_number)))
                    }}
                    className="rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container-high"
                  >
                    Use Table
                  </button>
                  {variant === 'workspace' && (
                    <button
                      onClick={() => setExpandedId((prev) => (prev === check.id ? null : check.id))}
                      className="rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container-high"
                    >
                      {isExpanded ? 'Hide Detail' : 'View Detail'}
                    </button>
                  )}
                  {showCloseAction ? (
                    <button
                      onClick={() => onCloseAndPay?.(check)}
                      disabled={check.has_active_kitchen}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-label font-bold text-primary-on hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      {check.has_active_kitchen ? 'Finish Kitchen First' : 'Close & Pay'}
                    </button>
                  ) : (
                    <div className="inline-flex items-center justify-center gap-1 rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-xs font-label font-bold text-on-surface-variant">
                      <Wallet className="h-3.5 w-3.5" />
                      Payment at POS
                    </div>
                  )}
                </div>
              )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
