'use client'

import { Gift, Minus, Plus, Stars } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setRedeemedPoints } from '@/store/slices/cartSlice'

interface LoyaltyPanelProps {
  pointsLabel?: string
  isAdmin?: boolean
}

export function LoyaltyPanel({ pointsLabel = 'Points', isAdmin }: LoyaltyPanelProps) {
  const dispatch = useAppDispatch()
  const { customer_points, redeemed_points, customer_name, customer_tier, customer_id } = useAppSelector(
    (s) => s.cart
  )

  if (!customer_id) return null

  const available = customer_points - redeemed_points
  const canRedeem = available > 0 && (isAdmin === undefined || isAdmin)

  const handleRedeemChange = (amount: number) => {
    dispatch(setRedeemedPoints(amount))
  }

  const suggestedAmount = Math.min(100, available)

  return (
    <div className="rounded-xl bg-surface-container/40 border border-outline-variant/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Stars className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-on-surface">{pointsLabel}</span>
        {customer_tier && (
          <span className="ml-auto text-xs font-medium text-primary">{customer_tier}</span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-2xl font-bold text-on-surface">{customer_points.toLocaleString()}</span>
        <span className="text-xs text-on-surface-variant">
          {customer_name ? `${customer_name}'s balance` : ''}
        </span>
      </div>

      {canRedeem && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRedeemChange(Math.max(0, redeemed_points - 10))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex-1 text-center">
              <input
                type="number"
                min={0}
                max={available}
                value={redeemed_points}
                onChange={(e) => handleRedeemChange(parseInt(e.target.value) || 0)}
                className="w-20 rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-center text-sm font-bold text-on-surface"
              />
              <span className="ml-2 text-xs text-on-surface-variant">to redeem</span>
            </div>
            <button
              onClick={() => handleRedeemChange(Math.min(available, redeemed_points + 10))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-1.5">
            {[suggestedAmount, suggestedAmount * 2, suggestedAmount * 3].map((amt) =>
              amt <= available ? (
                <button
                  key={amt}
                  onClick={() => handleRedeemChange(amt)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${
                    redeemed_points === amt
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline-variant bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {amt}
                </button>
              ) : null
            )}
          </div>

          {redeemed_points > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
              <Gift className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-on-surface">
                Redeeming {redeemed_points.toLocaleString()} points
              </span>
              <button
                onClick={() => handleRedeemChange(0)}
                className="ml-auto text-xs text-on-surface-variant hover:text-on-surface"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {!canRedeem && customer_points > 0 && redeemed_points === 0 && (
        <p className="text-xs text-on-surface-variant">No points available to redeem</p>
      )}
    </div>
  )
}
