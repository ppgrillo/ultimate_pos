'use client'

import { useAppDispatch } from '@/store/hooks'
import { removeItem, updateQuantity, type CartItem } from '@/store/slices/cartSlice'
import { formatCurrency } from '@/lib/utils'
import { QuantityStepper } from '@/components/pos/QuantityStepper'

interface CartItemRowProps {
  item: CartItem
  editable?: boolean
}

export function CartItemRow({ item, editable = true }: CartItemRowProps) {
  const dispatch = useAppDispatch()

  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-container/50 border border-outline-variant p-3">
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
