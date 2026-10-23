'use client'

import { useAppSelector } from '@/store/hooks'
import { useGetProductsQuery } from '@/store/api'

// Returns a resolver that maps a product id to its bulk unit label ("kg",
// "l", …), or null when the product is not sold by weight/volume. Used by
// order-history surfaces (OrderCard, OrderDetailModal, TablesWorkspace) that
// only receive `product_id` on each line item. Lookup order mirrors
// CartItemRow / CustomizeProduct: RTK query cache first, POS slice fallback.
export function useBulkUnit() {
  const sliceProducts = useAppSelector((s) => s.products.items)
  const { data: queryProducts = [] } = useGetProductsQuery()

  return (productId: string | null | undefined): string | null => {
    if (!productId) return null
    const product =
      queryProducts.find((p) => p.id === productId) ??
      sliceProducts.find((p) => p.id === productId)
    if (!product?.is_bulk) return null
    return product.bulk_unit ?? null
  }
}
