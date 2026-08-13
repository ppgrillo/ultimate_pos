'use client'

import { useParams } from 'next/navigation'
import { ProductForm } from '@/components/products/ProductForm'
import { useGetProductByIdQuery, api } from '@/store/api'
import { useAppSelector } from '@/store/hooks'

export default function EditProductPage() {
  const params = useParams()
  const id = params.id as string
  const { data: product, isLoading, error } = useGetProductByIdQuery(id)

  // Reuse the products list cache (already loaded by the products page) to
  // render the form instantly on navigation, while getProductById refreshes
  // the product in the background.
  const selectProductsCache = api.endpoints.getProducts.select(undefined)
  const listProducts = useAppSelector((s) => selectProductsCache(s)?.data)
  const cachedProduct = listProducts?.find((p) => p.id === id)

  const resolved = product ?? cachedProduct

  if (!resolved) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <p className="text-on-surface-variant">Loading product...</p>
        </div>
      )
    }

    return (
      <div className="rounded-lg bg-error-container/20 border border-error/30 p-4 text-sm text-error">
        {error ? 'Failed to load product' : 'Product not found'}
      </div>
    )
  }

  return (
    <ProductForm
      productId={id}
      initialData={{
        name: resolved.name,
        price: resolved.price,
        cost: resolved.cost,
        sku: resolved.sku,
        barcode: resolved.barcode,
        description: resolved.description,
        category_id: resolved.category_id,
        image_url: resolved.image_url,
        modifiers: resolved.modifiers,
        points: resolved.points,
        stock_qty: resolved.stock_qty,
        track_inventory: resolved.track_inventory,
        low_stock_threshold: resolved.low_stock_threshold,
        tax_exempt: resolved.tax_exempt,
      }}
    />
  )
}
