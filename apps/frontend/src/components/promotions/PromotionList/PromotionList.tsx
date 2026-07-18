'use client'

import { Tag } from 'lucide-react'
import { PromotionCard } from '../PromotionCard'
import type { Promotion } from '@ultimate-pos/shared'

interface PromotionListProps {
  promotions: Promotion[]
  onUpdated: () => void
  onDeleted: () => void
  onEdit: (promotion: Promotion) => void
}

export function PromotionList({ promotions, onUpdated, onDeleted, onEdit }: PromotionListProps) {
  if (promotions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-high mb-4">
          <Tag className="h-8 w-8 text-on-surface-variant/30" />
        </div>
        <p className="text-sm font-headline font-bold text-on-surface">No promotions yet</p>
        <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
          Create your first promotion to offer automatic discounts to your customers.
        </p>
      </div>
    )
  }

  const active = promotions.filter((p) => p.is_active)
  const inactive = promotions.filter((p) => !p.is_active)

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant px-1">
            Active ({active.length})
          </h3>
          {active.map((p) => (
            <PromotionCard
              key={p.id}
              promotion={p}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
      {inactive.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant px-1">
            Inactive ({inactive.length})
          </h3>
          {inactive.map((p) => (
            <PromotionCard
              key={p.id}
              promotion={p}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
