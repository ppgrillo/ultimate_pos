'use client'

import { useMemo } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { ResultTile } from '@/components/simulaciones/ResultTile'
import {
  RECOMMENDED_FEE_MULTIPLE,
  buildBreakEven,
  type Catalog,
  type SimulationParams,
} from '@/lib/simulaciones/calculations'
import { Star, Boxes, Target, Trophy } from 'lucide-react'

export interface BreakEvenAnalysisProps {
  catalog: Catalog
  params: SimulationParams
  currency: string
  onChange: (patch: Partial<SimulationParams>) => void
}

const formatUnits = (n: number): string => n.toLocaleString('en-US')

export function BreakEvenAnalysis({ catalog, params, currency, onChange }: BreakEvenAnalysisProps) {
  const sorted = useMemo(
    () => [...catalog.items].sort((a, b) => b.contribution - a.contribution),
    [catalog.items],
  )

  const selectedId = params.starProductId ?? sorted[0]?.id ?? null
  const result = useMemo(
    () =>
      buildBreakEven(catalog, selectedId, {
        eventCost: params.eventCost,
        extraExpenses: params.extraExpenses,
      }),
    [catalog, selectedId, params.eventCost, params.extraExpenses],
  )

  const product = result?.product ?? null
  const beUnits = result?.breakEvenUnits ?? null
  const recUnits = result?.unitsForRecommended ?? null

  const recMeterWidth =
    beUnits != null && recUnits != null ? Math.min(100, (beUnits / recUnits) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          What you need to sell
        </CardTitle>
        <CardDescription>
          Pick your star product and see exactly how many units make the event worth it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="w-full max-w-md">
          <Select
            value={selectedId ?? undefined}
            onValueChange={(value) => onChange({ starProductId: value })}
          >
            <SelectTrigger aria-label="Star product">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {sorted.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} · {formatCurrency(item.contribution, currency)} profit/unit
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-[11px] text-on-surface-variant/60">
            {result?.product.hasRealCost !== undefined && !result?.product.hasRealCost
              ? 'This product has no recorded cost — its cost is estimated at your margin.'
              : 'Sorted by profit contribution per unit.'}
          </p>
        </div>

        {product && beUnits != null ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <ResultTile
                label="Contribution / unit"
                value={formatCurrency(product.contribution, currency)}
                icon={Target}
                hint={`${(product.margin * 100).toFixed(0)}% margin · sells at ${formatCurrency(product.price, currency)}`}
              />
              <ResultTile
                label="Break-even units"
                value={formatUnits(beUnits)}
                icon={Boxes}
                hint={result?.breakEvenRevenue != null ? `≈ ${formatCurrency(result.breakEvenRevenue, currency)} in sales` : undefined}
                tone="positive"
              />
              <ResultTile
                label={`At ${RECOMMENDED_FEE_MULTIPLE}× your fee`}
                value={recUnits != null ? formatUnits(recUnits) : '—'}
                icon={Trophy}
                hint={result?.revenueForRecommended != null ? `≈ ${formatCurrency(result.revenueForRecommended, currency)} in sales` : undefined}
              />
            </div>

            <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-label font-bold text-on-surface-variant">
                <span>Break-even vs recommended target</span>
                <span className="text-primary">
                  {beUnits.toLocaleString('en-US')} / {recUnits != null ? recUnits.toLocaleString('en-US') : '—'}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${recMeterWidth}%` }} />
              </div>
              <p className="text-[11px] text-on-surface-variant/60">
                Sell {formatUnits(beUnits)} of <span className="font-label font-bold text-on-surface">{product.name}</span> and
                the event pays for itself. Reach {recUnits != null ? formatUnits(recUnits) : '—'} and you earn{' '}
                {RECOMMENDED_FEE_MULTIPLE}× your fee — the benchmark.
              </p>
            </div>
          </>
        ) : (
          <div className={cn('rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 text-sm text-on-surface-variant')}>
            {sorted.length === 0
              ? 'Add products with a price to run this analysis.'
              : 'This product has no positive margin at the current settings — try raising the profit margin or picking another product.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}