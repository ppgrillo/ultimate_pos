'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
}

interface CategoryChipsProps {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onAdd?: () => void
  className?: string
}

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
  onAdd,
  className,
}: CategoryChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {categories.length === 0 && !onAdd && (
        <p className="text-xs text-on-surface-variant italic">No categories available</p>
      )}
      {categories.map((cat) => {
        const isSelected = selectedId === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(isSelected ? null : cat.id)}
            className={cn(
              'rounded-full border px-4 py-1 text-xs font-bold font-headline transition-all',
              isSelected
                ? 'border-primary bg-primary text-primary-on shadow-[0_0_10px_rgba(204,255,0,0.4)]'
                : 'border-outline-variant text-on-surface-variant hover:border-primary/50',
            )}
          >
            {cat.name}
          </button>
        )
      })}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-full border border-dashed border-outline-variant px-3 py-1 text-xs font-bold font-headline text-on-surface-variant transition-all hover:border-primary hover:text-primary"
        >
          <Plus className="h-3 w-3" />
          New
        </button>
      )}
    </div>
  )
}
