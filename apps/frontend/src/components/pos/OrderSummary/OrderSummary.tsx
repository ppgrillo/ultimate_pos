'use client'

import { formatCurrency } from '@/lib/utils'
import type { AppliedPromotion } from '@ultimate-pos/shared'

interface OrderSummaryProps {
  subtotal: number
  discount: number
  discountLabel?: string
  appliedPromotions?: AppliedPromotion[]
  promoDiscount?: number
  productSavings?: number
  tax?: number
  taxRate?: number
  taxLabel?: string
  taxInclusive?: boolean
  taxEnabled?: boolean
  showTotal?: boolean
}

export function OrderSummary({
  subtotal,
  discount,
  discountLabel,
  appliedPromotions = [],
  promoDiscount = 0,
  productSavings = 0,
  tax: taxOverride,
  taxRate = 0.08,
  taxLabel = 'Tax',
  taxInclusive = false,
  taxEnabled = true,
  showTotal = false,
}: OrderSummaryProps) {
  const actualSubtotal = subtotal - productSavings

  const tax = !taxEnabled
    ? 0
    : taxOverride ?? (
      taxInclusive
        ? Math.round((actualSubtotal - actualSubtotal / (1 + taxRate)) * 100) / 100
        : Math.round(actualSubtotal * taxRate * 100) / 100
    )

  const totalDiscount = discount + promoDiscount
  const total = taxInclusive
      ? Math.round((actualSubtotal - totalDiscount) * 100) / 100
      : Math.round((actualSubtotal + tax - totalDiscount) * 100) / 100

  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex justify-between text-on-surface-variant">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {productSavings > 0 && (
        <div className="flex justify-between text-secondary">
          <span>Product Promo Savings</span>
          <span>-{formatCurrency(productSavings)}</span>
        </div>
      )}
      {appliedPromotions.map((promo) => (
        <div key={promo.promotion_id} className="flex justify-between text-secondary">
          <span className="flex items-center gap-1">
            <span>{promo.name}</span>
            {promo.badge_text && (
              <span className="rounded bg-secondary/10 px-1 py-0.5 text-[9px] font-label font-bold">
                {promo.badge_text}
              </span>
            )}
          </span>
          <span>-{formatCurrency(promo.discount_amount)}</span>
        </div>
      ))}
      {discount > 0 && (
        <div className="flex justify-between text-secondary">
          <span>{discountLabel || 'Discount'}</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}
      {(productSavings > 0 || totalDiscount > 0) && (
        <div className="flex justify-between text-on-surface-variant text-xs">
          <span>Total savings</span>
          <span className="font-bold text-secondary">-{formatCurrency(productSavings + totalDiscount)}</span>
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
