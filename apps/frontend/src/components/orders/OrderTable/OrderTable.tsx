'use client'

import { Banknote, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import type { Order } from '@ultimate-pos/shared'

const paymentMethodStyles: Record<string, string> = {
  cash: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  card: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  transfer: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  wallet: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
}

interface OrderTableProps {
  orders: Order[]
  onTap: (order: Order) => void
  sortKey: SortKey
  sortDirection: SortDirection
  onSort: (sortKey: SortKey) => void
}

type SortKey = 'status' | 'created' | 'number' | 'total'
type SortDirection = 'asc' | 'desc'

function formatOrderCreatedAt(value: string) {
  const date = new Date(value)
  return {
    day: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  }
}

function getOrderLabel(order: Order) {
  return order.order_number ? `#${order.order_number}` : `#${order.id.slice(-6).toUpperCase()}`
}

function SortableHead({
  label,
  sortKey,
  activeSort,
  direction,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  activeSort: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const isActive = activeSort === sortKey
  return (
    <TableHead className={cn('h-9 px-3', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider transition-colors',
          align === 'right' ? 'ml-auto' : '',
          isActive ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
        )}
      >
        <span>{label}</span>
        {isActive ? (
          <span className="text-[10px]">{direction === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <span className="text-[10px] opacity-60">↕</span>
        )}
      </button>
    </TableHead>
  )
}

export function OrderTable({ orders, onTap, sortKey, sortDirection, onSort }: OrderTableProps) {
  if (orders.length === 0) return null

  return (
    <>
      {/* Mobile card list */}
      <div className="lg:hidden space-y-2">
        {orders.map((order) => {
          const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0
          const payment = order.payments?.[0]
          const created = formatOrderCreatedAt(order.created_at)
          return (
            <div
              key={order.id}
              onClick={() => onTap(order)}
              className="flex items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface-container/50 px-3 py-2.5 cursor-pointer hover:bg-surface-container-high/50 transition-colors"
            >
              <OrderStatusBadge status={order.status} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-label font-semibold text-sm text-on-surface">
                    {getOrderLabel(order)}
                  </span>
                  {order.table_number && (
                    <span className="text-xs text-on-surface-variant">T{order.table_number}</span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant truncate">
                  {order.items?.slice(0, 2).map(i => i.product_name).filter(Boolean).join(', ')}
                  {(order.items?.length || 0) > 2 && ` +${order.items!.length - 2}`}
                  <span className="ml-1 text-on-surface-variant/60">· {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                </p>
                <p className="text-[11px] text-on-surface-variant/65 mt-0.5">{created.day} at {created.time}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-label font-bold text-sm text-on-surface block">{formatCurrency(order.total)}</span>
                {payment && (
                  <span className={cn(
                    'inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-label font-bold capitalize mt-0.5',
                    paymentMethodStyles[payment.method] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
                  )}>
                    {payment.method}
                  </span>
                )}
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/40 shrink-0" />
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Status" sortKey="status" activeSort={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHead label="Created" sortKey="created" activeSort={sortKey} direction={sortDirection} onSort={onSort} />
              <SortableHead label="#" sortKey="number" activeSort={sortKey} direction={sortDirection} onSort={onSort} />
              <TableHead className="h-9 px-3">Items</TableHead>
              <TableHead className="h-9 px-3">Payment</TableHead>
              <SortableHead label="Total" sortKey="total" activeSort={sortKey} direction={sortDirection} onSort={onSort} align="right" />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0
              const payment = order.payments?.[0]
              const created = formatOrderCreatedAt(order.created_at)
              return (
                <TableRow
                  key={order.id}
                  onClick={() => onTap(order)}
                  className="cursor-pointer"
                >
                  <TableCell className="p-2 py-2.5 px-3">
                    <OrderStatusBadge status={order.status} size="sm" />
                  </TableCell>
                  <TableCell className="p-2 py-2.5 px-3">
                    <div className="leading-tight">
                      <p className="text-sm text-on-surface tabular-nums">{created.day}</p>
                      <p className="text-[11px] text-on-surface-variant/70 tabular-nums">{created.time}</p>
                    </div>
                  </TableCell>
                  <TableCell className="p-2 py-2.5 px-3">
                    <span className="font-label font-semibold text-sm text-on-surface">
                      {getOrderLabel(order)}
                    </span>
                    {order.table_number && (
                      <span className="ml-1.5 text-xs text-on-surface-variant">
                        T{order.table_number}
                      </span>
                    )}
                    <p className="text-[11px] text-on-surface-variant/65 mt-0.5">
                      Ref {order.id.slice(-6).toUpperCase()}
                    </p>
                  </TableCell>
                  <TableCell className="p-2 py-2.5 px-3">
                    <p className="text-sm font-label text-on-surface truncate max-w-[200px]">
                      {order.items?.slice(0, 2).map(i => i.product_name).filter(Boolean).join(', ')}
                      {(order.items?.length || 0) > 2 && (
                        <span className="text-on-surface-variant text-xs"> +{order.items!.length - 2}</span>
                      )}
                    </p>
                    <span className="text-[11px] text-on-surface-variant/70">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                  </TableCell>
                  <TableCell className="p-2 py-2.5 px-3">
                    {payment ? (
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-label font-bold capitalize',
                        paymentMethodStyles[payment.method] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
                      )}>
                        <Banknote className="h-3 w-3" />
                        {payment.method}
                      </span>
                    ) : (
                      <span className="text-[11px] text-on-surface-variant/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="p-2 py-2.5 px-3 text-right tabular-nums">
                    <span className="font-label font-bold text-sm text-on-surface">
                      {formatCurrency(order.total)}
                    </span>
                  </TableCell>
                  <TableCell className="p-2 py-2.5 pr-3 w-10">
                    <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant/40" />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
