'use client'

import { cn } from '@/lib/utils'
import type { ProductCategory } from '@ultimate-pos/shared'

interface CategoryChipsProps {
  categories: ProductCategory[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function CategoryChips({ categories, selectedId, onSelect }: CategoryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'shrink-0 rounded-full px-4 py-1.5 text-xs font-label font-bold transition-all whitespace-nowrap',
          selectedId === null
            ? 'bg-primary text-primary-on'
            : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface',
        )}
      >
        All Items
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-xs font-label font-bold transition-all whitespace-nowrap',
            selectedId === cat.id
              ? 'bg-primary text-primary-on'
              : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface',
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
