'use client'

import type { ReactNode } from 'react'
import { RightPanelCustomer } from '@/components/pos/RightPanelCustomer'
import { OrderActionBar } from '@/components/pos/OrderActionBar'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { OrderSummary } from '@/components/pos/OrderSummary'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearCart } from '@/store/slices/cartSlice'
import { setSearchQuery, setSelectedCategory } from '@/store/slices/posSlice'
import { api } from '@/lib/api/client'
import { ShoppingBag, Search, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductCategory } from '@ultimate-pos/shared'

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

  const handleSubmit = async () => {
    setSubmitting(true)
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
      router.push('/pos/receipt')
    } catch {
      // error handled by OrderActionBar
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Center Panel — Product Catalog */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar with search and categories */}
        <div className="border-b border-outline-variant bg-surface-container-low/80">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                placeholder="Search products..."
                className="h-8 w-full rounded-md border border-outline-variant bg-surface-container pl-8 pr-2 text-xs text-on-body placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
            <button className="flex items-center gap-1.5 rounded-md border border-outline-variant bg-surface-container px-2.5 py-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
              <QrCode className="h-3.5 w-3.5" />
              Scan Barcode
            </button>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto hide-scrollbar">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
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

      {customizeModal}
    </div>
  )
}
