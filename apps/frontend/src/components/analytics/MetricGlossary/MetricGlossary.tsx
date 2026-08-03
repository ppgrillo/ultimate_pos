'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { cn, formatCurrency } from '@/lib/utils'
import type { AnalyticsOverview } from '@/store/api'

interface MetricGlossaryProps {
  overview: AnalyticsOverview | undefined
  taxLabel?: string
  taxInclusive?: boolean
}

interface Term {
  key: string
  name: string
  value: string
  formula: string
  description: string
  highlight?: boolean
}

export function MetricGlossary({ overview, taxLabel = 'Tax', taxInclusive = false }: MetricGlossaryProps) {
  const [expanded, setExpanded] = useState(false)
  if (!overview) return null

  const terms: Term[] = [
    {
      key: 'revenue',
      name: 'Revenue',
      value: formatCurrency(overview.revenue),
      formula: 'Σ orders.total',
      description: 'Money actually collected this period, after all discounts. Includes tax.',
    },
    {
      key: 'gross-sales',
      name: 'Gross Sales',
      value: formatCurrency(overview.grossSales),
      formula: 'Σ orders.subtotal',
      description: 'Sum of item prices before discounts and tax — the "raw" value of what was sold.',
    },
    {
      key: 'discounts',
      name: 'Discounts',
      value: formatCurrency(overview.discounts),
      formula: 'Σ manual + promo + loyalty',
      description: 'Every reduction given to customers: manual, promotion and loyalty rewards.',
    },
    {
      key: 'tax',
      name: taxLabel,
      value: formatCurrency(overview.taxCollected),
      formula: 'Σ orders.tax',
      description: `Tax charged on sales this period (${taxInclusive ? 'already included in prices' : 'added on top of prices'}).`,
    },
    {
      key: 'items',
      name: 'Items Sold',
      value: String(overview.itemsSold),
      formula: 'Σ quantity',
      description: 'Total units sold, including items without a registered product.',
    },
    {
      key: 'cogs',
      name: 'COGS',
      value: formatCurrency(overview.cogs),
      formula: 'Σ units × product cost',
      description: 'Cost of Goods Sold — what the products you sold cost you. Items without a cost are not counted.',
    },
    {
      key: 'gross-profit',
      name: 'Gross Profit',
      value: formatCurrency(overview.grossProfit),
      formula: 'Revenue − COGS',
      description: 'Revenue left after covering product costs. Does not subtract discounts or expenses.',
      highlight: true,
    },
    {
      key: 'net-profit',
      name: 'Net Profit',
      value: formatCurrency(overview.netProfit),
      formula: 'Gross Profit − expenses',
      description: 'What remains after every cost. Operating expenses are not tracked yet, so this equals Gross Profit.',
      highlight: true,
    },
    {
      key: 'avg-ticket',
      name: 'Avg Ticket',
      value: formatCurrency(overview.avgOrderValue),
      formula: 'Revenue ÷ Orders',
      description: 'Average revenue per order — how much each customer tends to spend.',
    },
  ]

  const reconciliationFormula = taxInclusive
    ? 'Revenue = Gross Sales − Discounts'
    : 'Revenue = Gross Sales + Tax − Discounts'

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container/50">
      <CollapsibleSection
        title="Metric definitions"
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        badge={String(terms.length)}
        icon={<Info className="h-3.5 w-3.5" />}
        className="border-b-0"
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {terms.map((term) => (
            <div
              key={term.key}
              className={cn(
                'rounded-lg border border-outline-variant/20 bg-surface-container/40 px-3 py-2.5',
                term.highlight && 'border-l-2 border-l-primary',
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold text-on-surface">{term.name}</span>
                <span className="whitespace-nowrap font-mono text-sm tabular-nums text-on-surface">{term.value}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] leading-none text-primary">{term.formula}</p>
              <p className="mt-1.5 text-xs leading-snug text-on-surface-variant">{term.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-center">
          <p className="font-mono text-xs text-primary">{reconciliationFormula}</p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant">How the top-line number connects to the rest of the page.</p>
        </div>
      </CollapsibleSection>
    </div>
  )
}
