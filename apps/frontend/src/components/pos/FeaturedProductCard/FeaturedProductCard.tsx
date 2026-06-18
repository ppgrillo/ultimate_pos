'use client'

import { useState } from 'react'
import { Bolt } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ExpandableText } from '@/components/ui'
import type { Product } from '@ultimate-pos/shared'

interface FeaturedProductCardProps {
  product: Product
  onQuickBuy: (product: Product) => void
}

export function FeaturedProductCard({ product, onQuickBuy }: FeaturedProductCardProps) {
  const [imgError, setImgError] = useState(false)
  const showImg = product.image_url && !imgError

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-surface-container/50 to-surface-container border border-primary/30">
      <div className="absolute top-3 left-3 z-10">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-label font-bold text-primary-on uppercase tracking-wider">
          <Bolt className="h-3 w-3" />
          Season Launch
        </span>
      </div>
      <div className="flex flex-col sm:flex-row">
        {showImg && (
          <div className="sm:w-48 h-40 sm:h-auto bg-surface-container-high overflow-hidden shrink-0">
            <img
              src={product.image_url ?? undefined}
              alt={product.name}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        )}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex-1">
            <h3 className="font-headline font-bold text-base text-on-surface">{product.name}</h3>
            {product.description && (
              <ExpandableText text={product.description} className="mt-1 text-xs text-on-surface-variant" />
            )}
          </div>
          <div className="mt-auto pt-3 flex items-center justify-between">
            <span className="font-headline font-bold text-xl text-primary">{formatCurrency(product.price)}</span>
            <button
              onClick={() => onQuickBuy(product)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-label font-bold text-primary-on hover:bg-primary/90 transition-colors"
            >
              <Bolt className="h-4 w-4" />
              Quick Buy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
