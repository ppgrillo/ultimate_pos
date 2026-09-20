'use client'

import { useMemo } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ResultTile } from '@/components/simulaciones/ResultTile'
import { ThroughputChart } from './ThroughputChart'
import {
  CAPACITY_EFFICIENCY,
  DURATION_PRESETS,
  RECOMMENDED_FEE_MULTIPLE,
  SERVICE_PRESETS,
  buildCapacity,
  unitsToCoverAmount,
  type Catalog,
  type GoalMode,
  type SimulationParams,
} from '@/lib/simulaciones/calculations'
import { Clock, Users, Gauge, Activity, CheckCircle2, AlertTriangle } from 'lucide-react'

export interface ThroughputProps {
  catalog: Catalog
  params: SimulationParams
  currency: string
  onChange: (patch: Partial<SimulationParams>) => void
}

const GOAL_OPTIONS: { value: GoalMode; label: string }[] = [
  { value: 'breakEven', label: 'Break-even' },
  { value: 'recommended', label: `${RECOMMENDED_FEE_MULTIPLE}× target` },
  { value: 'whatIf', label: 'What-if volume' },
]

const formatUnits = (n: number): string => n.toLocaleString('en-US')
const formatRate = (n: number): string => `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}/h`

export function Throughput({ catalog, params, currency, onChange }: ThroughputProps) {
  const totalCosts = params.eventCost + params.extraExpenses

  const breakEvenUnits = unitsToCoverAmount(totalCosts, catalog.avgContribution)
  const recommendedUnits = unitsToCoverAmount(
    RECOMMENDED_FEE_MULTIPLE * params.eventCost,
    catalog.avgContribution,
  )

  const goalUnits =
    params.goalMode === 'recommended'
      ? recommendedUnits
      : params.goalMode === 'whatIf'
        ? params.whatIfUnits
        : breakEvenUnits

  const efficiency = params.efficiencyAdjusted ? CAPACITY_EFFICIENCY : 1

  const capacity = useMemo(
    () =>
      buildCapacity({
        targetUnits: goalUnits ?? 0,
        durationHours: params.eventDurationHours,
        staffCount: params.staffCount,
        serviceMinutesPerUnit: params.serviceMinutesPerUnit,
        efficiency,
      }),
    [goalUnits, params.eventDurationHours, params.staffCount, params.serviceMinutesPerUnit, efficiency],
  )

  const peopleLabel = `${formatUnits(capacity.staffCount)} ${capacity.staffCount === 1 ? 'person' : 'people'}`
  const hasGoal = goalUnits != null && goalUnits > 0
  const feasible = capacity.reachesGoal === true
  const shortfallHours =
    capacity.hoursToGoal != null && capacity.durationHours > 0
      ? Math.max(0, capacity.hoursToGoal - capacity.durationHours)
      : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Can you sell it in time?
        </CardTitle>
        <CardDescription>
          Set how long the event runs and how many people serve. See the pace you need and whether your
          team can keep up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Input
              id="event-hours"
              label="Event hours"
              type="number"
              min={0}
              step={1}
              value={params.eventDurationHours}
              onChange={(e) =>
                onChange({ eventDurationHours: Math.max(0, Number(e.target.value || 0)) })
              }
            />
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange({ eventDurationHours: preset })}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[11px] font-label font-bold transition-colors',
                    params.eventDurationHours === preset
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40 hover:text-primary',
                  )}
                >
                  {preset}h
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Input
              id="staff-count"
              label="People serving"
              type="number"
              min={0}
              step={1}
              value={params.staffCount}
              onChange={(e) => onChange({ staffCount: Math.max(0, Math.floor(Number(e.target.value || 0))) })}
            />
            <p className="text-[11px] text-on-surface-variant/60">
              How many people can take orders at once.
            </p>
          </div>

          <div className="space-y-2">
            <Input
              id="service-minutes"
              label="Minutes per sale"
              type="number"
              min={0}
              step={1}
              value={params.serviceMinutesPerUnit}
              onChange={(e) =>
                onChange({ serviceMinutesPerUnit: Math.max(0, Number(e.target.value || 0)) })
              }
            />
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange({ serviceMinutesPerUnit: preset })}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[11px] font-label font-bold transition-colors',
                    params.serviceMinutesPerUnit === preset
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40 hover:text-primary',
                  )}
                >
                  {preset} min
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4 transition-colors hover:bg-surface-container/60">
          <input
            type="checkbox"
            checked={params.efficiencyAdjusted}
            onChange={(e) => onChange({ efficiencyAdjusted: e.target.checked })}
            className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
          />
          <div>
            <span className="block text-sm font-bold text-on-surface">
              Real-world pace (−{Math.round((1 - CAPACITY_EFFICIENCY) * 100)}%)
            </span>
            <span className="mt-0.5 block text-xs text-on-surface-variant">
              Leaves room for breaks, chatting, wrapping and card payments. Uncheck for the perfect-theory
              number.
            </span>
          </div>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-label font-bold text-on-surface-variant uppercase tracking-wider">
            My goal
          </span>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ goalMode: option.value })}
                className={cn(
                  'rounded-md border px-3 py-1 text-xs font-label font-bold transition-colors',
                  params.goalMode === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40 hover:text-primary',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-on-surface-variant">
            Target:{' '}
            <span className="font-label font-bold text-on-surface">
              {hasGoal ? `${formatUnits(goalUnits!)} units` : '—'}
            </span>
          </span>
        </div>

        {hasGoal && capacity.capableUnitsPerHour != null ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ResultTile
                label="You need / hour"
                value={capacity.requiredUnitsPerHour != null ? formatRate(capacity.requiredUnitsPerHour) : '—'}
                icon={Gauge}
                hint={
                  capacity.taktMinutesPerUnit != null
                    ? `Takt time: 1 sale every ${capacity.taktMinutesPerUnit.toLocaleString('en-US', {
                        maximumFractionDigits: 1,
                      })} min`
                    : undefined
                }
              />
              <ResultTile
                label="Team can sell / hour"
                value={formatRate(capacity.capableUnitsPerHour)}
                icon={Users}
                hint={`${peopleLabel} × ${capacity.serviceMinutesPerUnit} min${efficiency < 1 ? ' · realistic pace' : ''}`}
              />
              <ResultTile
                label="Capacity vs goal"
                value={capacity.coverage != null ? `${Math.round(capacity.coverage * 100)}%` : '—'}
                icon={Activity}
                tone={capacity.coverage != null && capacity.coverage <= 1 ? 'positive' : 'negative'}
                hint={
                  capacity.maxUnits != null
                    ? `Most you can sell: ${formatUnits(capacity.maxUnits)} units`
                    : undefined
                }
              />
              <ResultTile
                label="Time to reach goal"
                value={capacity.hoursToGoal != null ? `${capacity.hoursToGoal.toFixed(1)} h` : '—'}
                icon={Clock}
                tone={feasible ? 'positive' : 'negative'}
                hint={`Event lasts ${capacity.durationHours} h`}
              />
            </div>

            <div
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4',
                feasible
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-error/40 bg-error/5',
              )}
            >
              {feasible ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-label font-bold text-on-surface">
                  {feasible ? 'Your team can keep up' : 'Your team is short'}
                </p>
                <p className="text-[12px] leading-relaxed text-on-surface-variant">
                  {feasible ? (
                    <>
                      At {formatRate(capacity.capableUnitsPerHour)} with {peopleLabel}, you reach{' '}
                      <span className="font-label font-bold text-on-surface">{formatUnits(goalUnits!)} units</span> in{' '}
                      <span className="font-label font-bold text-on-surface">
                        {capacity.hoursToGoal!.toFixed(1)} h
                      </span>{' '}
                      — {capacity.durationHours - capacity.hoursToGoal! >= 0
                        ? `${(capacity.durationHours - capacity.hoursToGoal!).toFixed(1)} h`
                        : '—'}{' '}
                      before the event ends.
                    </>
                  ) : (
                    <>
                      At {formatRate(capacity.capableUnitsPerHour)} with {peopleLabel}, selling{' '}
                      <span className="font-label font-bold text-on-surface">{formatUnits(goalUnits!)} units</span> takes{' '}
                      <span className="font-label font-bold text-error">
                        {capacity.hoursToGoal!.toFixed(1)} h
                      </span>
                      {shortfallHours != null && shortfallHours > 0
                        ? ` — ${shortfallHours.toFixed(1)} h more than the ${capacity.durationHours} h event.`
                        : '.'}{' '}
                      {capacity.staffGap != null && capacity.staffGap > 0 ? (
                        <>
                          Add{' '}
                          <span className="font-label font-bold text-on-surface">
                            {capacity.staffGap} {capacity.staffGap === 1 ? 'person' : 'people'}
                          </span>{' '}
                          ({capacity.requiredStaff} total) to hit the goal in time.
                        </>
                      ) : (
                        'Shorten the sales per customer or extend the event.'
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>

            <ThroughputChart
              targetUnits={goalUnits!}
              capableUnitsPerHour={capacity.capableUnitsPerHour}
              durationHours={capacity.durationHours}
              hoursToGoal={capacity.hoursToGoal}
            />

            <p className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-3 text-[12px] text-on-surface-variant">
              That pace means about{' '}
              <span className="font-label font-bold text-on-surface">
                {capacity.requiredUnitsPerHour != null
                  ? formatCurrency(capacity.requiredUnitsPerHour * catalog.avgPrice, currency)
                  : '—'}
              </span>{' '}
              in sales per hour to hit your goal.
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4 text-sm text-on-surface-variant">
            {breakEvenUnits == null
              ? 'Add a positive fee and products with margin to set a goal for this analysis.'
              : 'Add at least one person and a time per sale to measure your team’s pace.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
