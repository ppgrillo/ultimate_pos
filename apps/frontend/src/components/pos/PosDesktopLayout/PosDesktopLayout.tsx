'use client'

import type { ReactNode } from 'react'
import { RightPanelCustomer } from '@/components/pos/RightPanelCustomer'
import { OrderActionBar } from '@/components/pos/OrderActionBar'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { OrderSummary } from '@/components/pos/OrderSummary'
import { DiningOptionToggle } from '@/components/pos/DiningOptionToggle'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { MPPointPayment } from '@/components/pos/MPPointPayment'
import { OpenChecksPanel } from '@/components/pos/OpenChecksPanel/OpenChecksPanel'
import { TablesWorkspace } from '@/components/pos/TablesWorkspace'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearCart, setOrderType, setTable } from '@/store/slices/cartSlice'
import { setActiveView, setKitchenNotice, setSearchQuery, setSelectedCategory } from '@/store/slices/posSlice'
import { setSelectedCustomer } from '@/store/slices/customersSlice'
import { api } from '@/lib/api/client'
import { useCloseCheckMutation, useGetLoyaltyCardQuery, api as rtkApi } from '@/store/api'
import { LayoutPanelTop, ShoppingBag, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Check, PaymentMethod, ProductCategory } from '@ultimate-pos/shared'

interface PosDesktopLayoutProps {
  categories: ProductCategory[]
  products: ReactNode
  featuredProduct?: ReactNode
  customizeModal?: ReactNode
  enableTablesView?: boolean
}

export function PosDesktopLayout({
  categories,
  products,
  featuredProduct,
  customizeModal,
  enableTablesView = false,
}: PosDesktopLayoutProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [mpPaymentOrderId, setMpPaymentOrderId] = useState<string | null>(null)
  const [checkToClose, setCheckToClose] = useState<(Check & { total?: number }) | null>(null)
  const [closeCheckError, setCloseCheckError] = useState<string | null>(null)
  const [closeCheck, { isLoading: closingCheck }] = useCloseCheckMutation()

  const items = useAppSelector((s) => s.cart.items)
  const customer_id = useAppSelector((s) => s.cart.customer_id)
  const order_type = useAppSelector((s) => s.cart.order_type)
  const table_number = useAppSelector((s) => s.cart.table_number)
  const discount = useAppSelector((s) => s.cart.discount)
  const discount_label = useAppSelector((s) => s.cart.discount_label)
  const notes = useAppSelector((s) => s.cart.notes)
  const redeemed_points = useAppSelector((s) => s.cart.redeemed_points)
  const appliedPromotions = useAppSelector((s) => s.cart.appliedPromotions)
  const promoDiscount = useAppSelector((s) => s.cart.promoDiscount)
  const searchQuery = useAppSelector((s) => s.pos.searchQuery)
  const selectedCategory = useAppSelector((s) => s.pos.selectedCategory)
  const activeView = useAppSelector((s) => s.pos.activeView)
  const kitchenNotice = useAppSelector((s) => s.pos.kitchenNotice)
  const subtotal = items.reduce((sum, i) => sum + (i.original_price || i.price) * i.quantity, 0)
  const productSavings = items.reduce((sum, i) => sum + Math.max(0, (i.original_price || i.price) - i.price) * i.quantity, 0)
  const actualSubtotal = subtotal - productSavings
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const settings = store?.settings
  const hasLoyalty = (settings?.hasLoyalty as boolean) ?? false
  const { data: loyaltyCard } = useGetLoyaltyCardQuery(customer_id ?? '', { skip: !customer_id || !hasLoyalty })
  const taxRate = store?.tax_rate ? Number(store.tax_rate) / 100 : 0
  const taxLabel = settings?.taxLabel || 'Tax'
  const taxInclusive = settings?.taxInclusive ?? false
  const taxEnabled = settings?.taxEnabled ?? false
  const checkoutMode = settings?.checkoutMode ?? 'order-only'
  const acceptedMethods = settings?.acceptedPaymentMethods ?? ['cash', 'card', 'transfer']
  const mpPointEnabled = settings?.mpPointEnabled ?? false

  const computedTax = !taxEnabled ? 0 : taxInclusive
    ? Math.round((actualSubtotal - actualSubtotal / (1 + taxRate)) * 100) / 100
    : Math.round(actualSubtotal * taxRate * 100) / 100

  const totalDiscount = discount + promoDiscount
  const totalAmount = taxInclusive
    ? Math.round((actualSubtotal - totalDiscount) * 100) / 100
    : Math.round((actualSubtotal + computedTax - totalDiscount) * 100) / 100

  const doSubmit = async (paymentMethod?: PaymentMethod, cashAmountGiven?: number) => {
    const isCash = paymentMethod === 'cash'
    const isMpPoint = paymentMethod === 'card' && mpPointEnabled

    setSubmitting(true)

    try {
      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        modifiers: item.modifiers,
        notes: item.notes,
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
              }))
            : undefined,
          redeemed_points: redeemed_points > 0 ? redeemed_points : undefined,
        })

        dispatch(rtkApi.util.invalidateTags([
          { type: 'Order', id: 'LIST' },
          { type: 'Check', id: 'LIST' },
          { type: 'Check', id: checkId },
        ]))
        dispatch(setSelectedCustomer(null))
        dispatch(clearCart())
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
            }))
          : undefined,
        redeemed_points: redeemed_points > 0 ? redeemed_points : undefined,
        payment_method: paymentMethod,
        cash_amount_given: isCash ? cashAmountGiven : undefined,
      })
      if (isMpPoint && res.data?.metadata?.mpOrderId) {
        setSubmitting(false)
        setMpPaymentOrderId(res.data.id)
        return
      }
      const earnedPoints = res.data?.earned_points ?? 0
      dispatch(setSelectedCustomer(null))
      dispatch(clearCart())
      if (customer_id) {
        dispatch(rtkApi.util.invalidateTags([
          { type: 'LoyaltyCard', id: customer_id },
          { type: 'Customer', id: customer_id },
        ]))
      }
      const params = new URLSearchParams()
      if (paymentMethod) {
        params.set('paymentMethod', paymentMethod)
        params.set('total', String(totalAmount))
        if (isCash && cashAmountGiven !== undefined && cashAmountGiven > totalAmount) {
          params.set('changeDue', String(Math.round((cashAmountGiven - totalAmount) * 100) / 100))
        }
      }
      if (earnedPoints > 0 || redeemed_points > 0) {
        params.set('pointsEarned', String(earnedPoints))
        if (loyaltyCard?.points !== undefined) {
          params.set('pointsBefore', String(loyaltyCard.points))
          params.set('pointsAfter', String(Math.max(0, loyaltyCard.points + (earnedPoints > 0 ? earnedPoints : -redeemed_points))))
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
    if (settings?.hasKitchen && order_type === 'dine-in' && (!table_number || table_number <= 0)) {
      return
    }

    if (checkoutMode === 'payment-required') {
      if (settings?.hasKitchen && order_type === 'dine-in') {
        await doSubmit()
        return
      }
      setShowPaymentModal(true)
      return
    }
    await doSubmit()
  }

  const handlePaymentConfirm = async (method: PaymentMethod, cashGiven?: number) => {
    await doSubmit(method, cashGiven)
    setShowPaymentModal(false)
  }

  const handleMpPaid = () => {
    dispatch(setSelectedCustomer(null))
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

  const handleCloseCheckPayment = async (method: PaymentMethod, cashAmountGiven?: number) => {
    if (!checkToClose) return
    try {
      setCloseCheckError(null)
      await closeCheck({
        checkId: checkToClose.id,
        payment_method: method,
        cash_amount_given: method === 'cash' ? cashAmountGiven : undefined,
      }).unwrap()
      dispatch(setOrderType('dine-in'))
      dispatch(setTable(null))
      setCheckToClose(null)
      setShowPaymentModal(false)
    } catch (err) {
      const message = err && typeof err === 'object' && 'data' in err
        ? ((err as { data?: { error?: string } }).data?.error || 'Could not close check')
        : 'Could not close check'
      setCloseCheckError(message)
    }
  }

  if (enableTablesView && settings?.hasKitchen && activeView === 'tables') {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-outline-variant bg-surface-container-low/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-headline font-bold text-on-surface">Tables Workspace</h2>
              <p className="text-xs text-on-surface-variant">Live floor view for active checks and checkout actions.</p>
            </div>
            <button
              onClick={() => dispatch(setActiveView('menu'))}
              className="rounded-lg border border-outline-variant/60 bg-surface-container px-3 py-2 text-xs font-label font-bold text-on-surface hover:bg-surface-container-high"
            >
              Back to Menu
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <TablesWorkspace
            onCloseAndPay={(check) => {
              setCloseCheckError(null)
              setCheckToClose(check)
              setShowPaymentModal(true)
            }}
          />
        </div>
        <PaymentModal
          open={showPaymentModal}
          onOpenChange={(open) => {
            setShowPaymentModal(open)
            if (!open && checkToClose) setCheckToClose(null)
          }}
          total={checkToClose ? Number(checkToClose.total || 0) : totalAmount}
          onConfirm={checkToClose ? handleCloseCheckPayment : handlePaymentConfirm}
          acceptedMethods={acceptedMethods}
          mpPointEnabled={mpPointEnabled}
          isLoading={submitting || closingCheck}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Center Panel — Product Catalog */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar with search and categories */}
        <div className="border-b border-outline-variant bg-surface-container-low/80">
          <div className="relative flex items-center gap-2 px-3 py-1.5">
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
      <aside className="hidden w-80 shrink-0 border-l border-outline-variant lg:flex lg:flex-col">
        {settings?.hasKitchen && enableTablesView && (
          <div className="border-b border-outline-variant px-3 py-3">
            <button
              onClick={() => dispatch(setActiveView('tables'))}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/45 bg-primary/20 px-3 py-2.5 text-sm font-label font-bold text-primary shadow-[0_0_0_1px_rgba(204,255,0,0.15)] hover:bg-primary/30"
            >
              <LayoutPanelTop className="h-4 w-4" />
              Open Workspace
            </button>
          </div>
        )}

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
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <ShoppingBag className="h-12 w-12 text-on-surface-variant/30 mb-3" />
              <p className="text-sm text-on-surface-variant">Cart is empty</p>
              <p className="text-xs text-on-surface-variant/50 mt-1">Add products to get started</p>
            </div>
          )}
          <div className="pt-2 px-1">
            <OrderSummary
              subtotal={subtotal}
              discount={discount}
              discountLabel={discount_label || undefined}
              appliedPromotions={appliedPromotions}
              promoDiscount={promoDiscount}
              productSavings={productSavings}
              taxRate={taxRate}
              taxLabel={taxLabel}
              taxInclusive={taxInclusive}
              taxEnabled={taxEnabled}
            />
          </div>

         </div>

         {settings?.hasKitchen && (
           <div className="border-t border-outline-variant px-4 py-2">
             {closeCheckError && (
               <p className="mb-2 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs font-label font-bold text-error">
                 {closeCheckError}
               </p>
             )}
             <OpenChecksPanel
               enableWorkspaceShortcut={false}
               onCloseAndPay={(check) => {
                 setCloseCheckError(null)
                 setCheckToClose(check)
                 setShowPaymentModal(true)
               }}
             />
           </div>
         )}

         <OrderActionBar onCheckout={handleSubmit} isSubmitting={submitting} />
       </aside>

      <PaymentModal
        open={showPaymentModal}
        onOpenChange={(open) => {
          setShowPaymentModal(open)
          if (!open && checkToClose) setCheckToClose(null)
        }}
        total={checkToClose ? Number(checkToClose.total || 0) : totalAmount}
        onConfirm={checkToClose ? handleCloseCheckPayment : handlePaymentConfirm}
        acceptedMethods={acceptedMethods}
        mpPointEnabled={mpPointEnabled}
        isLoading={submitting || closingCheck}
      />

      <MPPointPayment
        open={mpPaymentOrderId !== null}
        onOpenChange={(v) => { if (!v) setMpPaymentOrderId(null) }}
        orderId={mpPaymentOrderId}
        total={totalAmount}
        onPaid={handleMpPaid}
        onCancel={handleMpCancel}
      />

      {kitchenNotice && (
        <div className="pointer-events-none fixed bottom-5 right-5 z-50 hidden lg:block">
          <div className="rounded-lg border border-primary/35 bg-surface-container-high/95 px-3 py-2 text-xs font-label font-bold text-on-surface shadow-lg backdrop-blur">
            {kitchenNotice}
          </div>
        </div>
      )}

      {customizeModal}
    </div>
  )
}
