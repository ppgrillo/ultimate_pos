'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api/client'

export function useTerminalPayment() {
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null)

  const isCreating = paymentOrderId === '__creating__'
  const isActive = paymentOrderId !== null
  const actualOrderId = paymentOrderId && paymentOrderId !== '__creating__' ? paymentOrderId : null

  const startPayment = useCallback(() => {
    setPaymentOrderId('__creating__')
  }, [])

  const confirmPayment = useCallback((orderId: string) => {
    setPaymentOrderId(orderId)
  }, [])

  const cancelPayment = useCallback(async () => {
    if (actualOrderId) {
      try {
        await api.post(`/orders/${actualOrderId}/cancel-terminal-payment`)
      } catch {
      }
    }
    setPaymentOrderId(null)
  }, [actualOrderId])

  const clearPayment = useCallback(() => {
    setPaymentOrderId(null)
  }, [])

  return {
    paymentOrderId,
    isCreating,
    isActive,
    actualOrderId,
    startPayment,
    confirmPayment,
    cancelPayment,
    clearPayment,
  }
}
