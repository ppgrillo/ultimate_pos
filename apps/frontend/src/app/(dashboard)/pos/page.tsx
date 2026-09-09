'use client'

import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCustomizeProductId, setQuickSaleOpen } from '@/store/slices/posSlice'
import { addItem } from '@/store/slices/cartSlice'
import { clearAutoPromotions } from '@/store/slices/cartSlice'
import { PosLayout } from '@/components/pos/PosLayout'
import { PosDesktopLayout } from '@/components/pos/PosDesktopLayout'
import { PosMenu } from '@/components/pos/PosMenu'
import { PosCart } from '@/components/pos/PosCart'
import { CheckoutPanel } from '@/components/pos/CheckoutPanel'
import { CustomerDrawer } from '@/components/pos/CustomerDrawer'
import { CustomizeProduct } from '@/components/pos/CustomizeProduct'
import { QuickSaleModal } from '@/components/pos/QuickSaleModal'
import { ProductCard } from '@/components/pos/ProductCard'
import { FeaturedProductCard } from '@/components/pos/FeaturedProductCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { PackageOpen } from 'lucide-react'
import type { Product } from '@ultimate-pos/shared'
import { useGetProductsQuery, useGetCategoriesQuery } from '@/store/api'
import { useCartPromotions } from '@/hooks/useCartPromotions'
import { usePromotions } from '@/hooks/usePromotions'
import { getSalePrice, hasPromoConditions } from '@/lib/utils'

export default function PosPage() {
  useCartPromotions()
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(clearAutoPromotions())
  }, [dispatch])

  const selectedCategory = useAppSelector((s) => s.pos.selectedCategory)
  const searchQuery = useAppSelector((s) => s.pos.searchQuery)
  const quickSaleOpen = useAppSelector((s) => s.pos.quickSaleOpen)
  const autoPromotions = useAppSelector((s) => s.cart.autoPromotions)
  const { data: products = [], isLoading } = useGetProductsQuery()
  const { data: categories = [] } = useGetCategoriesQuery()
  const { getPromotionForProduct } = usePromotions()

  const filtered = products.filter((p) => {
    if (!p.is_active) return false
    if (selectedCategory && p.category_id !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const category = categories.find((c) => c.id === p.category_id)
      const matchesCategory = category?.name.toLowerCase().includes(q) ?? false
      return p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false) || matchesCategory
    }
    return true
  })

  const featured = products.find((p) => p.points && p.points > 50)

  const handleAdd = useCallback((product: Product) => {
    if (product.modifiers && product.modifiers.length > 0) {
      dispatch(setCustomizeProductId(product.id))
      return
    }
    const promo = autoPromotions ? getPromotionForProduct(product) : undefined
    const price = promo && !hasPromoConditions(promo) ? getSalePrice(product.price, promo.discount_type, promo.discount_value) : product.price
    dispatch(addItem({
      product_id: product.id,
      name: product.name,
      price,
      original_price: product.price,
      quantity: 1,
      variant_label: '',
      modifiers: [],
      notes: null,
      category_id: product.category_id,
    }))
  }, [dispatch, getPromotionForProduct, autoPromotions])

  const customizeModal = <CustomizeProduct />

  return (
    <>
      {customizeModal}
      <QuickSaleModal
        open={quickSaleOpen}
        onOpenChange={(v) => dispatch(setQuickSaleOpen(v))}
      />

      {/* Mobile layout */}
      <div className="lg:hidden">
        <PosLayout
          menu={<PosMenu />}
          cart={<PosCart />}
          checkout={<CheckoutPanel />}
          customerDrawer={<CustomerDrawer />}
        />
      </div>

      {/* Desktop layout */}
      <div className="hidden h-full lg:block">
        <PosDesktopLayout
          categories={categories}
          featuredProduct={featured ? (
            <FeaturedProductCard
              product={featured}
              onQuickBuy={handleAdd}
            />
          ) : undefined}
          products={
            isLoading ? (
              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-xl bg-surface-container/30 border border-outline-variant/30 p-3 space-y-2">
                    <Skeleton className="aspect-square rounded-lg w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container/50 border border-outline-variant/40 mb-4">
                  <PackageOpen className="h-6 w-6 text-on-surface-variant/60" />
                </div>
                <p className="font-label font-bold text-sm text-on-surface-variant mb-1">No products found</p>
                <p className="text-xs text-on-surface-variant/60">
                  {searchQuery ? 'Try a different search term' : 'No products in this category'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={handleAdd}
                    variant="dense"
                    activePromotion={autoPromotions ? getPromotionForProduct(product) : undefined}
                  />
                ))}
              </div>
            )
          }
        />
      </div>
    </>
  )
}
