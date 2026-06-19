'use client'

import type { ReactNode } from 'react'
import { RightPanelCustomer } from '@/components/pos/RightPanelCustomer'
import { OrderActionBar } from '@/components/pos/OrderActionBar'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { OrderSummary } from '@/components/pos/OrderSummary'
import { DiningOptionToggle } from '@/components/pos/DiningOptionToggle'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { MPPointPayment } from '@/components/pos/MPPointPayment'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearCart, setOrderType } from '@/store/slices/cartSlice'
import { setSearchQuery, setSelectedCategory } from '@/store/slices/posSlice'
import { api } from '@/lib/api/client'
import { ShoppingBag, Search, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductCategory, PaymentMethod } from '@ultimate-pos/shared'

interface PosDesktopLayoutProps {
  categories: ProductCategory[]
  products: ReactNode
  featuredProduct?: ReactNode
  customizeModal?: ReactNode
}

export function PosDesktopLayout({ categories, products, featuredProduct, customizeModal }: PosDesktopLayoutProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [mpPaymentOrderId, setMpPaymentOrderId] = useState<string | null>(null)

  const items = useAppSelector((s) => s.cart.items)
  const customer_id = useAppSelector((s) => s.cart.customer_id)
  const order_type = useAppSelector((s) => s.cart.order_type)
  const discount = useAppSelector((s) => s.cart.discount)
  const discount_label = useAppSelector((s) => s.cart.discount_label)
  const notes = useAppSelector((s) => s.cart.notes)
  const searchQuery = useAppSelector((s) => s.pos.searchQuery)
  const selectedCategory = useAppSelector((s) => s.pos.selectedCategory)
  const cartHasItems = items.length > 0
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const settings = store?.settings
  const taxRate = store?.tax_rate ? Number(store.tax_rate) / 100 : 0
  const taxLabel = settings?.taxLabel || 'Tax'
  const taxInclusive = settings?.taxInclusive ?? false
  const taxEnabled = settings?.taxEnabled ?? false
  const checkoutMode = settings?.checkoutMode ?? 'order-only'
  const acceptedMethods = settings?.acceptedPaymentMethods ?? ['cash', 'card', 'transfer']
  const mpPointEnabled = settings?.mpPointEnabled ?? false

  const computedTax = !taxEnabled ? 0 : taxInclusive
    ? Math.round((subtotal - subtotal / (1 + taxRate)) * 100) / 100
    : Math.round(subtotal * taxRate * 100) / 100

  const totalAmount = taxInclusive
    ? Math.round((subtotal - discount) * 100) / 100
    : Math.round((subtotal + computedTax - discount) * 100) / 100

  const doSubmit = async (paymentMethod?: PaymentMethod, cashAmountGiven?: number) => {
    const isCash = paymentMethod === 'cash'
    const isMpPoint = paymentMethod === 'card' && mpPointEnabled

    if (isMpPoint) {
      setSubmitting(false)
      setMpPaymentOrderId('__creating__')
    } else {
      setSubmitting(true)
    }

    try {
      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        modifiers: item.modifiers,
        notes: item.notes,
      }))
      const res = await api.post<{ data: { id: string; metadata: { mpOrderId?: string } } }>('/orders', {
        customer_id: customer_id || undefined,
        type: order_type,
        items: orderItems,
        notes,
        discount,
        discount_label,
        payment_method: paymentMethod,
        cash_amount_given: isCash ? cashAmountGiven : undefined,
      })
      if (isMpPoint && res.data?.metadata?.mpOrderId) {
        setMpPaymentOrderId(res.data.id)
        return
      }
      dispatch(clearCart())
      const params = new URLSearchParams()
      if (paymentMethod) {
        params.set('paymentMethod', paymentMethod)
        params.set('total', String(totalAmount))
        if (isCash && cashAmountGiven !== undefined && cashAmountGiven > totalAmount) {
          params.set('changeDue', String(Math.round((cashAmountGiven - totalAmount) * 100) / 100))
        }
      }
      router.push(`/pos/receipt?${params.toString()}`)
    } catch {
      setMpPaymentOrderId(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (checkoutMode === 'payment-required') {
      setShowPaymentModal(true)
      return
    }
    await doSubmit()
  }

  const handlePaymentConfirm = async (method: PaymentMethod, cashGiven?: number) => {
    setShowPaymentModal(false)
    await doSubmit(method, cashGiven)
  }

  const handleMpPaid = () => {
    dispatch(clearCart())
    setMpPaymentOrderId(null)
    router.push(`/pos/receipt?paymentMethod=card&total=${totalAmount}`)
  }

  const handleMpCancel = async () => {
    if (mpPaymentOrderId && mpPaymentOrderId !== '__creating__') {
      try { await api.post(`/orders/${mpPaymentOrderId}/cancel-mp`) } catch {}
    }
    setMpPaymentOrderId(null)
  }

  return (
    <div className="flex h-full">
      {/* Center Panel — Product Catalog */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar with search and categories */}
        <div className="border-b border-outline-variant bg-surface-container-low/80">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                placeholder="Search..."
                className="h-7 w-full rounded-md border border-outline-variant bg-surface-container pl-7 pr-2 text-[11px] text-on-body placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <button className="flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container px-2 py-1 text-[11px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
              <QrCode className="h-3 w-3" />
              Scan
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1 px-3 pb-1.5 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => dispatch(setSelectedCategory(null))}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-[11px] font-label font-bold transition-colors',
                selectedCategory === null
                  ? 'bg-primary text-primary-on'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-higher hover:text-on-surface',
              )}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => dispatch(setSelectedCategory(cat.id))}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-[11px] font-label font-bold transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-on'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-higher hover:text-on-surface',
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {featuredProduct && (
            <div>
              {featuredProduct}
            </div>
          )}
          {products}
        </div>
      </div>

      {/* Right Panel — Customer + Order + Checkout */}
      <aside className={cn(
        'hidden w-80 shrink-0 border-l border-outline-variant lg:flex lg:flex-col',
        !cartHasItems && 'justify-center',
      )}>
        {cartHasItems ? (
          <>
            {/* Customer Section */}
            <RightPanelCustomer />

            {settings?.hasKitchen && (
              <div className="px-3 pt-3">
                <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2 px-1">
                  Dining Option
                </h3>
                <DiningOptionToggle
                  value={order_type}
                  onChange={(v) => dispatch(setOrderType(v))}
                />
              </div>
            )}

            {/* Order Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant px-1">
                Order Summary ({count} {count === 1 ? 'item' : 'items'})
              </h3>
              {items.map((item, index) => (
                <CartItemRow
                  key={`${item.product_id}-${index}`}
                  item={item}
                />
              ))}
              <div className="pt-2 px-1">
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

            {/* Action Buttons */}
            <OrderActionBar onCheckout={handleSubmit} isSubmitting={submitting} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 text-center">
            <ShoppingBag className="h-12 w-12 text-on-surface-variant/30 mb-3" />
            <p className="text-sm text-on-surface-variant">Cart is empty</p>
            <p className="text-xs text-on-surface-variant/50 mt-1">Add products to get started</p>
          </div>
        )}
      </aside>

      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        total={totalAmount}
        onConfirm={handlePaymentConfirm}
        acceptedMethods={acceptedMethods}
        mpPointEnabled={mpPointEnabled}
      />

      <MPPointPayment
        open={mpPaymentOrderId !== null}
        onOpenChange={(v) => { if (!v) setMpPaymentOrderId(null) }}
        orderId={mpPaymentOrderId && mpPaymentOrderId !== '__creating__' ? mpPaymentOrderId : null}
        isCreating={mpPaymentOrderId === '__creating__'}
        total={totalAmount}
        onPaid={handleMpPaid}
        onCancel={handleMpCancel}
      />

      {customizeModal}
    </div>
  )
}
