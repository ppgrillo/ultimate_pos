'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchProducts, fetchCategories } from '@/store/slices/productsSlice'
import { setSelectedCategory, setSearchQuery, setCustomizeProductId } from '@/store/slices/posSlice'
import { addItem } from '@/store/slices/cartSlice'
import { ProductCard } from '@/components/pos/ProductCard'
import { CategoryChips } from '@/components/pos/CategoryChips'
import { PosSearchBar } from '@/components/pos/PosSearchBar'
import type { Product } from '@ultimate-pos/shared'

export function PosMenu() {
  const dispatch = useAppDispatch()
  const { items: products, categories, isLoading } = useAppSelector((s) => s.products)
  const { selectedCategory, searchQuery } = useAppSelector((s) => s.pos)

  useEffect(() => {
    dispatch(fetchProducts())
    dispatch(fetchCategories())
  }, [dispatch])

  const filtered = products.filter((p) => {
    if (!p.is_active) return false
    if (selectedCategory && p.category_id !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false)
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
    <div className="flex flex-col gap-4 p-4 pb-24 lg:pb-4">
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-on-surface-variant">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={handleAdd}
            />
          ))}
        </div>
      )}
    </div>
  )
}
