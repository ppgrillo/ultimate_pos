'use client'

import { useMemo } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { ResultTile } from '@/components/simulaciones/ResultTile'
import {
  MARGIN_PRESETS,
  RECOMMENDED_FEE_MULTIPLE,
  buildScenario,
  type Catalog,
  type SimulationParams,
} from '@/lib/simulaciones/calculations'
import {
  DollarSign,
  PackageOpen,
  Coins,
  CalendarX,
  TrendingDown,
  Scale,
  ChevronDown,
  Table,
} from 'lucide-react'

export interface WhatIfAnalysisProps {
  catalog: Catalog
  params: SimulationParams
  currency: string
  onChange: (patch: Partial<SimulationParams>) => void
}

const PRESETS = [10, 20, 50, 100, 500, 1000]

const formatUnits = (n: number): string => n.toLocaleString('en-US')

export function WhatIfAnalysis({ catalog, params, currency, onChange }: WhatIfAnalysisProps) {
  const units = params.whatIfUnits

  const estimatedItems = catalog.items.filter((i) => !i.hasRealCost)

  const setProductMargin = (productId: string, value: string) => {
    if (value === 'catalog') {
      const next = { ...params.productMargins }
      delete next[productId]
      onChange({ productMargins: next })
      return
    }
    const margin = Number(value)
    if (MARGIN_PRESETS.includes(margin)) {
      onChange({ productMargins: { ...params.productMargins, [productId]: margin } })
    }
  }

  const scenario = useMemo(
    () =>
      buildScenario(catalog, {
        units,
        eventCost: params.eventCost,
        extraExpenses: params.extraExpenses,
      }),
    [catalog, units, params.eventCost, params.extraExpenses],
  )

  const multiple = scenario.feeMultiple ?? 0
  const meterWidth = Math.min(100, (multiple / RECOMMENDED_FEE_MULTIPLE) * 100)
  const atBenchmark = multiple >= RECOMMENDED_FEE_MULTIPLE

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          What happens if…?
        </CardTitle>
        <CardDescription>
          Pick a sales volume for your catalog and see the full P&amp;L of the event.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Input
              id="what-if-units"
              label="Units to sell"
              type="number"
              min={0}
              step={1}
              value={units}
              onChange={(e) =>
                onChange({ whatIfUnits: Math.max(0, Math.floor(Number(e.target.value || 0))) })
              }
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ whatIfUnits: preset })}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-[11px] font-label font-bold transition-colors',
                  units === preset
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40 hover:text-primary',
                )}
              >
                {formatUnits(preset)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <ResultTile label="Revenue" value={formatCurrency(scenario.revenue, currency)} icon={DollarSign} hint={`${formatUnits(scenario.units)} units`} />
          <ResultTile label="Cost of goods" value={formatCurrency(scenario.cogs, currency)} icon={PackageOpen} hint="Based on your product costs" />
          <ResultTile label="Gross profit" value={formatCurrency(scenario.grossProfit, currency)} icon={Coins} hint={`${(catalog.avgMargin * 100).toFixed(0)}% avg margin`} />
          <ResultTile label="Event cost" value={formatCurrency(scenario.totalCosts, currency)} icon={CalendarX} hint={`Fee ${formatCurrency(scenario.eventCost, currency)} + ${formatCurrency(scenario.extraExpenses, currency)} extras`} />
          <ResultTile
            label="Net result"
            value={formatCurrency(scenario.net, currency)}
            icon={scenario.profitable ? TrendingDown : undefined}
            tone={scenario.profitable ? 'positive' : 'negative'}
            hint={scenario.profitable ? 'After the event is paid for' : 'Below the event cost'}
          />
          <ResultTile
            label="Fee multiple"
            value={scenario.feeMultiple != null ? `${scenario.feeMultiple.toFixed(1)}×` : '—'}
            icon={Scale}
            tone={atBenchmark ? 'positive' : 'neutral'}
            hint={`Benchmark ${RECOMMENDED_FEE_MULTIPLE}×`}
          />
        </div>

        <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-label font-bold text-on-surface-variant">
            <span>Gross profit vs recommended benchmark</span>
            <span className={atBenchmark ? 'text-primary' : 'text-error'}>
              {multiple.toFixed(1)}× of your fee
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className={cn('h-full rounded-full transition-all', atBenchmark ? 'bg-primary' : 'bg-error/70')}
              style={{ width: `${meterWidth}%` }}
            />
          </div>
          <p className="text-[11px] text-on-surface-variant/60">
            Bazar rule of thumb (El Economista): aim to earn at least {RECOMMENDED_FEE_MULTIPLE}× your fee in gross profit.
          </p>
          <details className="group mt-1">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-label font-bold text-primary hover:underline">
              Why {RECOMMENDED_FEE_MULTIPLE}×?
              <ChevronDown className="h-3 w-3 text-primary transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-1.5 text-[11px] leading-relaxed text-on-surface-variant/70">
              Your booth fee is fixed whether you sell or not. Earning {RECOMMENDED_FEE_MULTIPLE}× your fee in gross profit
              means 1× pays the event and the other 2× are your real profit — a cushion for products you don’t sell,
              damaged goods, discounts and surprises. It’s a rule of thumb, not a guarantee.
            </p>
          </details>
        </div>

        <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4">
          <p className="text-[11px] font-label font-bold text-on-surface-variant uppercase tracking-wider mb-3">Your fee</p>
          <p className={cn('font-headline text-xl font-bold', scenario.profitable ? 'text-primary' : 'text-error')}>
            {formatCurrency(scenario.net, currency)}
          </p>
          <p className="text-[11px] text-on-surface-variant/60 mt-1">
            Net at {formatUnits(scenario.units)} units · break-even at {scenario.breakEvenUnits != null ? formatUnits(scenario.breakEvenUnits) : '—'} units
          </p>
        </div>

        <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 text-[11px] text-on-surface-variant/60 space-y-1">
          <p>
            <span className="font-label font-bold text-on-surface-variant">Inventory needed:</span>{' '}
            {formatCurrency(scenario.inventoryCost, currency)} in goods to stock {formatUnits(scenario.units)} units.
          </p>
          {scenario.shortfallUnits > 0 && catalog.totalStock != null ? (
            <p>
              <span className="font-label font-bold text-error">Stock shortfall:</span> you have {formatUnits(catalog.totalStock)} units on
              hand — you’ll need to buy {formatUnits(scenario.shortfallUnits)} more ({formatCurrency(scenario.shortfallCost, currency)}).
            </p>
          ) : (
            catalog.totalStock != null && (
              <p>
                Your current stock ({formatUnits(catalog.totalStock)} units){' '}
                {scenario.units <= catalog.totalStock ? 'covers this volume.' : 'does not cover this volume.'}
              </p>
            )
          )}
        </div>
      <details className="group rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-label font-bold text-on-surface">
            <span className="flex items-center gap-2">
              <Table className="h-4 w-4 text-primary" />
              What this simulation is built from
            </span>
            <ChevronDown className="h-4 w-4 text-on-surface-variant transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2">Price</th>
                  <th className="py-2 pr-2">Cost</th>
                  <th className="py-2 pr-2">Margin</th>
                  <th className="py-2">Profit / unit</th>
                </tr>
              </thead>
              <tbody>
                {catalog.items.map((item) => (
                  <tr key={item.id} className="border-t border-outline-variant/20">
                    <td className="py-2 pr-2">
                      <span className="font-label font-bold text-on-surface">{item.name}</span>
                      {!item.hasRealCost && (
                        <span className="ml-1 rounded bg-primary/10 px-1 py-0.5 text-[10px] font-label font-bold text-primary">
                          estimated
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-on-surface">{formatCurrency(item.price, currency)}</td>
                    <td className="py-2 pr-2 text-on-surface">{formatCurrency(item.cost, currency)}</td>
                    <td className="py-2 pr-2 text-on-surface">{(item.margin * 100).toFixed(0)}%</td>
                    <td className="py-2 font-label font-bold text-primary">
                      {formatCurrency(item.contribution, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {estimatedItems.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-on-surface-variant/70">
                {estimatedItems.length} product{estimatedItems.length !== 1 ? 's' : ''} without a recorded cost — set what
                each one is estimated at, or leave “Catalog” to use the margin selected in Event parameters.
              </p>
              {estimatedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/30 bg-surface-container/40 px-3 py-2"
                >
                  <span className="truncate text-xs text-on-surface">{item.name}</span>
                  <Select
                    value={String(params.productMargins[item.id] ?? 'catalog')}
                    onValueChange={(value) => setProductMargin(item.id, value)}
                  >
                    <SelectTrigger aria-label={`Estimated margin for ${item.name}`} className="h-8 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="catalog">Catalog ({params.marginPercent}%)</SelectItem>
                      {MARGIN_PRESETS.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-on-surface-variant/60">
            Every product with a recorded cost uses its real number. Products estimated at a margin never change your real
            costs.
          </p>
        </details>
      </CardContent>
    </Card>
  )
}