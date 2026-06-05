'use client'

import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCustomizeProductId } from '@/store/slices/posSlice'
import { addItem } from '@/store/slices/cartSlice'
import { PosLayout } from '@/components/pos/PosLayout'
import { PosDesktopLayout } from '@/components/pos/PosDesktopLayout'
import { PosMenu } from '@/components/pos/PosMenu'
import { PosCart } from '@/components/pos/PosCart'
import { CheckoutPanel } from '@/components/pos/CheckoutPanel'
import { CustomerDrawer } from '@/components/pos/CustomerDrawer'
import { CustomizeProduct } from '@/components/pos/CustomizeProduct'
import { ProductCard } from '@/components/pos/ProductCard'
import { FeaturedProductCard } from '@/components/pos/FeaturedProductCard'
import type { Product } from '@ultimate-pos/shared'

export default function PosPage() {
  const dispatch = useAppDispatch()
  const products = useAppSelector((s) => s.products.items)
  const categories = useAppSelector((s) => s.products.categories)
  const isLoading = useAppSelector((s) => s.products.isLoading)
  const selectedCategory = useAppSelector((s) => s.pos.selectedCategory)
  const searchQuery = useAppSelector((s) => s.pos.searchQuery)

  const filtered = products.filter((p) => {
    if (!p.is_active) return false
    if (selectedCategory && p.category_id !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false)
    }
    return true
  })

  const featured = products.find((p) => p.points && p.points > 50)

  const handleAdd = useCallback((product: Product) => {
    if (product.modifiers && product.modifiers.length > 0) {
      dispatch(setCustomizeProductId(product.id))
      return
    }
    dispatch(addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      variant_label: '',
      modifiers: [],
      notes: null,
    }))
  }, [dispatch])

  const customizeModal = <CustomizeProduct />

  return (
    <>
      {customizeModal}

      {/* Mobile layout */}
      <div className="lg:hidden">
        <PosLayout
          menu={
            <PosMenu />
          }
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
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-on-surface-variant">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={handleAdd}
                    variant="rich"
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
