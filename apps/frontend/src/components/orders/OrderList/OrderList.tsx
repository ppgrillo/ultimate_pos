'use client'

import { OrderCard } from '@/components/orders/OrderCard'
import { OrderTable } from '@/components/orders/OrderTable'
import { ShoppingBag, AlertCircle } from 'lucide-react'
import type { Order, OrderStatus } from '@ultimate-pos/shared'

interface OrderListProps {
  orders: Order[]
  hasKitchen: boolean
  loading?: boolean
  statusLoading?: Record<string, boolean>
  onStatusChange: (id: string, status: OrderStatus) => void
  onTap: (order: Order) => void
}

export function OrderList({ orders, hasKitchen, loading, statusLoading, onStatusChange, onTap }: OrderListProps) {
  if (loading) {
    return (
      <div className={hasKitchen ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2'}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`animate-pulse rounded-2xl bg-surface-container/30 border border-outline-variant/30 ${hasKitchen ? 'h-72' : 'h-14'}`}
          />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container/50 border border-outline-variant/40 mb-4">
          {hasKitchen ? (
            <AlertCircle className="h-7 w-7 text-on-surface-variant/60" />
          ) : (
            <ShoppingBag className="h-7 w-7 text-on-surface-variant/60" />
          )}
        </div>
        <p className="font-label font-bold text-sm text-on-surface-variant mb-1">No orders yet</p>
        <p className="text-xs text-on-surface-variant/60">
          {hasKitchen ? 'New orders will appear here in real time.' : 'Completed orders will be listed here.'}
        </p>
      </div>
    )
  }

  if (hasKitchen) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            hasKitchen
            onStatusChange={onStatusChange}
            onTap={onTap}
            statusLoading={!!statusLoading?.[order.id]}
          />
        ))}
      </div>
    )
  }

  return (
    <OrderTable orders={orders} onTap={onTap} />
  )
}
