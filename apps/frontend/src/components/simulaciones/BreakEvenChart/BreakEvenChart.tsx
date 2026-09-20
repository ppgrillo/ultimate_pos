'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { niceMaxUnits, type Catalog } from '@/lib/simulaciones/calculations'

export interface BreakEvenChartProps {
  catalog: Catalog
  totalCosts: number
  breakEvenUnits: number | null
  recommendedUnits: number | null
  currency: string
}

const PRIMARY = '#ccff00'
const COST_COLOR = '#94a3b8'
const FIXED_COLOR = '#f87171'
const RECOMMENDED_COLOR = '#fbbf24'
const POINT_COUNT = 25

const formatUnits = (n: number): string => n.toLocaleString('en-US')
const round2 = (n: number): number => Math.round(n * 100) / 100

const compact = (n: number): string => {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return String(n)
}

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = (Math.PI / 5) * i - Math.PI / 2
    pts.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function StarDot(props: { cx?: number; cy?: number }) {
  const { cx = 0, cy = 0 } = props
  return (
    <polygon points={starPoints(cx, cy, 7, 3)} fill={RECOMMENDED_COLOR} stroke="#0d0d0d" strokeWidth={1} />
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
  breakEvenUnits,
  recommendedUnits,
}: {
  active?: boolean
  payload?: { dataKey?: string | number; value?: number | string; stroke?: string }[]
  label?: number
  currency: string
  breakEvenUnits?: number | null
  recommendedUnits?: number | null
}) {
  if (!active || !payload?.length) return null

  const units = Number(label ?? 0)
  let note: string | null = null
  if (units === breakEvenUnits) note = 'Break-even — the event is paid for.'
  else if (units === recommendedUnits) note = '3× target — gross profit = 3× your fee.'

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-label font-bold text-on-surface">{formatUnits(units)} units</p>
      {payload.map((item) => (
        <p key={String(item.dataKey)} className="flex justify-between gap-4 text-on-surface-variant">
          <span>{item.dataKey === 'revenue' ? 'Revenue' : 'Total cost'}</span>
          <span className="font-bold" style={{ color: item.stroke }}>
            {formatCurrency(Number(item.value ?? 0), currency)}
          </span>
        </p>
      ))}
      {note && (
        <p className="mt-1 border-t border-outline-variant/30 pt-1 font-label font-bold text-primary">
          {note}
        </p>
      )}
    </div>
  )
}

export function BreakEvenChart({
  catalog,
  totalCosts,
  breakEvenUnits,
  recommendedUnits,
  currency,
}: BreakEvenChartProps) {
  const { points, maxUnits, yMax } = useMemo(() => {
    const max = niceMaxUnits(breakEvenUnits, recommendedUnits)
    const pts = Array.from({ length: POINT_COUNT }, (_, i) => {
      const units = Math.round(max * (i / (POINT_COUNT - 1)))
      return {
        units,
        revenue: round2(units * catalog.avgPrice),
        totalCost: round2(totalCosts + units * catalog.avgCost),
      }
    })

    for (const x of [breakEvenUnits, recommendedUnits]) {
      if (x == null || x < 0 || x > max) continue
      const units = Math.round(x)
      if (pts.some((p) => p.units === units)) continue
      pts.push({
        units,
        revenue: round2(units * catalog.avgPrice),
        totalCost: round2(totalCosts + units * catalog.avgCost),
      })
    }
    pts.sort((a, b) => a.units - b.units)

    const y = Math.max(catalog.avgPrice, catalog.avgCost) * max + totalCosts
    return { points: pts, maxUnits: max, yMax: y || 1 }
  }, [catalog.avgPrice, catalog.avgCost, totalCosts, breakEvenUnits, recommendedUnits])

  const showable = catalog.count > 0 && totalCosts > 0 && catalog.avgContribution > 0
  const dotRevenue = breakEvenUnits != null ? round2(breakEvenUnits * catalog.avgPrice) : 0
  const recRevenue = recommendedUnits != null ? round2(recommendedUnits * catalog.avgPrice) : 0

  if (!showable) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-outline-variant/50 bg-surface-container/30 text-sm text-on-surface-variant/70">
        Add a positive fee and sellable margins to draw the break-even curve.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="h-[300px] w-full sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 320 }}>
          <LineChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis
              dataKey="units"
              type="number"
              domain={[0, maxUnits]}
              tick={{ fontSize: 10, fill: '#9e9e9e' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={compact}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 10, fill: '#9e9e9e' }}
              tickLine={false}
              axisLine={false}
              width={54}
              tickFormatter={compact}
            />
            <Tooltip
              content={
                <ChartTooltip
                  currency={currency}
                  breakEvenUnits={breakEvenUnits}
                  recommendedUnits={recommendedUnits}
                />
              }
            />
            <ReferenceLine y={totalCosts} stroke={FIXED_COLOR} strokeDasharray="7 4" strokeWidth={1.5} />
            {breakEvenUnits != null && (
              <>
                <ReferenceLine
                  x={breakEvenUnits}
                  stroke={PRIMARY}
                  strokeOpacity={0.35}
                  strokeDasharray="4 4"
                />
                <ReferenceDot
                  x={breakEvenUnits}
                  y={dotRevenue}
                  r={4.5}
                  fill={PRIMARY}
                  stroke="#0d0d0d"
                  strokeWidth={2}
                />
              </>
            )}
            {recommendedUnits != null && (
              <>
                <ReferenceLine
                  x={recommendedUnits}
                  stroke={RECOMMENDED_COLOR}
                  strokeOpacity={0.3}
                  strokeDasharray="4 4"
                />
                <ReferenceDot
                  x={recommendedUnits}
                  y={recRevenue}
                  shape={<StarDot />}
                  stroke="#0d0d0d"
                  strokeWidth={1}
                />
              </>
            )}
            <Line type="monotone" dataKey="totalCost" stroke={COST_COLOR} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="revenue" stroke={PRIMARY} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-full" style={{ backgroundColor: PRIMARY }} />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-full" style={{ backgroundColor: COST_COLOR }} />
          Costs (fee + goods)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: FIXED_COLOR }} />
          Your fee
        </span>
        {breakEvenUnits != null && (
          <span className="flex items-center gap-1.5 font-label font-bold text-primary">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIMARY }} />
            Break-even: {formatUnits(breakEvenUnits)} units
          </span>
        )}
        {recommendedUnits != null && (
          <span className="flex items-center gap-1.5 font-label font-bold" style={{ color: RECOMMENDED_COLOR }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: RECOMMENDED_COLOR }} />
            3× target: {formatUnits(recommendedUnits)} units
          </span>
        )}
      </div>
    </div>
  )
}