'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useGetProductsQuery } from '@/store/api'
import { removeItem, updateQuantity, type CartItem } from '@/store/slices/cartSlice'
import { formatCurrency } from '@/lib/utils'
import { QuantityStepper } from '@/components/pos/QuantityStepper'

interface CartItemRowProps {
  item: CartItem
  editable?: boolean
}

export function CartItemRow({ item, editable = true }: CartItemRowProps) {
  const dispatch = useAppDispatch()
  const [imgError, setImgError] = useState(false)
  const sliceProducts = useAppSelector((s) => s.products.items)
  const { data: queryProducts = [] } = useGetProductsQuery()
  const product = queryProducts.find((p) => p.id === item.product_id)
    ?? sliceProducts.find((p) => p.id === item.product_id)
  const imageUrl = product?.image_url && !imgError ? product.image_url : null

  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-container/50 border border-outline-variant p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-high">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <ShoppingCart className="h-5 w-5 text-on-surface-variant/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-sm text-on-surface truncate">{item.name}</p>
        {item.variant_label && (
          <p className="text-xs text-on-surface-variant truncate mt-0.5">{item.variant_label}</p>
        )}
        <p className="font-headline font-bold text-primary text-sm mt-1">{formatCurrency(item.price)}</p>
      </div>
      {editable ? (
        <div className="flex items-center gap-2">
          <QuantityStepper
            value={item.quantity}
            onChange={(qty: number) => {
              if (qty === 0) {
                dispatch(removeItem({ product_id: item.product_id, modifiers: item.modifiers }))
              } else {
                dispatch(updateQuantity({ product_id: item.product_id, modifiers: item.modifiers, quantity: qty }))
              }
            }}
          />
        </div>
      ) : (
        <span className="text-sm text-on-surface-variant">x{item.quantity}</span>
      )}
    </div>
  )
}
