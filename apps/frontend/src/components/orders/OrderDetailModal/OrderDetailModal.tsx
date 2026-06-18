'use client'

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalClose,
} from '@/components/ui/Modal'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import { KitchenOrderActions } from '@/components/orders/KitchenOrderActions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Clock, Table2, User, Receipt } from 'lucide-react'
import type { Order, OrderStatus } from '@ultimate-pos/shared'

interface OrderDetailModalProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  hasKitchen: boolean
  onStatusChange: (id: string, status: OrderStatus) => void
  statusLoading?: Record<string, boolean>
}

const statusTimeline: OrderStatus[] = ['pending', 'preparing', 'ready', 'served', 'paid']

export function OrderDetailModal({ order, open, onOpenChange, hasKitchen, onStatusChange, statusLoading }: OrderDetailModalProps) {
  if (!order) return null

  const currentIdx = statusTimeline.indexOf(order.status)

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <div className="flex items-center justify-between">
            <ModalTitle>Order Details</ModalTitle>
            <ModalClose />
          </div>
        </ModalHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <OrderStatusBadge status={order.status} />
            {order.table_number && (
              <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Table2 className="h-3.5 w-3.5" /> Table {order.table_number}
              </span>
            )}
            {order.customer_name && (
              <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <User className="h-3.5 w-3.5" /> {order.customer_name}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Clock className="h-3.5 w-3.5" /> {formatDate(order.created_at)}
            </span>
          </div>

          {hasKitchen && (
            <div className="rounded-xl bg-surface-container/40 border border-outline-variant/40 p-4">
              <h4 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-3">Status Timeline</h4>
              <div className="space-y-2">
                {statusTimeline.map((s, i) => {
                  const isPast = i <= currentIdx
                  const isCurrent = i === currentIdx
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div className={cn(
                        'h-2.5 w-2.5 rounded-full shrink-0',
                        isCurrent ? 'bg-primary ring-2 ring-primary/30' : isPast ? 'bg-primary/60' : 'bg-outline-variant/40',
                      )} />
                      <span className={cn(
                        'text-xs font-label font-bold capitalize',
                        isCurrent ? 'text-primary' : isPast ? 'text-on-surface' : 'text-on-surface-variant/50',
                      )}>
                        {s}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Items
            </h4>
            <div className="rounded-xl border border-outline-variant/40 divide-y divide-outline-variant/20 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-2 bg-surface-container/30 text-[11px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
                <span>Item</span>
                <span className="text-right">Amount</span>
              </div>
              {order.items?.map((item) => (
                <div key={item.id} className="px-4 py-2.5">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div>
                      <p className="text-sm font-label font-bold text-on-surface">{item.product_name || 'Unknown'}</p>
                      {item.modifiers?.length > 0 && (
                        <p className="text-[11px] text-on-surface-variant">{item.modifiers.join(', ')}</p>
                      )}
                      <p className="text-[11px] text-on-surface-variant">x{item.quantity} @ {formatCurrency(item.unit_price)}</p>
                    </div>
                    <p className="text-sm font-label font-bold text-on-surface text-right">{formatCurrency(item.unit_price * item.quantity)}</p>
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-on-surface-variant mt-1 italic">&quot;{item.notes}&quot;</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/40 p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Subtotal</span>
              <span className="font-label font-bold text-on-surface">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Discount</span>
                <span className="font-label font-bold text-error">{formatCurrency(-order.discount)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Tax</span>
                <span className="font-label font-bold text-on-surface">{formatCurrency(order.tax)}</span>
              </div>
            )}
            <div className="border-t border-outline-variant/40 pt-1.5 flex justify-between">
              <span className="font-label font-bold text-on-surface">Total</span>
              <span className="font-headline font-bold text-lg text-primary">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {order.payments && order.payments.length > 0 && (
            <div>
              <h4 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">Payment</h4>
              <div className="rounded-xl bg-surface-container/30 border border-outline-variant/40 p-4 space-y-2">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant capitalize">{p.method}</span>
                    <div className="text-right">
                      <span className="font-label font-bold text-on-surface">{formatCurrency(p.amount)}</span>
                      {p.change_due && p.change_due > 0 && (
                        <p className="text-xs text-on-surface-variant">Change: {formatCurrency(p.change_due)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div onClick={(e) => e.stopPropagation()} className="pt-0">
            <KitchenOrderActions
              status={order.status}
              hasKitchen={hasKitchen}
              loading={!!statusLoading?.[order.id]}
              onTransition={(to) => onStatusChange(order.id, to)}
            />
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}
