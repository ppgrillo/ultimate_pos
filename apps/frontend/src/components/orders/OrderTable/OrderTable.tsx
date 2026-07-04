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
}

export function OrderTable({ orders, onTap }: OrderTableProps) {
  if (orders.length === 0) return null

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="h-9 px-3">Status</TableHead>
          <TableHead className="h-9 px-3">#</TableHead>
          <TableHead className="h-9 px-3">Items</TableHead>
          <TableHead className="h-9 px-3">Payment</TableHead>
          <TableHead className="h-9 px-3 text-right">Total</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0
          const payment = order.payments?.[0]
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
                <span className="font-label font-semibold text-sm text-on-surface">
                  #{order.order_number || order.id.slice(-6).toUpperCase()}
                </span>
                {order.table_number && (
                  <span className="ml-1.5 text-xs text-on-surface-variant">
                    T{order.table_number}
                  </span>
                )}
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
  )
}
