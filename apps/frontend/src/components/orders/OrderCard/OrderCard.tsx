'use client'

import { useState, useEffect } from 'react'
import { Clock, User, Table2, ShoppingBag, Banknote, AlertTriangle, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import { KitchenOrderActions } from '@/components/orders/KitchenOrderActions'
import type { Order, OrderStatus } from '@ultimate-pos/shared'

const typeConfig: Record<string, { label: string; classes: string }> = {
  'dine-in':  { label: 'DINE-IN',  classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  'takeaway': { label: 'TAKEOUT',  classes: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
  'delivery': { label: 'DELIVERY', classes: 'bg-sky-500/15 text-sky-400 border-sky-500/25' },
}

function ElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(createdAt).getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 1) { setElapsed('now'); return }
      const hrs = Math.floor(mins / 60)
      setElapsed(hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`)
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [createdAt])

  return <span>{elapsed}</span>
}

interface OrderCardProps {
  order: Order
  hasKitchen: boolean
  onStatusChange: (id: string, status: OrderStatus) => void
  onTap: (order: Order) => void
  statusLoading?: boolean
}

export function OrderCard({ order, hasKitchen, onStatusChange, onTap, statusLoading }: OrderCardProps) {
  const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0

  if (hasKitchen) {
    const typeStyle = typeConfig[order.type] || typeConfig['dine-in']
    const orderLabel = order.order_number ? `#${order.order_number}` : `#${order.id.slice(-6).toUpperCase()}`

    return (
      <div className="rounded-2xl bg-surface-container/50 border border-outline-variant/60 overflow-hidden hover:bg-surface-container/80 transition-all duration-200 cursor-pointer flex flex-col">
        <div onClick={() => onTap(order)} className="flex flex-col gap-2.5 p-4 pb-3">

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-label font-bold tracking-wider',
                typeStyle.classes,
              )}>
                {typeStyle.label}
              </span>
              <span className="font-label font-bold text-sm text-on-surface">{orderLabel}</span>
            </div>
            <OrderStatusBadge status={order.status} size="sm" />
          </div>

          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            {order.table_number && (
              <span className="flex items-center gap-1">
                <Table2 className="h-3.5 w-3.5" /> Table {order.table_number}
              </span>
            )}
            {order.customer_name && (
              <>
                {order.table_number && <span className="text-outline-variant">•</span>}
                <span className="flex items-center gap-1 truncate">
                  <User className="h-3.5 w-3.5 shrink-0" /> {order.customer_name}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="font-label font-bold text-base text-primary">
              <ElapsedTimer createdAt={order.created_at} />
            </span>
            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Time Elapsed</span>
          </div>

          <div className="border-t border-outline-variant/40 pt-2 space-y-1.5">
            {order.items?.slice(0, 6).map((item) => (
              <div key={item.id} className="text-sm">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-label font-bold text-on-surface">{item.quantity}x</span>
                  <span className="font-label font-semibold text-on-surface truncate">{item.product_name}</span>
                </div>
                {item.modifiers && item.modifiers.length > 0 && (
                  <p className="text-[11px] text-on-surface-variant ml-4 truncate">{item.modifiers.join(', ')}</p>
                )}
                {item.notes && (
                  <div className="flex items-center gap-1 ml-1 mt-0.5">
                    <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                    <span className="text-[11px] text-red-400 font-label font-bold">{item.notes}</span>
                  </div>
                )}
              </div>
            ))}
            {(order.items?.length || 0) > 6 && (
              <p className="text-[11px] text-on-surface-variant font-label font-bold">
                +{order.items!.length - 6} more items
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-3 w-3 text-on-surface-variant" />
              <span className="text-xs text-on-surface-variant">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            </div>
            <span className="font-headline font-bold text-base text-on-surface">{formatCurrency(order.total)}</span>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} className="px-4 pb-4">
          <KitchenOrderActions
            status={order.status}
            hasKitchen
            loading={statusLoading}
            variant="block"
            onTransition={(to) => onStatusChange(order.id, to)}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => onTap(order)}
      className="flex items-center gap-4 rounded-xl bg-surface-container/30 border border-outline-variant/40 px-4 py-3.5 hover:bg-surface-container/60 transition-all duration-200 cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <OrderStatusBadge status={order.status} size="sm" />
          {order.order_number && (
            <span className="text-[11px] text-on-surface-variant font-label font-bold">#{order.order_number}</span>
          )}
          {order.table_number && (
            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              <Table2 className="h-3 w-3" /> T{order.table_number}
            </span>
          )}
        </div>
        <p className="text-sm font-label font-bold text-on-surface truncate">
          {order.items?.slice(0, 2).map(i => i.product_name).filter(Boolean).join(', ')}
          {(order.items?.length || 0) > 2 && <span className="text-on-surface-variant font-normal"> +{order.items!.length - 2}</span>}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant">
          <Clock className="h-3 w-3" />
          <ElapsedTimer createdAt={order.created_at} />
          {order.payments?.[0] && (
            <>
              <span>·</span>
              <Banknote className="h-3 w-3" />
              {order.payments[0].method}
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-headline font-bold text-base text-on-surface">{formatCurrency(order.total)}</p>
        <p className="text-[11px] text-on-surface-variant">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-on-surface-variant/50 shrink-0" />
    </div>
  )
}
