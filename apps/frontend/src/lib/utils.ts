import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function getSalePrice(
  price: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
): number {
  if (discountType === 'percentage') {
    return Math.round(price * (1 - discountValue / 100) * 100) / 100
  }
  return Math.max(0, Math.round((price - discountValue) * 100) / 100)
}

export function hasPromoConditions(promotion: {
  min_quantity?: number | null
  min_subtotal?: number | null
}): boolean {
  return (promotion.min_quantity != null && promotion.min_quantity > 0)
    || (promotion.min_subtotal != null && promotion.min_subtotal > 0)
}


