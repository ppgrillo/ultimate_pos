'use client'

import { useParams } from 'next/navigation'
import { ProductForm } from '@/components/products/ProductForm'
import { useGetProductByIdQuery } from '@/store/api'

export default function EditProductPage() {
  const params = useParams()
  const id = params.id as string
  const { data: product, isLoading, error } = useGetProductByIdQuery(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-on-surface-variant">Loading product...</p>
      </div>
    )
  }

  if (error || !product) {
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
        name: product.name,
        price: product.price,
        cost: product.cost,
        sku: product.sku,
        barcode: product.barcode,
        description: product.description,
        category_id: product.category_id,
        image_url: product.image_url,
        modifiers: product.modifiers,
        points: product.points,
        stock_qty: product.stock_qty,
        track_inventory: product.track_inventory,
        low_stock_threshold: product.low_stock_threshold,
        tax_exempt: product.tax_exempt,
      }}
    />
  )
}
