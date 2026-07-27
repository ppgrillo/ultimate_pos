'use client'

import { useState } from 'react'
import { Percent, Trash2, CreditCard, CookingPot, PlusCircle, Send, Wallet } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearCart } from '@/store/slices/cartSlice'
import { formatCurrency } from '@/lib/utils'
import { PromoModal } from '@/components/pos/PromoModal'

interface OrderActionBarProps {
  onCheckout: () => void
  isSubmitting?: boolean
}

export function OrderActionBar({ onCheckout, isSubmitting }: OrderActionBarProps) {
  const dispatch = useAppDispatch()
  const items = useAppSelector((s) => s.cart.items)
  const discount = useAppSelector((s) => s.cart.discount)
  const promoDiscount = useAppSelector((s) => s.cart.promoDiscount)
  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const settings = store?.settings
  const hasKitchen = settings?.hasKitchen ?? false
  const checkoutMode = settings?.checkoutMode ?? 'order-only'
  const orderType = useAppSelector((s) => s.cart.order_type)
  const tableNumber = useAppSelector((s) => s.cart.table_number)
  const taxRate = store?.tax_rate ? Number(store.tax_rate) / 100 : 0
  const taxInclusive = settings?.taxInclusive ?? false
  const taxEnabled = settings?.taxEnabled ?? false

  const actualSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalDiscount = discount + promoDiscount

  const tax = !taxEnabled ? 0 : taxInclusive
    ? Math.round((actualSubtotal - actualSubtotal / (1 + taxRate)) * 100) / 100
    : Math.round(actualSubtotal * taxRate * 100) / 100

  const finalTotal = taxInclusive
    ? Math.round((actualSubtotal - totalDiscount) * 100) / 100
    : Math.round((actualSubtotal + tax - totalDiscount) * 100) / 100

  const itemsExist = items.length > 0
  const [showPromo, setShowPromo] = useState(false)

  const isDineInKitchenFlow = hasKitchen && orderType === 'dine-in'
  const isTakeoutLike = orderType === 'takeaway' || orderType === 'delivery'
  const needsTable = isDineInKitchenFlow && !tableNumber
  const canCheckout = itemsExist && !isSubmitting && !needsTable

  let actionLabel = 'Complete Checkout'
  let ActionIcon = CreditCard

  if (isDineInKitchenFlow) {
    actionLabel = tableNumber ? 'Add to Table' : 'Select Table'
    ActionIcon = tableNumber ? PlusCircle : CookingPot
  } else if (isTakeoutLike && checkoutMode === 'payment-required') {
    actionLabel = 'Complete Payment'
    ActionIcon = Wallet
  } else if (isTakeoutLike) {
    actionLabel = 'Send Order'
    ActionIcon = Send
  }

  return (
    <div className="border-t border-outline-variant p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">Total</span>
        <span className="font-headline font-bold text-lg text-on-surface">
          {formatCurrency(finalTotal)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={!itemsExist}
          onClick={() => setShowPromo(true)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
        >
          <Percent className="h-4 w-4" />
          {discount > 0 ? 'Edit Promo' : 'Promo'}
        </button>
        <button
          disabled={!itemsExist}
          onClick={() => {
            if (itemsExist && confirm('Clear the entire cart?')) {
              dispatch(clearCart())
            }
          }}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          Clear All
        </button>
      </div>
      <button
        onClick={onCheckout}
        disabled={!canCheckout}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-label font-bold text-primary-on hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-on border-t-transparent" />
            Processing...
          </>
        ) : (
          <>
            <ActionIcon className="h-5 w-5" />
            {actionLabel}
          </>
        )}
      </button>

      <PromoModal open={showPromo} onOpenChange={setShowPromo} />
    </div>
  )
}
