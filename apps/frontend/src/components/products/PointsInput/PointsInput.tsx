'use client'

import { cn } from '@/lib/utils'

interface PointsInputProps {
  value: number | null
  onChange: (value: number | null) => void
  className?: string
}

export function PointsInput({ value, onChange, className }: PointsInputProps) {
  return (
    <div className={cn('flex items-center justify-between rounded-xl bg-surface-container/50 border border-outline-variant p-5', className)}>
      <div className="flex-1">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
          Points per Sale
        </label>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold font-headline text-primary">⭐</span>
          <input
            type="number"
            min={0}
            value={value ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onChange(v ? parseInt(v, 10) : null)
            }}
            placeholder="0"
            className="w-24 bg-transparent border-none p-0 text-2xl font-extrabold font-headline text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
          />
        </div>
      </div>
      <span className="rounded-full bg-secondary-container/20 px-4 py-1.5 text-xs font-bold font-headline text-secondary uppercase tracking-tight">
        Points
      </span>
    </div>
  )
}
