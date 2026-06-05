'use client'

import { ShoppingBag } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCartOpen, setCheckoutView } from '@/store/slices/posSlice'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { OrderSummary } from '@/components/pos/OrderSummary'

export function PosCart() {
  const dispatch = useAppDispatch()
  const items = useAppSelector((s) => s.cart.items)
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <ShoppingBag className="h-12 w-12 text-on-surface-variant/30 mb-3" />
        <p className="text-on-surface-variant text-sm">Cart is empty</p>
        <p className="text-on-surface-variant/50 text-xs mt-1">Add products to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-outline-variant">
        <div>
          <h2 className="font-headline font-bold text-lg text-on-surface">Current Order</h2>
          <p className="text-xs text-on-surface-variant">{count} {count === 1 ? 'item' : 'items'}</p>
        </div>
        <button
          onClick={() => dispatch(setCartOpen(false))}
          className="text-xs font-label font-bold text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((item, index) => (
          <CartItemRow
            key={`${item.product_id}-${index}`}
            item={item}
          />
        ))}
      </div>

      <div className="border-t border-outline-variant p-4 space-y-3">
        <OrderSummary
          subtotal={total}
          discount={0}
          discountLabel=""
        />
        <button
          onClick={() => {
            dispatch(setCheckoutView(true))
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-label font-bold text-primary-on hover:bg-primary/90 transition-colors"
        >
          Checkout
        </button>
      </div>
    </div>
  )
}
