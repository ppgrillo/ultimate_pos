'use client'

import { Minus, Plus } from 'lucide-react'
import { formatQuantity, snapToStep } from '@ultimate-pos/shared'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
  step?: number
  unit?: string | null
}

export function QuantityStepper({ value, onChange, min = 0, max = 99, size = 'sm', step = 1, unit = null }: QuantityStepperProps) {
  const btnSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const textSize = size === 'sm' ? 'text-sm' : 'text-lg'
  const isFractional = step !== 1

  const clamp = (next: number) => Math.min(max, Math.max(min, snapToStep(next, step)))

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className={`flex ${btnSize} items-center justify-center rounded-md border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
      >
        <Minus className="h-3 w-3" />
      </button>
      <span
        className={`font-headline font-bold ${textSize} text-on-surface text-center whitespace-nowrap ${
          isFractional ? 'min-w-[3.5rem] px-0.5' : 'w-6 sm:w-8'
        }`}
      >
        {isFractional ? formatQuantity(value, unit) : value}
      </span>
      <button
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className={`flex ${btnSize} items-center justify-center rounded-md border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
