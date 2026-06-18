'use client'

import { useState, useEffect } from 'react'
import { Percent, Tag, Trash2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setDiscount } from '@/store/slices/cartSlice'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PromoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PromoModal({ open, onOpenChange }: PromoModalProps) {
  const dispatch = useAppDispatch()
  const { discount, discount_label, items } = useAppSelector((s) => s.cart)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const [mode, setMode] = useState<'percent' | 'fixed'>('percent')
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!open) return
    if (discount > 0) {
      setMode('fixed')
      setValue(String(discount))
      setLabel(discount_label || '')
    } else {
      setMode('percent')
      setValue('')
      setLabel('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const numValue = parseFloat(value)
  const isValid = numValue > 0
  const previewAmount = mode === 'percent' && isValid
    ? Math.round(subtotal * (numValue / 100) * 100) / 100
    : mode === 'fixed' && isValid
      ? Math.min(numValue, subtotal)
      : 0

  const handleApply = () => {
    if (!isValid) return

    let amount: number
    let discountLabel: string

    if (mode === 'percent') {
      amount = Math.round(subtotal * (numValue / 100) * 100) / 100
      discountLabel = label || `${numValue}% Off`
    } else {
      amount = Math.min(numValue, subtotal)
      discountLabel = label || `${formatCurrency(numValue)} Off`
    }

    dispatch(setDiscount({ amount, label: discountLabel }))
    onOpenChange(false)
  }

  const handleRemove = () => {
    dispatch(setDiscount({ amount: 0 }))
    onOpenChange(false)
  }

  const hasDiscount = discount > 0

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-sm">
        <ModalHeader>
          <ModalTitle>Promo / Discount</ModalTitle>
        </ModalHeader>

        <div className="space-y-4">
          {hasDiscount && (
            <div className="rounded-lg bg-secondary/10 border border-secondary/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-secondary">Current Discount</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {discount_label || 'Discount'} — {formatCurrency(discount)}
                  </p>
                </div>
                <span className="font-headline font-bold text-lg text-secondary">-{formatCurrency(discount)}</span>
              </div>
            </div>
          )}

          <div className="flex rounded-lg bg-surface-container-high p-1">
            <button
              onClick={() => setMode('percent')}
              className={cn(
                'flex-1 rounded-md px-3 py-2 text-center text-sm font-label font-bold transition-all',
                mode === 'percent'
                  ? 'bg-primary text-primary-on shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <Percent className="h-4 w-4 inline mr-1" />
              % Off
            </button>
            <button
              onClick={() => setMode('fixed')}
              className={cn(
                'flex-1 rounded-md px-3 py-2 text-center text-sm font-label font-bold transition-all',
                mode === 'fixed'
                  ? 'bg-primary text-primary-on shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <Tag className="h-4 w-4 inline mr-1" />
              $ Off
            </button>
          </div>

          <div>
            <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              {mode === 'percent' ? 'Percentage Off' : 'Amount Off'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant font-bold">
                {mode === 'percent' ? '%' : '$'}
              </span>
              <input
                type="number"
                min={0}
                step={mode === 'percent' ? 1 : 0.01}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={mode === 'percent' ? '10' : '5.00'}
                className="w-full rounded-lg border border-outline-variant bg-surface-container pl-8 pr-3 py-2.5 text-sm text-on-body placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            {isValid && previewAmount > 0 && (
              <p className="mt-1 text-xs text-on-surface-variant">
                {mode === 'percent' ? `${numValue}% of ${formatCurrency(subtotal)}` : ''}
                {' → '}
                <span className="text-secondary font-bold">-{formatCurrency(previewAmount)}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              Label <span className="font-normal normal-case text-on-surface-variant/50">(optional)</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Summer Sale, Employee Discount"
              maxLength={50}
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-body placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <ModalFooter className="flex-col sm:flex-row gap-2">
          {hasDiscount && (
            <button
              onClick={handleRemove}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-error/30 px-4 py-2 text-sm font-label font-bold text-error hover:bg-error/5 transition-colors w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              Remove Discount
            </button>
          )}
          <Button
            onClick={handleApply}
            disabled={!isValid}
            className="w-full sm:w-auto"
          >
            <Tag className="h-4 w-4 mr-1.5" />
            {hasDiscount ? 'Update' : 'Apply'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
