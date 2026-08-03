'use client'

import { useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  className?: string
}

const fieldClass = cn(
  'h-10 w-full rounded-lg border bg-surface-container px-3 py-2 text-sm text-on-body placeholder:text-on-surface-variant/50',
  'backdrop-blur-glass transition-colors [color-scheme:dark]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
  'border-outline-variant',
)

export function DateField({ label, value, onChange, className }: DateFieldProps) {
  const id = useId()

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-label font-bold text-on-surface-variant">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="date"
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Clear"
            aria-label={`Clear ${label ?? 'date'}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
