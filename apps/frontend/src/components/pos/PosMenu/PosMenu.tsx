'use client'

import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSelectedCategory, setSearchQuery, setCustomizeProductId } from '@/store/slices/posSlice'
import { addItem } from '@/store/slices/cartSlice'
import { ProductCard } from '@/components/pos/ProductCard'
import { CategoryChips } from '@/components/pos/CategoryChips'
import { PosSearchBar } from '@/components/pos/PosSearchBar'
import type { Product } from '@ultimate-pos/shared'
import { useGetProductsQuery, useGetCategoriesQuery } from '@/store/api'

export function PosMenu() {
  const dispatch = useAppDispatch()
  const { selectedCategory, searchQuery } = useAppSelector((s) => s.pos)
  const sliceProducts = useAppSelector((s) => s.products.items)
  const sliceCategories = useAppSelector((s) => s.products.categories)
  const { data: queryProducts = [], isLoading: productsLoading } = useGetProductsQuery()
  const { data: queryCategories = [] } = useGetCategoriesQuery()
  const products = sliceProducts.length > 0 ? sliceProducts : queryProducts
  const categories = sliceCategories.length > 0 ? sliceCategories : queryCategories

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

  const handleAdd = (product: Product) => {
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
  }

  return (
    <div className="flex flex-col gap-2 p-2 pb-24 lg:pb-2">
      <PosSearchBar
        value={searchQuery}
        onChange={(v: string) => dispatch(setSearchQuery(v))}
        onScanClick={() => {}}
      />

      <CategoryChips
        categories={categories}
        selectedId={selectedCategory}
        onSelect={(id: string | null) => dispatch(setSelectedCategory(id))}
      />

      {productsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-on-surface-variant">No products found</p>
        </div>
      ) : (
        <div
          className="grid gap-2"
          // Use auto-fit so the grid automatically fills available width like marketplaces (AliExpress)
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
        >
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={handleAdd}
              variant="dense"
            />
          ))}
        </div>
      )}
    </div>
  )
}
