'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { MPPointPayment } from '@/components/pos/MPPointPayment'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useCloseCheckMutation, useCancelCheckMpMutation, api as rtkApi } from '@/store/api'
import { api } from '@/lib/api/client'
import { getActiveCardProvider, cardProviderShortName } from '@/lib/card-payments'
import { round2 } from '@ultimate-pos/shared'
import type { Check, PaymentMethod } from '@ultimate-pos/shared'

export interface CheckForPayment extends Check {
  total?: number
}

interface CheckPaymentFlowProps {
  check: CheckForPayment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed?: () => void
}

/**
 * Closes a dine-in check and, when the store is on card + terminal, hands the
 * whole account off to the card terminal (one charge for subtotal + tip).
 * Cash / transfer / manual card close immediately and show the receipt.
 */
export function CheckPaymentFlow({ check, open, onOpenChange, onClosed }: CheckPaymentFlowProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const settings = useAppSelector((s) => s.storeConfig.currentStore?.settings)

  const mpPointEnabled = settings?.mpPointEnabled ?? false
  const activeCardProvider = getActiveCardProvider(settings)
  const cardProviderLabel = cardProviderShortName(activeCardProvider)
  const acceptedMethods = settings?.acceptedPaymentMethods ?? ['cash', 'card', 'transfer']
  const tipsEnabled = settings?.tipsEnabled ?? false

  const [closeCheck, { isLoading }] = useCloseCheckMutation()
  const [cancelCheckMp] = useCancelCheckMpMutation()

  const [error, setError] = useState<string | null>(null)
  const [mpCheckId, setMpCheckId] = useState<string | null>(null)
  const [mpTotal, setMpTotal] = useState(0)
  const [mpTip, setMpTip] = useState(0)

  const baseTotal = Number(check?.total || 0)

  const tipConfig = {
    enabled: tipsEnabled,
    label: settings?.tipLabel || 'Tip',
    presets: settings?.tipPresets,
    allowCustom: settings?.tipAllowCustom ?? false,
    maxPercent: settings?.tipMaxPercent ?? 100,
  }

  const goToReceipt = (method: PaymentMethod, total: number, tip: number, cashGiven?: number) => {
    const params = new URLSearchParams({ paymentMethod: method, total: String(total) })
    if (tip > 0) params.set('tip', String(tip))
    if (method === 'cash' && cashGiven !== undefined && cashGiven > total) {
      params.set('changeDue', String(round2(cashGiven - total)))
    }
    router.push(`/pos/receipt?${params.toString()}`)
  }

  const reset = () => {
    setMpCheckId(null)
    setMpTotal(0)
    setMpTip(0)
  }

  const handleConfirm = async (method: PaymentMethod, cashGiven?: number, tip?: number) => {
    if (!check) return
    const tipAmount = tip && tip > 0 ? tip : 0
    try {
      setError(null)
      const res = await closeCheck({
        checkId: check.id,
        payment_method: method,
        cash_amount_given: method === 'cash' ? cashGiven : undefined,
        tip: tipAmount > 0 ? tipAmount : undefined,
      }).unwrap()

      // Card + terminal: the intent is live on the terminal, so the account is
      // not closed yet. Hand off to the MP modal and let it poll until paid.
      if (res.providerOrderId) {
        setMpCheckId(check.id)
        setMpTip(tipAmount)
        setMpTotal(res.total ?? round2(baseTotal + tipAmount))
        onOpenChange(false)
        return
      }

      goToReceipt(method, res.total ?? round2(baseTotal + tipAmount), tipAmount, cashGiven)
      onClosed?.()
    } catch (err) {
      const message = err && typeof err === 'object' && 'data' in err
        ? ((err as { data?: { error?: string } }).data?.error || 'Could not close check')
        : 'Could not close check'
      setError(message)
    }
  }

  const handleMpPaid = () => {
    goToReceipt('card', mpTotal, mpTip)
    reset()
    onClosed?.()
  }

  const handleMpCancel = async () => {
    if (mpCheckId) {
      try { await cancelCheckMp(mpCheckId).unwrap() } catch {}
    }
    dispatch(rtkApi.util.invalidateTags([{ type: 'Check', id: 'LIST' }]))
    reset()
  }

  return (
    <>
      {check && (
        <PaymentModal
          open={open}
          onOpenChange={(v) => {
            if (!v) setError(null)
            onOpenChange(v)
          }}
          total={baseTotal}
          onConfirm={handleConfirm}
          acceptedMethods={acceptedMethods}
          mpPointEnabled={mpPointEnabled}
          cardProviderLabel={cardProviderLabel}
          tipConfig={tipConfig}
          isLoading={isLoading}
          errorMessage={error}
        />
      )}

      <MPPointPayment
        open={mpCheckId !== null}
        onOpenChange={(v) => { if (!v) handleMpCancel() }}
        orderId={mpCheckId}
        total={mpTotal}
        providerName={activeCardProvider}
        onPaid={handleMpPaid}
        onCancel={handleMpCancel}
        fetchOrder={(id) => api.get<{ data: { status?: string; payment_status?: string; metadata?: Record<string, unknown> } }>(`/checks/${id}/mp-status`)}
      />
    </>
  )
}
