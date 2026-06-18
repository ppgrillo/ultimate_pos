'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ProductForm } from '@/components/products/ProductForm'
import { api } from '@/lib/api/client'
import type { Product } from '@ultimate-pos/shared'

export default function EditProductPage() {
  const params = useParams()
  const id = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ data: Product }>(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-on-surface-variant">Loading product...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="rounded-lg bg-error-container/20 border border-error/30 p-4 text-sm text-error">
        {error || 'Product not found'}
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
