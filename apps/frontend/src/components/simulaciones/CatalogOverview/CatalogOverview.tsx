'use client'

import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { ResultTile } from '@/components/simulaciones/ResultTile'
import { BreakEvenChart } from '@/components/simulaciones/BreakEvenChart'
import { formatCurrency } from '@/lib/utils'
import {
  RECOMMENDED_FEE_MULTIPLE,
  unitsToCoverAmount,
  type Catalog,
  type SimulationParams,
} from '@/lib/simulaciones/calculations'
import { LineChart, Boxes, Trophy, Coins } from 'lucide-react'

export interface CatalogOverviewProps {
  catalog: Catalog
  params: SimulationParams
  currency: string
}

const formatUnits = (n: number): string => n.toLocaleString('en-US')

export function CatalogOverview({ catalog, params, currency }: CatalogOverviewProps) {
  const totalCosts = params.eventCost + params.extraExpenses

  const summary = useMemo(() => {
    const breakEvenUnits = unitsToCoverAmount(totalCosts, catalog.avgContribution)
    return {
      breakEvenUnits,
      breakEvenRevenue: breakEvenUnits != null ? breakEvenUnits * catalog.avgPrice : null,
      recommendedUnits: unitsToCoverAmount(
        RECOMMENDED_FEE_MULTIPLE * params.eventCost,
        catalog.avgContribution,
      ),
      recommendedRevenue:
        unitsToCoverAmount(RECOMMENDED_FEE_MULTIPLE * params.eventCost, catalog.avgContribution) != null
          ? unitsToCoverAmount(RECOMMENDED_FEE_MULTIPLE * params.eventCost, catalog.avgContribution)! * catalog.avgPrice
          : null,
    }
  }, [totalCosts, catalog.avgContribution, catalog.avgPrice, params.eventCost])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />
          Catalog overview
        </CardTitle>
        <CardDescription>
          Your whole catalog in one curve — read it left to right as units sold grow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ResultTile
            label="Break-even (whole catalog)"
            value={summary.breakEvenUnits != null ? `${formatUnits(summary.breakEvenUnits)} units` : '—'}
            icon={Boxes}
            hint={
              summary.breakEvenRevenue != null
                ? `≈ ${formatCurrency(summary.breakEvenRevenue, currency)} in sales · avg sale ${formatCurrency(catalog.avgPrice, currency)}`
                : undefined
            }
            tone={summary.breakEvenUnits != null ? 'positive' : 'negative'}
          />
          <ResultTile
            label={`Recommended ${RECOMMENDED_FEE_MULTIPLE}× your fee`}
            value={summary.recommendedUnits != null ? `${formatUnits(summary.recommendedUnits)} units` : '—'}
            icon={Trophy}
            hint={summary.recommendedRevenue != null ? `≈ ${formatCurrency(summary.recommendedRevenue, currency)} in sales` : undefined}
          />
          <ResultTile
            label="Avg contribution / unit"
            value={formatCurrency(catalog.avgContribution, currency)}
            icon={Coins}
            hint={`${(catalog.avgMargin * 100).toFixed(0)}% avg margin on ${formatUnits(catalog.count)} products`}
            tone={catalog.avgContribution > 0 ? 'positive' : 'negative'}
          />
        </div>

        <BreakEvenChart
          catalog={catalog}
          totalCosts={totalCosts}
          breakEvenUnits={summary.breakEvenUnits}
          recommendedUnits={summary.recommendedUnits}
          currency={currency}
        />

        <p className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-3 text-[12px] text-on-surface-variant">
          Read it left to right: every unit sold grows your revenue along the green line, while costs add
          goods on top of your flat fee (red). They cross at{' '}
          {summary.breakEvenUnits != null ? (
            <span className="font-label font-bold text-primary">{formatUnits(summary.breakEvenUnits)} units</span>
          ) : (
            '— units'
          )}{' '}
          — after that, the event has paid for itself.
        </p>
      </CardContent>
    </Card>
  )
}