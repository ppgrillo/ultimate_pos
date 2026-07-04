'use client'

import { OrderCard } from '@/components/orders/OrderCard'
import { OrderTable } from '@/components/orders/OrderTable'
import { Skeleton } from '@/components/ui/Skeleton'
import { ShoppingBag, AlertCircle, RefreshCw } from 'lucide-react'
import type { Order, OrderStatus } from '@ultimate-pos/shared'

interface OrderListProps {
  orders: Order[]
  hasKitchen: boolean
  loading?: boolean
  error?: boolean
  statusLoading?: Record<string, boolean>
  onStatusChange: (id: string, status: OrderStatus) => void
  onTap: (order: Order) => void
  onRetry?: () => void
}

export function OrderList({ orders, hasKitchen, loading, error, statusLoading, onStatusChange, onTap, onRetry }: OrderListProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10 border border-error/25 mb-4">
          <AlertCircle className="h-7 w-7 text-error" />
        </div>
        <p className="font-label font-bold text-sm text-on-surface mb-1">Failed to load orders</p>
        <p className="text-xs text-on-surface-variant/60 mb-4">Connection error. Please try again.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-primary/20 text-primary border border-primary/30 px-4 py-2 text-sm font-label font-bold hover:bg-primary/30 transition-all duration-150 active:scale-[0.97]"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={hasKitchen ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-2'}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className={hasKitchen ? 'space-y-3 rounded-2xl border border-outline-variant/30 p-4' : ''}>
            {hasKitchen ? (
              <>
                <div className="flex items-center justify-between">
                  <Skeleton variant="text" className="w-24 h-5" />
                  <Skeleton variant="text" className="w-16 h-5" />
                </div>
                <Skeleton variant="text" className="w-32 h-4" />
                <Skeleton variant="text" className="w-20 h-7" />
                <div className="space-y-2 pt-2 border-t border-outline-variant/20">
                  <Skeleton variant="text" className="w-full h-5" />
                  <Skeleton variant="text" className="w-3/4 h-5" />
                  <Skeleton variant="text" className="w-1/2 h-5" />
                </div>
                <div className="flex justify-between pt-1">
                  <Skeleton variant="text" className="w-16 h-4" />
                  <Skeleton variant="text" className="w-20 h-6" />
                </div>
                <Skeleton className="w-full h-10 rounded-xl mt-2" />
              </>
            ) : (
              <Skeleton variant="text" className="w-full h-14 rounded-xl" />
            )}
          </div>
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
