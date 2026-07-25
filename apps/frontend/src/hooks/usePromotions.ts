'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { api } from '@/lib/api/client'
import type { Promotion, Product } from '@ultimate-pos/shared'

interface UsePromotionsResult {
  promotions: Promotion[]
  loading: boolean
  getPromotionForProduct: (product: Product) => Promotion | null
  refresh: () => void
}

export function usePromotions(): UsePromotionsResult {
  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const authStoreId = useAppSelector((s) => s.auth.user?.store_id)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())

  const fetchPromotions = useCallback(async () => {
    if (!store?.id) {
      setLoading(false)
      return
    }
    try {
      const res = await api.get<{ data: Promotion[] }>('/promotions')
      setPromotions(res.data || [])
    } catch {
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }, [store?.id])

  useEffect(() => {
    if (!store?.id || !authStoreId || store.id !== authStoreId) {
      setPromotions([])
      setLoading(false)
      return
    }

    fetchPromotions()
  }, [fetchPromotions, store?.id, authStoreId])

  // Refresh `now` every 60s so expired promos drop off and new ones appear
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const activePromotions = useMemo(() => {
    return promotions.filter((p) => {
      if (!p.is_active) return false
      if (p.starts_at && new Date(p.starts_at) > now) return false
      if (p.ends_at && new Date(p.ends_at) < now) return false
      return true
    })
  }, [promotions, now])

  const getPromotionForProduct = useCallback((product: Product): Promotion | null => {
    let bestPromo: Promotion | null = null
    let bestDiscount = 0

    for (const promo of activePromotions) {
      if (promo.target_type === 'product') {
        if (!promo.target_ids?.includes(product.id)) continue
      } else if (promo.target_type === 'category') {
        if (!promo.target_ids?.includes(product.category_id || '')) continue
      } else {
        continue
      }

      let discountAmount: number
      if (promo.discount_type === 'percentage') {
        discountAmount = product.price * (promo.discount_value / 100)
      } else {
        discountAmount = Math.min(promo.discount_value, product.price)
      }

      if (discountAmount > bestDiscount) {
        bestDiscount = discountAmount
        bestPromo = promo
      }
    }

    return bestPromo
  }, [activePromotions])

  return {
    promotions: activePromotions,
    loading,
    getPromotionForProduct,
    refresh: fetchPromotions,
  }
}
