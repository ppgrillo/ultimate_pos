'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/Modal'
import { PaymentMethodSelector } from '@/components/pos/PaymentMethodSelector'
import { formatCurrency, cn } from '@/lib/utils'
import { Bolt, Banknote, BadgeCheck } from 'lucide-react'
import type { PaymentMethod } from '@ultimate-pos/shared'

interface PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  onConfirm: (method: PaymentMethod, cashGiven?: number) => void
  acceptedMethods?: PaymentMethod[]
  mpPointEnabled?: boolean
}

export function PaymentModal({ open, onOpenChange, total, onConfirm, acceptedMethods, mpPointEnabled }: PaymentModalProps) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null)
  const [cashGiven, setCashGiven] = useState('')
  const autoConfirmed = useRef(false)

  useEffect(() => {
    if (open) {
      autoConfirmed.current = false
      const methods = acceptedMethods ?? ['cash', 'card', 'transfer']
      if (methods.length === 1) {
        if (methods[0] !== 'cash') {
          if (!autoConfirmed.current) {
            autoConfirmed.current = true
            onConfirm(methods[0])
            onOpenChange(false)
          }
        } else {
          setSelected('cash')
        }
      }
    }
  }, [open, acceptedMethods, onConfirm, onOpenChange])

  const isCash = selected === 'cash'
  const parsedCashGiven = parseFloat(cashGiven) || 0
  const changeDue = isCash ? Math.max(0, Math.round((parsedCashGiven - total) * 100) / 100) : 0
  const cashValid = parsedCashGiven >= total

  const handleConfirm = () => {
    if (!selected) return
    if (isCash && !cashValid) return
    onConfirm(selected, isCash ? parsedCashGiven : undefined)
    setSelected(null)
    setCashGiven('')
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) { setSelected(null); setCashGiven('') }
    onOpenChange(v)
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="max-w-sm">
        <ModalHeader>
          <ModalTitle>Select Payment Method</ModalTitle>
          <ModalDescription>
            Total: {formatCurrency(total)}
          </ModalDescription>
        </ModalHeader>

        <div className="py-2">
          <PaymentMethodSelector
            selected={selected}
            onSelect={setSelected}
            acceptedMethods={acceptedMethods}
            amount={total}
            layout="vertical"
            mpPointEnabled={mpPointEnabled}
          />
        </div>

        {isCash && (
          <div className="rounded-xl bg-surface-container/40 border border-outline-variant/60 p-4 space-y-3 transition-all duration-200">
            <label className="block">
              <span className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5" />
                Amount Given
              </span>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-lg">
                  $
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  placeholder={formatCurrency(total)}
                  className={cn(
                    'w-full rounded-lg border bg-surface-container-high py-3 pl-8 pr-3 text-lg font-headline font-bold text-on-surface placeholder:text-on-surface-variant/30 transition-all',
                    'focus-visible:outline-none focus-visible:ring-2',
                    cashGiven && cashValid
                      ? 'border-primary/50 focus-visible:ring-primary/40'
                      : cashGiven && !cashValid
                        ? 'border-error/50 focus-visible:ring-error/40'
                        : 'border-outline-variant focus-visible:ring-primary/30',
                  )}
                  autoFocus
                />
              </div>
            </label>

            {cashGiven && (
              <div className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2.5 transition-all duration-200',
                cashValid
                  ? 'bg-primary/10 text-primary'
                  : 'bg-error/10 text-error',
              )}>
                <span className="font-label font-bold text-xs flex items-center gap-1.5">
                  {cashValid ? (
                    <><BadgeCheck className="h-4 w-4" /> Change Due</>
                  ) : (
                    <><Banknote className="h-4 w-4" /> Insufficient</>
                  )}
                </span>
                <span className="font-headline font-bold text-lg">
                  {cashValid
                    ? formatCurrency(changeDue)
                    : formatCurrency(Math.abs(total - parsedCashGiven)) + ' short'}
                </span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || (isCash && !cashValid)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-label font-bold text-primary-on hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isCash ? <Banknote className="h-5 w-5" /> : <Bolt className="h-5 w-5" />}
          {!selected
            ? 'Select a method'
            : isCash
              ? `Charge ${formatCurrency(total)}`
              : `Pay ${formatCurrency(total)} with ${selected === 'card' ? 'Card' : 'Transfer'}`}
        </button>
      </ModalContent>
    </Modal>
  )
}
