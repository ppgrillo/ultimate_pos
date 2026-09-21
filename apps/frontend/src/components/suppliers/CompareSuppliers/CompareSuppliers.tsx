'use client'

import type { SupplierStats, SupplierWithStats } from '@ultimate-pos/shared'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn, formatCurrency } from '@/lib/utils'
import { Scale } from 'lucide-react'

interface CompareSuppliersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suppliers: SupplierWithStats[]
  onViewPurchases: (supplier: SupplierWithStats) => void
}

type Better = 'max' | 'min' | 'latest'

interface MetricRow {
  key: keyof SupplierStats
  label: string
  better: Better
  format: (value: unknown) => string
}

const METRIC_ROWS: MetricRow[] = [
  { key: 'totalSpent', label: 'Total spent', better: 'max', format: (v) => formatCurrency(Number(v)) },
  { key: 'purchaseCount', label: 'Purchases', better: 'max', format: (v) => String(v) },
  { key: 'avgExpense', label: 'Avg expense', better: 'min', format: (v) => formatCurrency(Number(v)) },
  {
    key: 'lastPurchaseDate',
    label: 'Last purchase',
    better: 'latest',
    format: (v) => formatDate(v as string | null),
  },
  {
    key: 'avgDeliveryDays',
    label: 'Avg delivery',
    better: 'min',
    format: (v) => (v == null ? '—' : `${v} days`),
  },
]

function formatDate(key: string | null): string {
  if (!key) return '—'
  const d = new Date(`${key}T12:00:00`)
  if (Number.isNaN(d.getTime())) return key
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function isBetter(current: unknown, candidate: unknown, better: Better): boolean {
  if (candidate == null || candidate === '') return false
  if (better === 'latest') return String(current) < String(candidate)
  if (better === 'min') return Number(candidate) < Number(current)
  return Number(candidate) > Number(current)
}

function bestIdFor(metric: MetricRow, suppliers: SupplierWithStats[]): string | null {
  let bestId: string | null = null
  let bestValue: unknown = null
  let flagged = false
  for (const supplier of suppliers) {
    const value = supplier.stats?.[metric.key]
    if (value == null || value === '') continue
    if (bestId === null) {
      bestId = supplier.id
      bestValue = value
      flagged = false
    } else if (isBetter(bestValue, value, metric.better)) {
      bestId = supplier.id
      bestValue = value
      flagged = false
    } else if (!isBetter(bestValue, value, metric.better) && String(value) === String(bestValue)) {
      flagged = true
    }
  }
  return flagged ? null : bestId
}

const DETAIL_ROWS: Array<{ label: string; value: (s: SupplierWithStats) => string }> = [
  { label: 'Status', value: (s) => (s.is_active ? 'Active' : 'Inactive') },
  { label: 'Contact', value: (s) => s.contact_name ?? '—' },
  { label: 'Phone', value: (s) => s.phone ?? '—' },
  { label: 'Email', value: (s) => s.email ?? '—' },
  { label: 'Website', value: (s) => s.website ?? '—' },
  { label: 'What they supply', value: (s) => s.notes ?? '—' },
]

export function CompareSuppliers({ open, onOpenChange, suppliers, onViewPurchases }: CompareSuppliersProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-3xl">
        <ModalHeader>
          <ModalTitle>Compare Suppliers</ModalTitle>
          <ModalDescription>
            Side-by-side metrics. The best value per row is highlighted.
          </ModalDescription>
        </ModalHeader>

        <div className="px-6 pb-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-outline-variant/40 text-left">
                <th className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant w-32">Metric</th>
                {suppliers.map((supplier) => (
                  <th key={supplier.id} className="py-3 px-3 text-left">
                    <p className="font-headline font-bold text-on-surface truncate max-w-[160px]">{supplier.name}</p>
                    <button
                      type="button"
                      onClick={() => onViewPurchases(supplier)}
                      className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                    >
                      <Scale className="h-3 w-3" />
                      View purchases
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {METRIC_ROWS.map((metric) => {
                const bestId = bestIdFor(metric, suppliers)
                return (
                  <tr key={metric.key}>
                    <td className="py-3 pr-4 text-xs font-bold text-on-surface-variant">{metric.label}</td>
                    {suppliers.map((supplier) => {
                      const isBest = bestId === supplier.id
                      return (
                        <td key={supplier.id} className="py-3 px-3">
                          <span
                            className={cn(
                              'font-mono tabular-nums',
                              isBest ? 'text-primary font-extrabold' : 'text-on-surface',
                            )}
                          >
                            {metric.format(supplier.stats?.[metric.key])}
                          </span>
                          {isBest && (
                            <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                              Best
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}

              {DETAIL_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="py-3 pr-4 text-xs font-bold text-on-surface-variant">{row.label}</td>
                  {suppliers.map((supplier) => (
                    <td key={supplier.id} className="py-3 px-3 text-on-surface-variant">
                      <span className="line-clamp-2">{row.value(supplier)}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end px-6 pb-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </ModalContent>
    </Modal>
  )
}