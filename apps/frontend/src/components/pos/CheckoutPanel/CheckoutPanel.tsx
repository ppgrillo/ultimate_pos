'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bolt, Lock, Percent, Banknote, BadgeCheck } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCheckoutView, setCartOpen, setActiveView } from '@/store/slices/posSlice'
import { clearCart, setOrderType } from '@/store/slices/cartSlice'
import { api } from '@/lib/api/client'
import { formatCurrency, cn } from '@/lib/utils'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { OrderSummary } from '@/components/pos/OrderSummary'
import { DiningOptionToggle } from '@/components/pos/DiningOptionToggle'
import { PromoModal } from '@/components/pos/PromoModal'
import { PaymentMethodSelector } from '@/components/pos/PaymentMethodSelector'
import type { PaymentMethod } from '@ultimate-pos/shared'

export function CheckoutPanel() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { items, customer_id, order_type, discount, discount_label, notes } = useAppSelector((s) => s.cart)
  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const settings = store?.settings
  const taxRate = store?.tax_rate ? Number(store.tax_rate) / 100 : 0
  const taxLabel = settings?.taxLabel || 'Tax'
  const taxInclusive = settings?.taxInclusive ?? false
  const taxEnabled = settings?.taxEnabled ?? false
  const checkoutMode = settings?.checkoutMode ?? 'order-only'
  const acceptedMethods = settings?.acceptedPaymentMethods ?? ['cash', 'card', 'transfer']
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPromo, setShowPromo] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [cashGiven, setCashGiven] = useState<string>('')

  useEffect(() => {
    const methods = settings?.acceptedPaymentMethods ?? ['cash', 'card', 'transfer']
    if (methods.length === 1) {
      setSelectedMethod(methods[0])
    }
  }, [settings?.acceptedPaymentMethods])

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const computedTax = !taxEnabled ? 0 : taxInclusive
    ? Math.round((subtotal - subtotal / (1 + taxRate)) * 100) / 100
    : Math.round(subtotal * taxRate * 100) / 100

  const totalAmount = taxInclusive
    ? Math.round((subtotal - discount) * 100) / 100
    : Math.round((subtotal + computedTax - discount) * 100) / 100

  const paymentRequired = checkoutMode === 'payment-required'
  const isCash = selectedMethod === 'cash'
  const parsedCashGiven = parseFloat(cashGiven) || 0
  const changeDue = isCash ? Math.max(0, Math.round((parsedCashGiven - totalAmount) * 100) / 100) : 0
  const cashValid = parsedCashGiven >= totalAmount
  const canSubmit = !paymentRequired || (selectedMethod !== null && (!isCash || cashValid))

  const handleMethodChange = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method)
    if (method !== 'cash') setCashGiven('')
  }, [])

  const handleSubmit = async () => {
    if (paymentRequired && !selectedMethod) return
    if (isCash && !cashValid) return
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
        discount,
        discount_label,
        payment_method: paymentRequired ? selectedMethod : undefined,
        cash_amount_given: isCash ? parsedCashGiven : undefined,
      })

      dispatch(clearCart())
      dispatch(setCheckoutView(false))
      dispatch(setCartOpen(false))
      const params = new URLSearchParams()
      if (paymentRequired && selectedMethod) {
        params.set('paymentMethod', selectedMethod)
        params.set('total', String(totalAmount))
        if (isCash && changeDue > 0) {
          params.set('changeDue', String(changeDue))
        }
      }
      router.push(`/pos/receipt?${params.toString()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  const buttonLabel = paymentRequired && selectedMethod
    ? isCash
      ? `Charge ${formatCurrency(totalAmount)}`
      : `Charge ${formatCurrency(totalAmount)} with ${selectedMethod === 'card' ? 'Card' : 'Transfer'}`
    : `Charge ${formatCurrency(totalAmount)}`

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-outline-variant">
        <button
          onClick={() => {
            dispatch(setCheckoutView(false))
            dispatch(setCartOpen(false))
            dispatch(setActiveView('menu'))
          }}
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

        {settings?.hasKitchen && (
          <div>
            <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">
              Dining Option
            </h3>
            <DiningOptionToggle
              value={order_type}
              onChange={(v) => dispatch(setOrderType(v))}
            />
          </div>
        )}

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
            taxEnabled={taxEnabled}
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
        {paymentRequired && (
          <>
            <div>
              <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">
                Payment Method
              </h3>
              <PaymentMethodSelector
                selected={selectedMethod}
                onSelect={handleMethodChange}
                acceptedMethods={acceptedMethods}
                amount={totalAmount}
              />
            </div>

            {isCash && (
              <div className="rounded-xl bg-surface-container/40 border border-outline-variant/60 p-4 space-y-3 transition-all duration-200">
                <label className="block">
                  <span className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5" />
                    Amount Given
                  </span>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-lg">
                      $
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.01}
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      placeholder={formatCurrency(totalAmount)}
                      className={cn(
                        'w-full rounded-lg border bg-surface-container-high py-3 pl-8 pr-3 text-lg font-headline font-bold text-on-surface placeholder:text-on-surface-variant/30 transition-all',
                        'focus-visible:outline-none focus-visible:ring-2',
                        cashGiven && cashValid
                          ? 'border-primary/50 focus-visible:ring-primary/40'
                          : cashGiven && !cashValid
                            ? 'border-error/50 focus-visible:ring-error/40'
                            : 'border-outline-variant focus-visible:ring-primary/30',
                      )}
                      autoFocus
                    />
                  </div>
                </label>

                {cashGiven && (
                  <div className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-200',
                    cashValid
                      ? 'bg-primary/10 text-primary'
                      : 'bg-error/10 text-error',
                  )}>
                    <span className="font-label font-bold text-xs flex items-center gap-1.5">
                      {cashValid ? (
                        <><BadgeCheck className="h-4 w-4" /> Change Due</>
                      ) : (
                        <><Banknote className="h-4 w-4" /> Insufficient</>
                      )}
                    </span>
                    <span className="font-headline font-bold text-lg">
                      {cashValid
                        ? formatCurrency(changeDue)
                        : formatCurrency(Math.abs(totalAmount - parsedCashGiven)) + ' short'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <button
          onClick={() => setShowPromo(true)}
          disabled={items.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant py-3 text-sm font-label font-bold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
        >
          <Percent className="h-4 w-4" />
          {discount > 0 ? 'Edit Promo' : 'Add Promo'}
        </button>

        <button
          onClick={handleSubmit}
          disabled={submitting || items.length === 0 || !canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-label font-bold text-primary-on hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-on border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              {isCash ? <Banknote className="h-5 w-5" /> : <Bolt className="h-5 w-5" />}
              {buttonLabel}
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-on-surface-variant/50 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Secure transaction powered by Ultimate POS
        </p>
      </div>

      <PromoModal open={showPromo} onOpenChange={setShowPromo} />
    </div>
  )
}
