'use client'

import { useState, useEffect, useCallback } from 'react'
import { Gift, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addItem, clearRewardItems, setRedeemedReward } from '@/store/slices/cartSlice'
import { setCustomizeProductId } from '@/store/slices/posSlice'
import { api } from '@/lib/api/client'
import { useGetProductsQuery } from '@/store/api'
import type { LoyaltyReward, Product } from '@ultimate-pos/shared'

interface RewardsPanelProps {
  cardId?: string
  points: number
  rewards?: LoyaltyReward[]
  loading?: boolean
  selectedRewardId?: string | null
  onSelect?: (reward: LoyaltyReward) => void
  onDeselect?: () => void
}

export function RewardsPanel({
  cardId,
  points,
  rewards: controlledRewards,
  loading: controlledLoading,
  selectedRewardId: controlledSelectedId,
  onSelect,
  onDeselect,
}: RewardsPanelProps) {
  const dispatch = useAppDispatch()
  const reduxRewardedId = useAppSelector((s) => s.cart.redeemed_reward_id)
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [loading, setLoading] = useState(false)
  const controlled = cardId === undefined
  const redeemedRewardId = controlled ? controlledSelectedId : reduxRewardedId
  const displayRewards = controlled ? (controlledRewards ?? []) : rewards
  const isLoading = controlled ? (controlledLoading ?? false) : loading
  const { data: products = [] } = useGetProductsQuery(undefined, { skip: controlled })

  useEffect(() => {
    if (!cardId) return
    let cancelled = false
    setLoading(true)
    api.get<{ data: LoyaltyReward[] }>(`/rewards/available/${cardId}`)
      .then((res) => {
        if (!cancelled) setRewards(res.data || [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [cardId])

  const handleDeselect = useCallback(() => {
    if (controlled) {
      onDeselect?.()
    } else {
      dispatch(clearRewardItems())
      dispatch(setRedeemedReward(null))
    }
  }, [controlled, onDeselect, dispatch])

  const handleSelect = (reward: LoyaltyReward) => {
    if (redeemedRewardId === reward.id) {
      handleDeselect()
      return
    }
    if (controlled) {
      onSelect?.(reward)
      return
    }
    dispatch(clearRewardItems())
    dispatch(setRedeemedReward({
      id: reward.id,
      name: reward.name,
      reward_type: reward.reward_type,
      points_required: reward.points_required,
      discount_value: reward.discount_value ?? undefined,
      discount_type: reward.discount_type ?? undefined,
      product_id: reward.product_id ?? undefined,
    }))
    if (reward.reward_type === 'free_product' && reward.product_id) {
      const product = products.find((p: Product) => p.id === reward.product_id)
      if (product) {
        const hasModifiers = product.modifiers && product.modifiers.length > 0
        if (hasModifiers) {
          dispatch(setCustomizeProductId(product.id))
        } else {
          dispatch(addItem({
            product_id: product.id,
            name: product.name,
            price: 0,
            original_price: product.price,
            quantity: 1,
            variant_label: '',
            modifiers: [],
            notes: '[Reward] ' + reward.name,
            category_id: product.category_id,
          }))
        }
      }
    }
  }

  const canAfford = (pointsRequired: number) => points >= pointsRequired

  if (isLoading) {
    return (
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4">
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (displayRewards.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Gift className="h-4 w-4 text-on-surface-variant/50" />
          No rewards available
        </div>
      </div>
    )
  }

  const selectedReward = redeemedRewardId
    ? displayRewards.find((r) => r.id === redeemedRewardId)
    : null

  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant">
          Rewards
        </h4>
        {selectedReward && (
          <button
            onClick={handleDeselect}
            className="flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-[11px] font-label font-bold text-primary hover:bg-primary/25 transition-colors"
          >
            <Gift className="h-3 w-3" />
            <span className="max-w-[120px] truncate">{selectedReward.name}</span>
            <X className="h-3 w-3 ml-0.5" />
          </button>
        )}
      </div>
      {!selectedReward && (
        <div className="space-y-1.5">
          {displayRewards.map((reward) => {
            const affordable = canAfford(reward.points_required)
            return (
              <button
                key={reward.id}
                onClick={() => affordable && handleSelect(reward)}
                disabled={!affordable}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                  affordable
                    ? 'bg-surface-container/50 border border-transparent hover:bg-surface-container-high'
                    : 'bg-surface-container/20 border border-transparent opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-container-high">
                  <Gift className={`h-3.5 w-3.5 ${affordable ? 'text-primary' : 'text-on-surface-variant/50'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-on-surface truncate">{reward.name}</div>
                  <div className="text-on-surface-variant/70 truncate">
                    {reward.points_required.toLocaleString()} pts
                  </div>
                </div>
                <div className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  affordable ? 'bg-success/15 text-success' : 'bg-on-surface/10 text-on-surface-variant'
                }`}>
                  {affordable ? 'Available' : `${points.toLocaleString()}/${reward.points_required.toLocaleString()}`}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
