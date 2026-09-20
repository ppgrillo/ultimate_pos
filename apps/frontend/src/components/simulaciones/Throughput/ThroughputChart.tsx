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

export interface ThroughputChartProps {
  targetUnits: number
  capableUnitsPerHour: number | null
  durationHours: number
  hoursToGoal: number | null
}

const PRIMARY = '#ccff00'
const TARGET_COLOR = '#fbbf24'
const TIME_COLOR = '#94a3b8'
const POINT_COUNT = 21

const formatUnits = (n: number): string => n.toLocaleString('en-US')
const round2 = (n: number): number => Math.round(n * 100) / 100

const compact = (n: number): string => {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return String(n)
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value?: number | string }[]
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-label font-bold text-on-surface">{Number(label ?? 0).toFixed(1)} h into the event</p>
      <p className="flex justify-between gap-4 text-on-surface-variant">
        <span>Units sold</span>
        <span className="font-bold" style={{ color: PRIMARY }}>
          {formatUnits(Math.round(Number(payload[0].value ?? 0)))}
        </span>
      </p>
    </div>
  )
}

export function ThroughputChart({
  targetUnits,
  capableUnitsPerHour,
  durationHours,
  hoursToGoal,
}: ThroughputChartProps) {
  const { points, xMax, yMax } = useMemo(() => {
    const cap = capableUnitsPerHour ?? 0
    const x = Math.max(durationHours, hoursToGoal ?? 0, 1) * 1.1
    const pts = Array.from({ length: POINT_COUNT }, (_, i) => {
      const hours = round2(x * (i / (POINT_COUNT - 1)))
      return { hours, units: round2(cap * hours) }
    })

    for (const h of [durationHours, hoursToGoal]) {
      if (h == null || h < 0 || h > x) continue
      const hours = round2(h)
      if (pts.some((p) => p.hours === hours)) continue
      pts.push({ hours, units: round2(cap * hours) })
    }
    pts.sort((a, b) => a.hours - b.hours)

    const y = Math.max(targetUnits, cap * x) || 1
    return { points: pts, xMax: x, yMax: y * 1.1 }
  }, [targetUnits, capableUnitsPerHour, durationHours, hoursToGoal])

  if (capableUnitsPerHour == null || capableUnitsPerHour <= 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-outline-variant/50 bg-surface-container/30 px-4 text-center text-sm text-on-surface-variant/70">
        Add at least one person and an average time per sale to draw your selling pace.
      </div>
    )
  }

  const reaches = hoursToGoal != null && durationHours > 0 && hoursToGoal <= durationHours

  return (
    <div className="space-y-3">
      <div className="h-[280px] w-full sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 300 }}>
          <LineChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis
              dataKey="hours"
              type="number"
              domain={[0, xMax]}
              tick={{ fontSize: 10, fill: '#9e9e9e' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}h`}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 10, fill: '#9e9e9e' }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={compact}
            />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine
              y={targetUnits}
              stroke={TARGET_COLOR}
              strokeDasharray="6 4"
              strokeWidth={1.5}
            />
            {durationHours > 0 && (
              <ReferenceLine x={durationHours} stroke={TIME_COLOR} strokeDasharray="7 4" strokeWidth={1.5} />
            )}
            {hoursToGoal != null && (
              <ReferenceDot
                x={hoursToGoal}
                y={targetUnits}
                r={4.5}
                fill={reaches ? PRIMARY : TARGET_COLOR}
                stroke="#0d0d0d"
                strokeWidth={2}
              />
            )}
            <Line type="monotone" dataKey="units" stroke={PRIMARY} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-on-surface-variant">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-full" style={{ backgroundColor: PRIMARY }} />
          Units sold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: TARGET_COLOR }} />
          Goal: {formatUnits(targetUnits)} units
        </span>
        {durationHours > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: TIME_COLOR }} />
            Event ends: {durationHours} h
          </span>
        )}
        {hoursToGoal != null && (
          <span
            className="flex items-center gap-1.5 font-label font-bold"
            style={{ color: reaches ? PRIMARY : TARGET_COLOR }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: reaches ? PRIMARY : TARGET_COLOR }} />
            Goal reached at {hoursToGoal.toFixed(1)} h
          </span>
        )}
      </div>
    </div>
  )
}
