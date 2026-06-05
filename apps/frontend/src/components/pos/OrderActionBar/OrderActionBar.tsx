'use client'

import { Percent, PauseCircle, CreditCard } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { formatCurrency } from '@/lib/utils'

interface OrderActionBarProps {
  onCheckout: () => void
  isSubmitting?: boolean
}

export function OrderActionBar({ onCheckout, isSubmitting }: OrderActionBarProps) {
  const items = useAppSelector((s) => s.cart.items)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const itemsExist = items.length > 0

  return (
    <div className="border-t border-outline-variant p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-on-surface-variant">Total</span>
        <span className="font-headline font-bold text-lg text-on-surface">{formatCurrency(subtotal)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={!itemsExist}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
        >
          <Percent className="h-4 w-4" />
          Promo
        </button>
        <button
          disabled={!itemsExist}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
        >
          <PauseCircle className="h-4 w-4" />
          Hold
        </button>
      </div>
      <button
        onClick={onCheckout}
        disabled={!itemsExist || isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-label font-bold text-primary-on hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-on border-t-transparent" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            Complete Checkout
          </>
        )}
      </button>
    </div>
  )
}
