'use client'

import { useState } from 'react'
import { ShoppingCart, Star, Trash2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useGetProductsQuery } from '@/store/api'
import { removeItem, updateQuantity, type CartItem } from '@/store/slices/cartSlice'
import { formatCurrency } from '@/lib/utils'
import { proxyImageUrl } from '@/lib/image-proxy'
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
  const imageUrl = product?.image_url && !imgError ? (proxyImageUrl(product.image_url) ?? product.image_url) : null
  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const hasLoyalty = store?.settings?.hasLoyalty ?? false
  const pointsPerCurrency = store?.settings?.pointsPerCurrency ?? 10
  const productPoints = product?.points ?? 0
  const isCustom = !item.product_id
  const itemPoints = hasLoyalty
    ? isCustom
      ? (item.points ?? 0) * item.quantity
      : productPoints > 0
        ? productPoints * item.quantity
        : Math.floor(item.price * pointsPerCurrency) * item.quantity
    : 0

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
        <p className="font-headline font-bold text-primary text-sm mt-0.5">{formatCurrency(item.price)}</p>
        {itemPoints > 0 && (
          <span className="inline-flex w-fit items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 mt-0.5 text-[10px] font-semibold text-primary">
            <Star className="h-2.5 w-2.5 fill-primary" />
            {itemPoints}
          </span>
        )}
      </div>
      {editable ? (
        <div className="flex items-center gap-1">
          <QuantityStepper
            value={item.quantity}
            onChange={(qty: number) => {
              if (qty === 0) {
                dispatch(removeItem({
                  product_id: item.product_id,
                  modifiers: item.modifiers,
                  notes: item.notes,
                  is_custom: item.is_custom,
                  name: item.name,
                }))
              } else {
                dispatch(updateQuantity({
                  product_id: item.product_id,
                  modifiers: item.modifiers,
                  notes: item.notes,
                  quantity: qty,
                  is_custom: item.is_custom,
                  name: item.name,
                }))
              }
            }}
          />
          <button
            onClick={() => dispatch(removeItem({
              product_id: item.product_id,
              modifiers: item.modifiers,
              notes: item.notes,
              is_custom: item.is_custom,
              name: item.name,
            }))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-error/70 hover:bg-error/10 hover:text-error transition-colors"
            title="Remove item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <span className="text-sm text-on-surface-variant">x{item.quantity}</span>
      )}
    </div>
  )
}
