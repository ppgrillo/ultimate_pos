'use client'

import { Plus, ShoppingCart } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { ExpandableText } from '@/components/ui'
import type { Product } from '@ultimate-pos/shared'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
  variant?: 'compact' | 'rich'
}

export function ProductCard({ product, onAdd, variant = 'compact' }: ProductCardProps) {
  if (variant === 'rich') {
    return (
      <div className="group relative rounded-xl bg-surface-container/50 border border-outline-variant overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg flex flex-col">
        {product.image_url ? (
          <div className="aspect-[4/3] bg-surface-container-high overflow-hidden shrink-0">
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-surface-container-high flex items-center justify-center shrink-0">
            <ShoppingCart className="h-8 w-8 text-on-surface-variant/30" />
          </div>
        )}
        <div className="p-3 flex flex-col flex-1">
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-headline font-bold text-sm text-on-surface truncate">{product.name}</h3>
                {product.description && (
                  <ExpandableText text={product.description} className="mt-0.5 text-[11px] text-on-surface-variant" />
                )}
              </div>
              <span className="shrink-0 font-headline font-bold text-base text-primary">{formatCurrency(product.price)}</span>
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
            {product.points && product.points > 0 && (
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
      {product.image_url && (
        <div className="h-14 w-14 shrink-0 rounded-lg bg-surface-container-high overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-headline font-bold text-sm text-on-surface truncate">{product.name}</h3>
        <p className="font-headline font-bold text-primary">{formatCurrency(product.price)}</p>
        {product.points && product.points > 0 && (
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
