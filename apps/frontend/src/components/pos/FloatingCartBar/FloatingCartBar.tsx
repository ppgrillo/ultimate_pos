'use client'

import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveView, setCartOpen, setCheckoutView } from '@/store/slices/posSlice'
import { formatCurrency } from '@/lib/utils'

export function FloatingCartBar() {
  const dispatch = useAppDispatch()
  const items = useAppSelector((s) => s.cart.items)
  const discount = useAppSelector((s) => s.cart.discount)
  const promoDiscount = useAppSelector((s) => s.cart.promoDiscount)
  const checkoutView = useAppSelector((s) => s.pos.checkoutView)

  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const actualTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalDiscount = discount + promoDiscount
  const finalTotal = Math.max(0, actualTotal - totalDiscount)

  if (count === 0 || checkoutView) return null

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2 lg:hidden">
      <div className="flex items-center justify-between rounded-xl bg-surface-container-high border border-outline-variant px-4 py-3 shadow-lg backdrop-blur-glass">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag className="h-5 w-5 text-on-surface" />
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-on">
              {count}
            </span>
          </div>
          <div>
            <p className="font-headline font-bold text-sm text-on-surface">
              {formatCurrency(finalTotal)}
            </p>
            {totalDiscount > 0 && (
              <p className="text-[10px] text-secondary font-bold">
                -{formatCurrency(totalDiscount)} saved
              </p>
            )}
            <p className="text-[10px] text-on-surface-variant">
              {count} {count === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            dispatch(setActiveView('cart'))
            dispatch(setCartOpen(true))
            dispatch(setCheckoutView(true))
          }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-label font-bold text-primary-on hover:bg-primary/90 transition-colors"
        >
          Checkout
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
