'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bolt, Lock, Percent, Banknote, BadgeCheck, Receipt } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCheckoutView, setCartOpen, setActiveView, setKitchenNotice } from '@/store/slices/posSlice'
import { clearCart, setOrderType, setTable } from '@/store/slices/cartSlice'
import { setSelectedCustomer } from '@/store/slices/customersSlice'
import { api } from '@/lib/api/client'
import { formatCurrency, cn } from '@/lib/utils'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { OrderSummary } from '@/components/pos/OrderSummary'
import { DiningOptionToggle } from '@/components/pos/DiningOptionToggle'
import { PromoModal } from '@/components/pos/PromoModal'
import { PaymentMethodSelector } from '@/components/pos/PaymentMethodSelector'
import { MPPointPayment } from '@/components/pos/MPPointPayment'

import { RewardsPanel } from '@/components/pos/RewardsPanel'
import { EnrollPrompt } from '@/components/pos/EnrollPrompt'
import { useGetLoyaltyCardQuery, api as rtkApi } from '@/store/api'
import type { PaymentMethod } from '@ultimate-pos/shared'

export function CheckoutPanel() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { items, customer_id, customer_name, order_type, table_number, discount, discount_label, notes, redeemed_points, redeemed_reward_id, redeemed_reward_data, appliedPromotions, promoDiscount } = useAppSelector((s) => s.cart)
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
  const [mpPaymentOrderId, setMpPaymentOrderId] = useState<string | null>(null)
  const hasLoyalty = (settings?.hasLoyalty as boolean) ?? false
  const { data: loyaltyCard } = useGetLoyaltyCardQuery(customer_id ?? '', { skip: !customer_id || !hasLoyalty })

  useEffect(() => {
    const methods = settings?.acceptedPaymentMethods ?? ['cash', 'card', 'transfer']
    if (methods.length === 1) {
      setSelectedMethod(methods[0])
    }
  }, [settings?.acceptedPaymentMethods])

  const subtotal = items.reduce((sum, i) => sum + (i.original_price || i.price) * i.quantity, 0)
  const productSavings = items.reduce((sum, i) => sum + Math.max(0, (i.original_price || i.price) - i.price) * i.quantity, 0)
  const actualSubtotal = subtotal - productSavings

  const rewardDiscount = redeemed_reward_id && redeemed_reward_data
    ? redeemed_reward_data.reward_type === 'percentage_discount' || (redeemed_reward_data.reward_type === 'custom' && redeemed_reward_data.discount_type === 'percentage')
      ? Math.round(actualSubtotal * (redeemed_reward_data.discount_value || 0) / 100 * 100) / 100
      : redeemed_reward_data.reward_type === 'fixed_discount' || (redeemed_reward_data.reward_type === 'custom' && redeemed_reward_data.discount_type === 'fixed')
        ? Math.min(redeemed_reward_data.discount_value || 0, actualSubtotal)
        : 0
    : 0

  const computedTax = !taxEnabled ? 0 : taxInclusive
    ? Math.round((actualSubtotal - actualSubtotal / (1 + taxRate)) * 100) / 100
    : Math.round(actualSubtotal * taxRate * 100) / 100

  const totalDiscount = discount + promoDiscount + rewardDiscount
  const totalAmount = taxInclusive
    ? Math.round((actualSubtotal - totalDiscount) * 100) / 100
    : Math.round((actualSubtotal + computedTax - totalDiscount) * 100) / 100

  const paymentRequired = checkoutMode === 'payment-required'
  const payLaterMode = checkoutMode === 'order-first-pay-later'
  const isCash = selectedMethod === 'cash'
  const parsedCashGiven = parseFloat(cashGiven) || 0
  const changeDue = isCash ? Math.max(0, Math.round((parsedCashGiven - totalAmount) * 100) / 100) : 0
  const cashValid = parsedCashGiven >= totalAmount
  const canSubmit = !paymentRequired || (selectedMethod !== null && (!isCash || cashValid))
  const mpPointEnabled = settings?.mpPointEnabled ?? false

  const handleMethodChange = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method)
    if (method !== 'cash') setCashGiven('')
  }, [])

  const handleMpPaid = () => {
    dispatch(clearCart())
    dispatch(setSelectedCustomer(null))
    dispatch(setCheckoutView(false))
    dispatch(setCartOpen(false))
    setMpPaymentOrderId(null)
    router.push(`/pos/receipt?paymentMethod=card&total=${totalAmount}`)
  }

  const handleMpCancel = async () => {
    if (mpPaymentOrderId && mpPaymentOrderId !== '__creating__') {
      try { await api.post(`/orders/${mpPaymentOrderId}/cancel-mp`) } catch {}
    }
    setMpPaymentOrderId(null)
  }

  const handleSubmit = async () => {
    if (paymentRequired && !selectedMethod) return
    if (isCash && !cashValid) return
    setSubmitting(true)
    setError(null)

    const isMpPoint = selectedMethod === 'card' && mpPointEnabled

    try {
      const orderItems = items.map((item) => ({
        product_id: item.is_custom ? null : item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        modifiers: item.modifiers,
        notes: item.is_custom ? item.name : item.notes,
        custom_name: item.is_custom ? item.name : undefined,
        points: item.points,
      }))

      if (settings?.hasKitchen && order_type === 'dine-in') {
        if (!table_number || table_number <= 0) {
          throw new Error('Table number is required for dine-in orders')
        }

        const existing = await api.get<{ data: { id: string } | null }>('/checks/active', {
          params: { tableNumber: String(table_number) },
        })

        const checkId = existing.data?.id || (
          await api.post<{ data: { id: string } }>('/checks/open', {
            table_number,
            customer_id: customer_id || null,
          })
        ).data.id

        await api.post<{ data: { id: string; earned_points?: number } }>(`/checks/${checkId}/orders`, {
          type: order_type,
          items: orderItems,
          notes,
          discount,
          discount_label,
          promo_discount: promoDiscount > 0 ? promoDiscount : undefined,
          applied_promotions: appliedPromotions.length > 0
            ? appliedPromotions.map((p) => ({
                promotion_id: p.promotion_id,
                name: p.name,
                discount_amount: p.discount_amount,
                discount_type: p.discount_type,
                discount_value: p.discount_value,
              }))
            : undefined,
          redeemed_points: redeemed_points > 0 ? redeemed_points : undefined,
          redeemed_reward_id: redeemed_reward_id || undefined,
        })

        dispatch(rtkApi.util.invalidateTags([
          { type: 'Order', id: 'LIST' },
          { type: 'Check', id: 'LIST' },
          { type: 'Check', id: checkId },
        ]))

        dispatch(clearCart())
        dispatch(setSelectedCustomer(null))
        dispatch(setCheckoutView(false))
        dispatch(setCartOpen(false))
        dispatch(setKitchenNotice(`Sent to Kitchen - Table ${table_number}`))
        window.setTimeout(() => {
          dispatch(setKitchenNotice(null))
        }, 2200)
        return
      }

      const res = await api.post<{ data: { id: string; metadata: { mpOrderId?: string }; earned_points?: number } }>('/orders', {
        customer_id: customer_id || undefined,
        table_number: table_number || undefined,
        type: order_type,
        items: orderItems,
        notes,
        discount,
        discount_label,
        promo_discount: promoDiscount > 0 ? promoDiscount : undefined,
        applied_promotions: appliedPromotions.length > 0
          ? appliedPromotions.map((p) => ({
              promotion_id: p.promotion_id,
              name: p.name,
              discount_amount: p.discount_amount,
              discount_type: p.discount_type,
              discount_value: p.discount_value,
            }))
          : undefined,
        redeemed_points: redeemed_points > 0 ? redeemed_points : undefined,
        redeemed_reward_id: redeemed_reward_id || undefined,
        payment_method: paymentRequired ? selectedMethod : undefined,
        cash_amount_given: isCash ? parsedCashGiven : undefined,
      })

      if (isMpPoint && res.data?.metadata?.mpOrderId) {
        setSubmitting(false)
        setMpPaymentOrderId(res.data.id)
        return
      }

      const earnedPoints = res.data?.earned_points ?? 0

      dispatch(clearCart())
      dispatch(setSelectedCustomer(null))
      dispatch(setCheckoutView(false))
      dispatch(setCartOpen(false))
      if (customer_id) {
        dispatch(rtkApi.util.invalidateTags([
          { type: 'LoyaltyCard', id: customer_id },
          { type: 'Customer', id: customer_id },
        ]))
      }
      const params = new URLSearchParams()
      if (paymentRequired && selectedMethod) {
        params.set('paymentMethod', selectedMethod)
        params.set('total', String(totalAmount))
        if (isCash && changeDue > 0) {
          params.set('changeDue', String(changeDue))
        }
      }
      const rewardPoints = redeemed_reward_data?.points_required ?? 0
      const totalRedeemed = redeemed_points + rewardPoints
      if (earnedPoints > 0 || totalRedeemed > 0) {
        params.set('pointsEarned', String(earnedPoints))
        if (totalRedeemed > 0) {
          params.set('pointsRedeemed', String(totalRedeemed))
        }
        if (loyaltyCard?.points !== undefined) {
          params.set('pointsBefore', String(loyaltyCard.points))
          params.set('pointsAfter', String(Math.max(0, loyaltyCard.points + earnedPoints - totalRedeemed)))
        }
      }
      if (rewardDiscount > 0) {
        params.set('rewardDiscount', String(rewardDiscount))
        params.set('rewardLabel', redeemed_reward_data?.name || 'Reward Discount')
      }
      router.push(`/pos/receipt?${params.toString()}`)
    } catch (err) {
      setMpPaymentOrderId(null)
      setError(err instanceof Error ? err.message : 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  const buttonLabel = paymentRequired && selectedMethod
    ? isCash
      ? `Charge ${formatCurrency(totalAmount)}`
      : `Charge ${formatCurrency(totalAmount)} with ${selectedMethod === 'card' ? 'Card' : 'Transfer'}`
    : payLaterMode
      ? `Create Order for ${formatCurrency(totalAmount)}`
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

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">
        {hasLoyalty && customer_id && (
          <div>
            {loyaltyCard ? (
              <div>
                <RewardsPanel cardId={loyaltyCard.id} points={loyaltyCard.points} />
              </div>
            ) : (
              <EnrollPrompt
                customerId={customer_id}
                customerName={customer_name ?? 'this customer'}
                onEnrolled={() => {
                }}
              />
            )}
          </div>
        )}

          <div className="space-y-2">
            <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Items ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((item, index) => (
                <CartItemRow
                  key={`${item.product_id}-${index}`}
                  item={item}
                />
              ))}
            </div>
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
            {order_type === 'dine-in' && (
              <div className="mt-3 rounded-xl bg-surface-container/40 border border-outline-variant/60 p-3">
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-2">Table Number</label>
                <input
                  type="number"
                  min={1}
                  value={table_number ?? ''}
                  onChange={(e) => dispatch(setTable(e.target.value ? Number(e.target.value) : null))}
                  placeholder="e.g. 12"
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-high px-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
            )}
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
            appliedPromotions={appliedPromotions}
            promoDiscount={promoDiscount}
            productSavings={productSavings}
            rewardDiscount={rewardDiscount}
            taxRate={taxRate}
            taxLabel={taxLabel}
            taxInclusive={taxInclusive}
            taxEnabled={taxEnabled}
            showTotal
          />
          </div>
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
                mpPointEnabled={mpPointEnabled}
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
              {payLaterMode ? <Receipt className="h-5 w-5" /> : isCash ? <Banknote className="h-5 w-5" /> : <Bolt className="h-5 w-5" />}
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

      <MPPointPayment
        open={mpPaymentOrderId !== null}
        onOpenChange={(v) => { if (!v) setMpPaymentOrderId(null) }}
        orderId={mpPaymentOrderId}
        total={totalAmount}
        onPaid={handleMpPaid}
        onCancel={handleMpCancel}
      />
    </div>
  )
}
