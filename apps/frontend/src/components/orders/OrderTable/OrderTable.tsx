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
          <TableHead>Status</TableHead>
          <TableHead>#</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead className="text-right">Total</TableHead>
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
              <TableCell>
                <OrderStatusBadge status={order.status} size="sm" />
              </TableCell>
              <TableCell>
                <span className="font-label font-bold text-sm text-on-surface">
                  #{order.order_number || order.id.slice(-6).toUpperCase()}
                </span>
                {order.table_number && (
                  <span className="ml-2 text-[11px] text-on-surface-variant">
                    T{order.table_number}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <p className="text-sm font-label font-semibold text-on-surface truncate max-w-[200px]">
                  {order.items?.slice(0, 2).map(i => i.product_name).filter(Boolean).join(', ')}
                  {(order.items?.length || 0) > 2 && (
                    <span className="text-on-surface-variant font-normal text-xs"> +{order.items!.length - 2}</span>
                  )}
                </p>
                <span className="text-[11px] text-on-surface-variant">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
              </TableCell>
              <TableCell>
                {payment ? (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-label font-bold capitalize',
                    paymentMethodStyles[payment.method] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
                  )}>
                    <Banknote className="h-3 w-3" />
                    {payment.method}
                  </span>
                ) : (
                  <span className="text-[11px] text-on-surface-variant/50">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <span className="font-headline font-bold text-base text-on-surface">
                  {formatCurrency(order.total)}
                </span>
              </TableCell>
              <TableCell>
                <ChevronRight className="h-4 w-4 text-on-surface-variant/50" />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
