'use client'

import { useState } from 'react'
import { Plus, ShoppingCart, Star } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { proxyImageUrl } from '@/lib/image-proxy'
import { ExpandableText } from '@/components/ui'
import { PromotionBadge } from '@/components/promotions'
import type { Product, Promotion } from '@ultimate-pos/shared'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
  variant?: 'compact' | 'rich' | 'dense'
  activePromotion?: Promotion | null
}

function getSalePrice(product: Product, promotion: Promotion): number {
  if (promotion.discount_type === 'percentage') {
    return Math.round(product.price * (1 - promotion.discount_value / 100) * 100) / 100
  }
  return Math.max(0, Math.round((product.price - promotion.discount_value) * 100) / 100)
}

export function ProductCard({ product, onAdd, variant = 'compact', activePromotion }: ProductCardProps) {
  const [imgError, setImgError] = useState(false)
  const showImg = product.image_url && !imgError
  const salePrice = activePromotion ? getSalePrice(product, activePromotion) : null
  const badgeText = activePromotion?.badge_text || (activePromotion?.discount_type === 'percentage' ? `-${activePromotion.discount_value}%` : null)

  if (variant === 'dense') {
    // Entire card is clickable for faster POS interactions. Add button still works and stops propagation.
    return (
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onAdd(product)
          }
        }}
        onClick={() => onAdd(product)}
        className="group relative flex flex-col rounded-lg bg-surface-container/40 border border-outline-variant/60 overflow-hidden transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.97] cursor-pointer"
      >
        <div className="relative aspect-[4/3] bg-surface-container-high overflow-hidden">
          {product.pinned && (
            <div className="absolute top-1.5 left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#fbbf24] shadow-sm">
              <Star className="h-3 w-3 fill-white text-white" />
            </div>
          )}
          {badgeText && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <PromotionBadge text={badgeText} />
            </div>
          )}
          {showImg ? (
            <img
              src={proxyImageUrl(product.image_url) ?? undefined}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-on-surface-variant/25" />
            </div>
          )}
        </div>
        <div className="p-1.5 space-y-0.5 flex flex-col flex-1">
          <h3 className="font-headline font-bold text-[11px] text-on-surface leading-tight line-clamp-2">{product.name}</h3>
          <div className="flex items-center gap-1.5">
            {salePrice !== null && (
              <span className="font-headline font-semibold text-[10px] text-on-surface-variant line-through">
                {formatCurrency(product.price)}
              </span>
            )}
            <p className={cn(
              'font-headline font-semibold text-[11px]',
              salePrice !== null ? 'text-secondary' : 'text-primary',
            )}>
              {salePrice !== null ? formatCurrency(salePrice) : formatCurrency(product.price)}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            // prevent the root click from firing when pressing the Add button
            e.stopPropagation()
            onAdd(product)
          }}
          className="flex items-center justify-center gap-1 rounded-b-lg bg-primary/10 py-2 text-[10px] font-label font-bold text-primary hover:bg-primary/20 transition-colors active:bg-primary/30"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
    )
  }

  if (variant === 'rich') {
    return (
      <div className="group relative rounded-xl bg-surface-container/50 border border-outline-variant overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg flex flex-col">
        <div className="relative">
          {showImg ? (
            <div className="aspect-[4/3] bg-surface-container-high overflow-hidden shrink-0">
              <img
                src={proxyImageUrl(product.image_url) ?? undefined}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="aspect-[4/3] bg-surface-container-high flex items-center justify-center shrink-0">
              <ShoppingCart className="h-8 w-8 text-on-surface-variant/30" />
            </div>
          )}
          {badgeText && (
            <div className="absolute top-2 right-2 z-10">
              <PromotionBadge text={badgeText} />
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col flex-1">
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-headline font-bold text-sm text-on-surface truncate">{product.name}</h3>
                {product.description && (
                  <ExpandableText text={product.description} className="mt-0.5 text-[11px] text-on-surface-variant" />
                )}
              </div>
              <div className="shrink-0 text-right">
                {salePrice !== null && (
                  <span className="block font-headline text-xs text-on-surface-variant line-through">
                    {formatCurrency(product.price)}
                  </span>
                )}
                <span className={cn(
                  'font-headline font-bold text-base',
                  salePrice !== null ? 'text-secondary' : 'text-primary',
                )}>
                  {salePrice !== null ? formatCurrency(salePrice) : formatCurrency(product.price)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-3 flex items-center gap-2">
            <button
              onClick={() => onAdd(product)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-label font-bold text-primary-on hover:bg-primary/90 transition-colors"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add to Cart
            </button>
            {(product.points ?? 0) > 0 && (
              <span className="shrink-0 rounded-md bg-secondary/10 px-2 py-1 text-[10px] font-label font-bold text-secondary">
                +{product.points} pts
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative flex items-center gap-3 rounded-xl bg-surface-container/50 border border-outline-variant p-3 transition-all hover:border-primary/30">
      <div className="relative">
        {showImg && (
          <div className="h-14 w-14 shrink-0 rounded-lg bg-surface-container-high overflow-hidden">
            <img
              src={proxyImageUrl(product.image_url) ?? undefined}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        )}
        {badgeText && (
          <div className="absolute -top-1.5 -right-1.5 z-10">
            <PromotionBadge text={badgeText} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-headline font-bold text-sm text-on-surface truncate">{product.name}</h3>
        <div className="flex items-center gap-1.5">
          {salePrice !== null && (
            <span className="font-headline text-xs text-on-surface-variant line-through">
              {formatCurrency(product.price)}
            </span>
          )}
          <p className={cn(
            'font-headline font-bold',
            salePrice !== null ? 'text-sm text-secondary' : 'text-primary',
          )}>
            {salePrice !== null ? formatCurrency(salePrice) : formatCurrency(product.price)}
          </p>
        </div>
        {(product.points ?? 0) > 0 && (
          <span className="inline-flex items-center gap-0.5 mt-0.5 text-[10px] font-label font-bold text-secondary">
            +{product.points} pts
          </span>
        )}
      </div>
      <button
        onClick={() => onAdd(product)}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all',
          'bg-primary text-primary-on hover:shadow-lg hover:shadow-primary/30',
        )}
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  )
}
