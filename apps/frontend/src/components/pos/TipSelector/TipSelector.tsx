'use client'

import { useState } from 'react'
import { HandCoins } from 'lucide-react'
import { round2 } from '@ultimate-pos/shared'
import { formatCurrency, cn } from '@/lib/utils'

const DEFAULT_PRESETS = [10, 15, 18, 20]

export interface TipSelectorProps {
  tip: number
  base: number
  onChange: (tip: number) => void
  label?: string
  presets?: number[]
  allowCustom?: boolean
  maxPercent?: number
  className?: string
}

export function TipSelector({
  tip,
  base,
  onChange,
  label = 'Tip',
  presets = DEFAULT_PRESETS,
  allowCustom = false,
  maxPercent = 100,
  className,
}: TipSelectorProps) {
  const [customOpen, setCustomOpen] = useState(false)

  const cleanBase = Math.max(0, base)
  const maxTip = round2(cleanBase * Math.max(0, maxPercent) / 100)
  const validPresets = presets.filter((p) => p > 0 && p <= Math.max(0, maxPercent))
  const selectedPercent = cleanBase > 0 && tip > 0 ? Math.round((tip / cleanBase) * 100) : 0

  const applyPercent = (pct: number) => {
    onChange(round2(Math.min(cleanBase * pct / 100, maxTip)))
  }

  return (
    <div className={cn('rounded-xl bg-surface-container/40 border border-outline-variant/60 p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
          <HandCoins className="h-3.5 w-3.5" />
          {label}
        </span>
        {tip > 0 && (
          <span className="font-headline font-bold text-sm text-primary">{formatCurrency(tip)}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { onChange(0); setCustomOpen(false) }}
          className={cn(
            'rounded-lg border px-3 py-2 text-xs font-label font-bold transition-colors',
            tip === 0
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-outline-variant text-on-surface-variant hover:border-on-surface-variant',
          )}
        >
          No tip
        </button>

        {validPresets.map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => { applyPercent(pct); setCustomOpen(false) }}
            className={cn(
              'rounded-lg border px-3 py-2 text-xs font-label font-bold transition-colors',
              tip > 0 && selectedPercent === pct
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant text-on-surface-variant hover:border-on-surface-variant',
            )}
          >
            {pct}%
          </button>
        ))}

        {allowCustom && (
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            className={cn(
              'rounded-lg border px-3 py-2 text-xs font-label font-bold transition-colors',
              customOpen
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant text-on-surface-variant hover:border-on-surface-variant',
            )}
          >
            Custom
          </button>
        )}
      </div>

      {(customOpen || (!validPresets.length && allowCustom)) && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-sm">$</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            value={tip || ''}
            onChange={(e) => {
              const raw = parseFloat(e.target.value) || 0
              onChange(round2(Math.max(0, Math.min(raw, maxTip))))
            }}
            placeholder="0.00"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-high py-2.5 pl-7 pr-3 text-sm font-headline font-bold text-on-surface placeholder:text-on-surface-variant/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
      )}
    </div>
  )
}
