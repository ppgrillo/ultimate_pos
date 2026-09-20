'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { MARGIN_PRESETS, type SimulationParams } from '@/lib/simulaciones/calculations'
import { TrendingUp, Percent } from 'lucide-react'

export interface EventParamsProps {
  params: SimulationParams
  onChange: (patch: Partial<SimulationParams>) => void
  estimatedCount: number
  avgMarginPercent: number | null
  realCostCount: number
}

function marginSelectValue(marginPercent: number, avgMarginPercent: number | null): string {
  if (avgMarginPercent != null && Math.round(marginPercent) === avgMarginPercent) return 'average'
  if (MARGIN_PRESETS.includes(marginPercent)) return String(marginPercent)
  return 'custom'
}

export function EventParams({
  params,
  onChange,
  estimatedCount,
  avgMarginPercent,
  realCostCount,
}: EventParamsProps) {
  const setEventCost = (value: number) => onChange({ eventCost: Math.max(0, value) })

  const avg = avgMarginPercent
  const selectValue = marginSelectValue(params.marginPercent, avg)

  const handleMarginChange = (value: string) => {
    if (value === 'average' && avg != null) onChange({ marginPercent: avg })
    else if (value !== 'custom') onChange({ marginPercent: Number(value) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Event parameters
        </CardTitle>
        <CardDescription>
          Set what the event costs you. Everything updates in real time.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Input
            id="event-cost"
            label="Event cost (fee)"
            type="number"
            min={0}
            step={1000}
            value={params.eventCost}
            onChange={(e) => setEventCost(Number(e.target.value || 0))}
            aria-describedby="event-cost-hint"
          />
          <p id="event-cost-hint" className="text-[11px] text-on-surface-variant/60">
            How much the booth / bazar spot costs you.
          </p>
        </div>

        <div className="space-y-2">
          <Input
            id="extra-expenses"
            label="Extra expenses"
            type="number"
            min={0}
            step={100}
            value={params.extraExpenses}
            onChange={(e) => onChange({ extraExpenses: Math.max(0, Number(e.target.value || 0)) })}
          />
          <p className="text-[11px] text-on-surface-variant/60">
            Transport, packaging, helpers, card fees, waste.
          </p>
        </div>

        <div className="space-y-2 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            <span className="text-sm font-label font-bold text-on-surface-variant">Profit margins</span>
          </div>

          {avg != null ? (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-on-surface">
              Your average: <span className="font-label font-bold text-primary">{avg}%</span>{' '}
              <span className="text-on-surface-variant/80">— from {realCostCount} product{realCostCount !== 1 ? 's' : ''} with a recorded cost.</span>
            </p>
          ) : (
            <p className="rounded-lg bg-surface-container-high px-3 py-2 text-xs text-on-surface-variant/80">
              No product has a recorded cost yet — pick a margin to estimate them all.
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="estimate-margin" className="text-[11px] font-label font-bold text-on-surface-variant">
              Estimate costs at
            </label>
            <Select value={selectValue} onValueChange={handleMarginChange}>
              <SelectTrigger id="estimate-margin" aria-label="Estimate costs at" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {avg != null && (
                  <SelectItem value="average">My average ({avg}%)</SelectItem>
                )}
                {MARGIN_PRESETS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}%
                  </SelectItem>
                ))}
                {selectValue === 'custom' && (
                  <SelectItem value="custom" disabled>
                    Custom ({params.marginPercent}%)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {estimatedCount > 0 ? (
            <p className="text-[11px] text-on-surface-variant/60">
              {estimatedCount} product{estimatedCount !== 1 ? 's' : ''} without a recorded cost — estimated at the margin you pick.
            </p>
          ) : (
            <p className="text-[11px] text-on-surface-variant/60">
              All products have a real cost — the margin only affects products without one.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}