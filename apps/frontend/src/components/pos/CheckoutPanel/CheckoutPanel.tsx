'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bolt, Lock } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCheckoutView, setCartOpen } from '@/store/slices/posSlice'
import { clearCart } from '@/store/slices/cartSlice'
import { api } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { OrderSummary } from '@/components/pos/OrderSummary'
import { DiningOptionToggle } from '@/components/pos/DiningOptionToggle'

export function CheckoutPanel() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { items, customer_id, order_type, discount, discount_label, notes } = useAppSelector((s) => s.cart)
  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const settings = store?.settings
  const taxRate = store?.tax_rate ? Number(store.tax_rate) / 100 : 0
  const taxLabel = settings?.taxLabel || 'Tax'
  const taxInclusive = settings?.taxInclusive ?? false
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        modifiers: item.modifiers,
        notes: item.notes,
      }))

      await api.post('/orders', {
        customer_id: customer_id || undefined,
        type: order_type,
        items: orderItems,
        notes,
      })

      dispatch(clearCart())
      dispatch(setCheckoutView(false))
      dispatch(setCartOpen(false))
      router.push('/pos/receipt')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-outline-variant">
        <button
          onClick={() => dispatch(setCheckoutView(false))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="font-headline font-bold text-lg text-on-surface">Review Cart</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-2">
          <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant">
            Items ({items.length})
          </h3>
          {items.map((item, index) => (
            <CartItemRow
              key={`${item.product_id}-${index}`}
              item={item}
            />
          ))}
        </div>

        <div>
          <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">
            Dining Option
          </h3>
          <DiningOptionToggle
            value={order_type}
            onChange={() => {}}
          />
        </div>

        <div>
          <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">
            Order Summary
          </h3>
          <OrderSummary
            subtotal={subtotal}
            discount={discount}
            discountLabel={discount_label || undefined}
            taxRate={taxRate}
            taxLabel={taxLabel}
            taxInclusive={taxInclusive}
            showTotal
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-error bg-error-container/20 border-t border-error/30">
          {error}
        </div>
      )}

      <div className="border-t border-outline-variant p-4 space-y-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || items.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-label font-bold text-primary-on hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-on border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              <Bolt className="h-5 w-5" />
              Charge {formatCurrency(subtotal)}
            </>
          )}
        </button>
        <p className="text-center text-[10px] text-on-surface-variant/50 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secure transaction powered by Ultimate POS
        </p>
      </div>
    </div>
  )
}
