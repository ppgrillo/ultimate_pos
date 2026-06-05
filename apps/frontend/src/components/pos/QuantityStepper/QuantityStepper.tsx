'use client'

import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
}

export function QuantityStepper({ value, onChange, min = 0, max = 99, size = 'sm' }: QuantityStepperProps) {
  const btnSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const textSize = size === 'sm' ? 'text-sm' : 'text-lg'

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={`flex ${btnSize} items-center justify-center rounded-md border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className={`font-headline font-bold ${textSize} text-on-surface w-6 sm:w-8 text-center`}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={`flex ${btnSize} items-center justify-center rounded-md border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
