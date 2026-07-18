'use client'

import { useState } from 'react'
import { Tag, Percent, DollarSign, Calendar, Trash2, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { api } from '@/lib/api/client'
import type { Promotion } from '@ultimate-pos/shared'

interface PromotionCardProps {
  promotion: Promotion
  onUpdated: () => void
  onDeleted: () => void
  onEdit: (promotion: Promotion) => void
}

export function PromotionCard({ promotion, onUpdated, onDeleted, onEdit }: PromotionCardProps) {
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isExpired = promotion.ends_at && new Date(promotion.ends_at) < new Date()
  const isNotStarted = promotion.starts_at && new Date(promotion.starts_at) > new Date()
  const isScheduled = promotion.starts_at || promotion.ends_at

  const handleToggle = async () => {
    setToggling(true)
    try {
      await api.patch(`/promotions/${promotion.id}/toggle`, {
        is_active: !promotion.is_active,
      })
      onUpdated()
    } catch {
    } finally {
      setToggling(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this promotion?')) return
    setDeleting(true)
    try {
      await api.delete(`/promotions/${promotion.id}`)
      onDeleted()
    } catch {
    } finally {
      setDeleting(false)
    }
  }

  const targetLabel = promotion.target_type === 'product'
    ? 'Specific Products'
    : promotion.target_type === 'category'
      ? 'Category'
      : 'Entire Cart'

  const discountLabel = promotion.discount_type === 'percentage'
    ? `${promotion.discount_value}% off`
    : `${formatCurrency(promotion.discount_value)} off`

  const conditionParts: string[] = []
  if (promotion.min_quantity) conditionParts.push(`Min ${promotion.min_quantity} items`)
  if (promotion.min_subtotal) conditionParts.push(`Min ${formatCurrency(promotion.min_subtotal)}`)

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      promotion.is_active && !isExpired && !isNotStarted
        ? 'border-primary/30 bg-surface-container/50'
        : 'border-outline-variant/50 bg-surface-container/30 opacity-60',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-headline font-bold text-sm text-on-surface truncate">
              {promotion.name}
            </h3>
            {promotion.badge_text && (
              <span className="shrink-0 rounded-md bg-secondary/10 px-1.5 py-0.5 text-[9px] font-label font-bold text-secondary">
                {promotion.badge_text}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1">
              {promotion.discount_type === 'percentage' ? (
                <Percent className="h-3 w-3" />
              ) : (
                <DollarSign className="h-3 w-3" />
              )}
              {discountLabel}
            </span>
            <span className="text-on-surface-variant/30">·</span>
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {targetLabel}
            </span>
            {conditionParts.length > 0 && (
              <>
                <span className="text-on-surface-variant/30">·</span>
                <span>{conditionParts.join(', ')}</span>
              </>
            )}
          </div>

          {isScheduled && (
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-on-surface-variant/60">
              <Calendar className="h-3 w-3" />
              {promotion.starts_at && formatDate(promotion.starts_at)}
              {promotion.starts_at && promotion.ends_at && ' — '}
              {promotion.ends_at && formatDate(promotion.ends_at)}
              {isExpired && <span className="ml-1 text-error font-bold">Expired</span>}
              {isNotStarted && <span className="ml-1 text-primary font-bold">Scheduled</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(promotion)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            {promotion.is_active ? (
              <ToggleRight className="h-5 w-5 text-primary" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
