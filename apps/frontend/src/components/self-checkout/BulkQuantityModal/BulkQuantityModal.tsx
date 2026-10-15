'use client'

import { useEffect, useState } from 'react'
import { X, ShoppingCart, Delete } from 'lucide-react'
import { proxyImageUrl } from '@/lib/image-proxy'
import { formatCurrency, getSalePrice, hasPromoConditions } from '@/lib/utils'
import { formatQuantity, snapToStep, round2 } from '@ultimate-pos/shared'
import type { Product, Promotion } from '@ultimate-pos/shared'

const QUICK_AMOUNTS = [0.25, 0.5, 1, 2]
const KEYPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'back']

interface SelfCheckoutBulkQuantityModalProps {
  product: Product
  promotion: Promotion | null
  onConfirm: (quantity: number) => void
  onClose: () => void
}

export function BulkQuantityModal({
  product,
  promotion,
  onConfirm,
  onClose,
}: SelfCheckoutBulkQuantityModalProps) {
  const [imgError, setImgError] = useState(false)
  const [input, setInput] = useState('0')

  useEffect(() => {
    setInput('0')
    setImgError(false)
  }, [product.id])

  const unit = product.bulk_unit ?? ''
  const step = product.bulk_step && product.bulk_step > 0 ? product.bulk_step : 0.1
  const basePrice = promotion && !hasPromoConditions(promotion)
    ? getSalePrice(product.price, promotion.discount_type, promotion.discount_value)
    : product.price
  const qty = parseFloat(input) || 0
  const isValid = qty > 0
  const itemTotal = round2(basePrice * qty)

  const press = (key: string) => {
    setInput((prev) => {
      if (key === 'back') {
        const next = prev.slice(0, -1)
        return next === '' || next === '-' ? '0' : next
      }
      if (key === '.') {
        return prev.includes('.') ? prev : prev + '.'
      }
      const next = prev === '0' ? key : prev + key
      const decimals = next.split('.')[1]
      if (decimals && decimals.length > 3) return prev
      return next
    })
  }

  const handleConfirm = () => {
    const snapped = snapToStep(qty, step)
    if (snapped <= 0) return
    onConfirm(snapped)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-lg max-h-[85vh] flex-col rounded-t-2xl sm:rounded-2xl bg-surface-container shadow-xl">
        <div className="flex shrink-0 items-center justify-between bg-surface-container p-3 border-b border-outline-variant sm:p-4">
          <h2 className="font-headline font-bold text-base text-on-surface sm:text-lg">Enter Quantity</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 sm:p-4 sm:space-y-5">
          <div className="flex gap-3 sm:gap-4">
            {product.image_url && !imgError && (
              <div className="shrink-0">
                <img
                  src={proxyImageUrl(product.image_url) ?? undefined}
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover sm:h-16 sm:w-16"
                  onError={() => setImgError(true)}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-headline font-bold text-base text-on-surface truncate sm:text-lg">{product.name}</h3>
              <p className="font-headline font-bold text-sm text-primary mt-0.5">
                {formatCurrency(basePrice)}{unit ? ` / ${unit}` : ''}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-surface-container-high/60 border border-outline-variant p-3 text-center sm:p-4">
            <span className="font-headline font-extrabold text-3xl text-on-surface tabular-nums sm:text-4xl">
              {input}
            </span>
            <span className="ml-2 font-headline font-bold text-lg text-on-surface-variant sm:text-xl">
              {unit}
            </span>
            <p className="mt-1 text-xs text-on-surface-variant">
              = {formatCurrency(itemTotal)}
            </p>
          </div>

          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((amount) => {
              const selected = input === String(amount)
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setInput(String(amount))}
                  className={
                    selected
                      ? 'flex-1 rounded-lg border-2 border-primary bg-primary/10 py-2 text-sm font-bold text-primary transition-colors'
                      : 'flex-1 rounded-lg border border-outline-variant bg-surface-container-high py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors'
                  }
                >
                  {formatQuantity(amount, unit)}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {KEYPAD_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => press(key)}
                className="flex h-11 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high font-headline font-bold text-lg text-on-surface hover:bg-surface-container active:scale-95 transition-all sm:h-14 sm:text-xl"
              >
                {key === 'back' ? <Delete className="h-5 w-5" /> : key}
              </button>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-outline-variant bg-surface-container p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-sm text-on-surface-variant">Item Total</span>
            <span className="font-headline font-bold text-lg text-on-surface">{formatCurrency(itemTotal)}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-outline-variant py-2.5 text-sm font-label font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-label font-bold text-primary-on hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
