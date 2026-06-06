'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface ProductMobileCardProps {
  id: string
  name: string
  price: number
  category: string
  isActive: boolean
}

export function ProductMobileCard({ id, name, price, category, isActive }: ProductMobileCardProps) {
  return (
    <Link
      href={`/products/${id}/edit`}
      className="flex w-full items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 transition-colors hover:bg-surface-container-high active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest text-lg font-headline font-bold text-on-surface-variant">
        {name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="truncate font-label font-bold text-on-surface">{name}</p>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider',
              isActive
                ? 'bg-primary/20 text-primary'
                : 'bg-surface-container-high text-on-surface-variant',
            )}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-sm text-on-surface-variant">
          <span className="font-label font-bold text-on-surface">{formatCurrency(price)}</span>
          {category && (
            <>
              <span className="text-outline-variant">·</span>
              <span>{category}</span>
            </>
          )}
        </div>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant" />
    </Link>
  )
}
