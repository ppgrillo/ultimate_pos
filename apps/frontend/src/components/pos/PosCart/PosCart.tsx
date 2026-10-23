'use client'

import { ShoppingBag, Trash2, ArrowLeft, ChevronRight, UtensilsCrossed } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveView, setCartOpen, setCheckoutView } from '@/store/slices/posSlice'
import { clearCart } from '@/store/slices/cartSlice'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { OrderSummary } from '@/components/pos/OrderSummary'

export function PosCart() {
  const dispatch = useAppDispatch()
  const items = useAppSelector((s) => s.cart.items)
  const discount = useAppSelector((s) => s.cart.discount)
  const appliedPromotions = useAppSelector((s) => s.cart.appliedPromotions)
  const promoDiscount = useAppSelector((s) => s.cart.promoDiscount)
  const total = items.reduce((sum, i) => sum + (i.original_price || i.price) * i.quantity, 0)
  const productSavings = items.reduce((sum, i) => sum + Math.max(0, (i.original_price || i.price) - i.price) * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const settings = store?.settings
  const hasKitchen = settings?.hasKitchen ?? false
  const orderType = useAppSelector((s) => s.cart.order_type)
  const tableNumber = useAppSelector((s) => s.cart.table_number)
  const taxRate = store?.tax_rate ? Number(store.tax_rate) / 100 : 0
  const taxLabel = settings?.taxLabel || 'Tax'
  const taxInclusive = settings?.taxInclusive ?? false
  const taxEnabled = settings?.taxEnabled ?? false

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-outline-variant">
        <div>
          <h2 className="font-headline font-bold text-lg text-on-surface">Current Order</h2>
          {items.length > 0 && (
            <p className="text-xs text-on-surface-variant">{count} {count === 1 ? 'item' : 'items'}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all items?')) dispatch(clearCart())
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-error hover:bg-error/10 transition-colors"
              title="Clear cart"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => dispatch(setCartOpen(false))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            title="Close"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      {hasKitchen && orderType === 'dine-in' && (
        <button
          onClick={() => dispatch(setActiveView('tables'))}
          className="flex w-full items-center justify-between gap-2 border-b border-outline-variant px-4 py-2.5 text-left transition-colors hover:bg-surface-container"
        >
          <span className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
            <span className="text-xs font-label font-bold text-on-surface">
              {tableNumber ? `Mesa ${tableNumber}` : 'Elegir mesa'}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-on-surface-variant" />
        </button>
      )}

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 px-4 text-center">
          <ShoppingBag className="h-12 w-12 text-on-surface-variant/30 mb-3" />
          <p className="text-on-surface-variant text-sm">Cart is empty</p>
          <p className="text-on-surface-variant/50 text-xs mt-1">Add products to get started</p>
        </div>
      ) : (
        <>
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
              discount={discount}
              appliedPromotions={appliedPromotions}
              promoDiscount={promoDiscount}
              productSavings={productSavings}
              taxRate={taxRate}
              taxLabel={taxLabel}
              taxInclusive={taxInclusive}
              taxEnabled={taxEnabled}
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
        </>
      )}
    </div>
  )
}
