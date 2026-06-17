'use client'

import { formatCurrency } from '@/lib/utils'

interface OrderSummaryProps {
  subtotal: number
  discount: number
  discountLabel?: string
  tax?: number
  taxRate?: number
  taxLabel?: string
  taxInclusive?: boolean
  showTotal?: boolean
}

export function OrderSummary({
  subtotal,
  discount,
  discountLabel,
  tax: taxOverride,
  taxRate = 0.08,
  taxLabel = 'Tax',
  taxInclusive = false,
  showTotal = false,
}: OrderSummaryProps) {
  const tax = taxOverride ?? (
    taxInclusive
      ? Math.round((subtotal - subtotal / (1 + taxRate)) * 100) / 100
      : Math.round(subtotal * taxRate * 100) / 100
  )

  const total = taxInclusive
      ? Math.round((subtotal - discount) * 100) / 100
      : Math.round((subtotal + tax - discount) * 100) / 100

  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex justify-between text-on-surface-variant">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-secondary">
          <span>{discountLabel || 'Discount'}</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}
      {tax > 0 && (
        <div className="flex justify-between text-on-surface-variant">
          <span>{taxLabel} ({(taxRate * 100).toFixed(0)}%){taxInclusive ? ' incl.' : ''}</span>
          <span>{formatCurrency(tax)}</span>
        </div>
      )}
      {showTotal && (
        <div className="flex justify-between border-t border-outline-variant pt-1.5 font-headline font-bold text-lg text-on-surface">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  )
}
