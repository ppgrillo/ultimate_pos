'use client'

import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setAppliedPromotions } from '@/store/slices/cartSlice'
import { api } from '@/lib/api/client'
import type { PromotionValidationResponse } from '@ultimate-pos/shared'

export function useCartPromotions() {
  const dispatch = useAppDispatch()
  const items = useAppSelector((s) => s.cart.items)
  // appliedPromotions read intentionally removed to avoid re-fetch loops; we only dispatch updates
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemsRef = useRef(items)
  const hadPromosRef = useRef(false)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (items.length === 0) {
      if (hadPromosRef.current) {
        hadPromosRef.current = false
        dispatch(setAppliedPromotions({ promotions: [], totalDiscount: 0 }))
      }
      return
    }

    timerRef.current = setTimeout(async () => {
      try {
        const validationItems = itemsRef.current.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.original_price || item.price,
          category_id: item.category_id ?? null,
        }))

        const subtotal = itemsRef.current.reduce((sum, i) => sum + (i.original_price || i.price) * i.quantity, 0)

        const res = await api.post<{ data: PromotionValidationResponse }>('/promotions/validate', {
          items: validationItems,
          subtotal,
        })

        const promotions = res.data.applied_promotions || []
        const totalDiscount = res.data.total_discount || 0

        if (promotions.length > 0) {
          hadPromosRef.current = true
        }

        dispatch(setAppliedPromotions({ promotions, totalDiscount }))
      } catch {
        // Silently fail — promos won't apply but cart still works
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [items, dispatch])
}
