'use client'

import { useState, useCallback, useEffect } from 'react'
import { Lock, Banknote, BadgeCheck, Bolt } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { PaymentMethodSelector } from '@/components/pos/PaymentMethodSelector'
import { MPPointPayment } from '@/components/pos/MPPointPayment'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalClose } from '@/components/ui/Modal'
import type { PaymentMethod } from '@ultimate-pos/shared'

interface CollectPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  onPay: (paymentMethod: PaymentMethod, cashGiven?: number) => Promise<{ id: string; metadata?: { mpOrderId?: string } }>
  onPaid: (data?: { orderId?: string; paymentMethod?: string; changeDue?: number; total?: number }) => void
  mpPointEnabled?: boolean
  acceptedMethods?: PaymentMethod[]
}

export function CollectPaymentModal({
  open,
  onOpenChange,
  total,
  onPay,
  onPaid,
  mpPointEnabled = false,
  acceptedMethods = ['cash', 'card', 'transfer'],
}: CollectPaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [cashGiven, setCashGiven] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mpPaymentOrderId, setMpPaymentOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (acceptedMethods.length === 1) {
      setSelectedMethod(acceptedMethods[0])
    }
  }, [acceptedMethods])

  useEffect(() => {
    if (!open) {
      setSelectedMethod(null)
      setCashGiven('')
      setError(null)
      setSubmitting(false)
      setMpPaymentOrderId(null)
    }
  }, [open])

  const isCash = selectedMethod === 'cash'
  const parsedCashGiven = parseFloat(cashGiven) || 0
  const changeDue = isCash ? Math.max(0, Math.round((parsedCashGiven - total) * 100) / 100) : 0
  const cashValid = parsedCashGiven >= total
  const canSubmit = selectedMethod !== null && (!isCash || cashValid)

  const handleMethodChange = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method)
    if (method !== 'cash') setCashGiven('')
  }, [])

  const handleMpPaid = () => {
    setMpPaymentOrderId(null)
    onPaid({ paymentMethod: 'card', total })
  }

  const handleMpCancel = async () => {
    setMpPaymentOrderId(null)
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!selectedMethod || !canSubmit) return
    setSubmitting(true)
    setError(null)

    const isMpPoint = selectedMethod === 'card' && mpPointEnabled

    try {
      const result = await onPay(
        selectedMethod,
        isCash ? parsedCashGiven : undefined,
      )

      if (isMpPoint && result.metadata?.mpOrderId) {
        setSubmitting(false)
        setMpPaymentOrderId(result.id)
        return
      }

      onPaid({
        orderId: result.id,
        paymentMethod: selectedMethod,
        changeDue: isCash ? changeDue : undefined,
        total,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setSubmitting(false)
    }
  }

  const buttonLabel = isCash
    ? `Charge ${formatCurrency(total)}`
    : `Charge ${formatCurrency(total)} with ${selectedMethod === 'card' ? 'Card' : 'Transfer'}`

  return (
    <>
      <Modal open={open && mpPaymentOrderId === null} onOpenChange={onOpenChange}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Select Payment Method</ModalTitle>
            <ModalClose />
          </ModalHeader>

          <div className="p-4 space-y-4">
            <div className="rounded-xl bg-surface-container/40 border border-outline-variant/60 p-4 text-center">
              <span className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">Total</span>
              <div className="font-headline font-bold text-3xl text-on-surface mt-1">{formatCurrency(total)}</div>
            </div>

            <div>
              <PaymentMethodSelector
                selected={selectedMethod}
                onSelect={handleMethodChange}
                acceptedMethods={acceptedMethods}
                amount={total}
                mpPointEnabled={mpPointEnabled}
                layout="horizontal"
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-lg">$</span>
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
                    cashValid ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error',
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

            {error && (
              <div className="p-3 rounded-lg text-sm text-error bg-error-container/20 border border-error/30">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-label font-bold text-primary-on hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-on border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  {isCash ? <Banknote className="h-5 w-5" /> : <Bolt className="h-5 w-5" />}
                  {selectedMethod ? buttonLabel : `Select Payment Method`}
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-on-surface-variant/50 flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" />
              Secure transaction powered by Ultimate POS
            </p>
          </div>
        </ModalContent>
      </Modal>

      <MPPointPayment
        open={mpPaymentOrderId !== null}
        onOpenChange={(v) => { if (!v) setMpPaymentOrderId(null) }}
        orderId={mpPaymentOrderId}
        total={total}
        onPaid={handleMpPaid}
        onCancel={handleMpCancel}
      />
    </>
  )
}
