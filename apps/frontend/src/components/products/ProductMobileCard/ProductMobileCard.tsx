'use client'

import { cn, formatCurrency } from '@/lib/utils'

interface ProductMobileCardProps {
  id: string
  name: string
  price: number
  category: string
  isActive: boolean
  selected?: boolean
  onToggle?: (id: string) => void
  selectionMode?: boolean
}

export function ProductMobileCard({
  id, name, price, category, isActive,
  selected, onToggle, selectionMode,
}: ProductMobileCardProps) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4 transition-colors',
        selectionMode
          ? selected
            ? 'border-primary bg-primary/5'
            : 'hover:bg-surface-container-high'
          : 'hover:bg-surface-container-high active:scale-[0.98]',
      )}
      onClick={() => onToggle?.(id)}
    >
      <input
        type="checkbox"
        checked={!!selected}
        onChange={() => onToggle?.(id)}
        onClick={(e) => e.stopPropagation()}
        className="h-5 w-5 shrink-0 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
      />

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
    </div>
  )
}
