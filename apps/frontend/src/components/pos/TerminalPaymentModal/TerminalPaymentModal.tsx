'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Modal,
  ModalContent,
} from '@/components/ui/Modal'
import { useAppSelector } from '@/store/hooks'
import { api } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Smartphone,
  ChevronLeft,
} from 'lucide-react'
import type { TerminalProvider } from '@ultimate-pos/shared'

interface TerminalPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
  isCreating?: boolean
  total: number
  provider: TerminalProvider
  label: string
  onPaid: () => void
  onCancel: () => void
}

type PaymentState = 'created' | 'awaiting_terminal' | 'processing' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'action_required'

interface StateConfig {
  icon: typeof CreditCard
  title: string
  description: string
  color: string
  bg: string
}

interface ProviderStateConfig {
  [key: string]: StateConfig
}

const DEFAULT_STATE_CONFIG: ProviderStateConfig = {
  created: {
    icon: Loader2,
    title: 'Creating payment order...',
    description: 'Sending order to the terminal',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  awaiting_terminal: {
    icon: Smartphone,
    title: 'Tap or insert card on the terminal',
    description: 'The terminal is ready to process the payment',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  processing: {
    icon: Loader2,
    title: 'Processing payment...',
    description: 'Please wait while the payment is processed',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  paid: {
    icon: CheckCircle2,
    title: 'Payment successful!',
    description: 'The payment was processed successfully',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  failed: {
    icon: XCircle,
    title: 'Payment failed',
    description: 'The terminal could not process the payment',
    color: 'text-error',
    bg: 'bg-error/10',
  },
  expired: {
    icon: Clock,
    title: 'Payment time expired',
    description: 'The payment order expired. Create a new order.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  cancelled: {
    icon: XCircle,
    title: 'Payment cancelled',
    description: 'The payment order was cancelled',
    color: 'text-on-surface-variant',
    bg: 'bg-surface-container',
  },
  action_required: {
    icon: AlertTriangle,
    title: 'Check the terminal',
    description: 'The terminal needs attention. Please check it.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
}

const MP_STATE_CONFIG: ProviderStateConfig = {
  ...DEFAULT_STATE_CONFIG,
  created: {
    icon: Loader2,
    title: 'Creando orden de pago...',
    description: 'Espera mientras se envía la orden a la terminal',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  awaiting_terminal: {
    icon: Smartphone,
    title: 'Acerca la tarjeta a la terminal Point',
    description: 'La terminal está lista para recibir el pago',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  processing: {
    icon: Loader2,
    title: 'Procesando pago...',
    description: 'No retires la tarjeta de la terminal',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  paid: {
    icon: CheckCircle2,
    title: 'Pago exitoso!',
    description: 'El pago fue procesado correctamente',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  failed: {
    icon: XCircle,
    title: 'Pago fallido',
    description: 'La terminal no pudo procesar el pago',
    color: 'text-error',
    bg: 'bg-error/10',
  },
  expired: {
    icon: Clock,
    title: 'Tiempo de espera agotado',
    description: 'La orden de pago expiró. Crea una nueva orden.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  cancelled: {
    icon: XCircle,
    title: 'Pago cancelado',
    description: 'La orden de pago fue cancelada',
    color: 'text-on-surface-variant',
    bg: 'bg-surface-container',
  },
  action_required: {
    icon: AlertTriangle,
    title: 'Revisa la terminal',
    description: 'La terminal requiere atención. Verifica el estado.',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
}

type OrderResponse = {
  status?: string
  payment_status?: string
  metadata?: { terminalPayment?: { normalizedStatus?: string } }
}

function getStateConfig(provider: TerminalProvider): ProviderStateConfig {
  if (provider === 'mercadopago') return MP_STATE_CONFIG
  return DEFAULT_STATE_CONFIG
}

function toPaymentState(res: OrderResponse | undefined): PaymentState | undefined {
  if (!res) return undefined
  if (res.status === 'paid' || res.payment_status === 'paid') return 'paid'
  const raw = res.metadata?.terminalPayment?.normalizedStatus
  if (raw === 'paid') return 'paid'
  if (raw === 'awaiting_terminal') return 'awaiting_terminal'
  if (raw === 'cancelled') return 'cancelled'
  if (raw && DEFAULT_STATE_CONFIG[raw]) return raw as PaymentState
  return undefined
}

export function TerminalPaymentModal({
  open, onOpenChange, orderId, isCreating, total, provider, onPaid, onCancel,
}: TerminalPaymentModalProps) {
  const orderFromStore = useAppSelector((s) => {
    if (!orderId) return undefined
    const state = s as { order?: { items?: Array<{ id: string; metadata?: Record<string, unknown> }> } }
    return state.order?.items?.find((o) => o.id === orderId)
  })
  const [localState, setLocalState] = useState<PaymentState>('created')
  const hasRedirected = useRef(false)
  const TIMEOUT_MS = 3 * 60 * 1000

  const stateConfig = getStateConfig(provider)

  useEffect(() => {
    hasRedirected.current = false
    if (!open) {
      setLocalState('created')
    }
  }, [open])

  useEffect(() => {
    const s = toPaymentState(orderFromStore as OrderResponse | undefined)
    if (s) setLocalState(s)
  }, [orderFromStore])

  const currentState = localState

  useEffect(() => {
    if (currentState === 'paid' && !hasRedirected.current) {
      hasRedirected.current = true
      const timer = setTimeout(() => {
        onPaid()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [currentState, onPaid])

  const poll = useCallback(async () => {
    if (!open || !orderId) return
    try {
      const res = await api.get<{ data: OrderResponse }>(`/orders/${orderId}`)
      const s = toPaymentState(res.data)
      if (s) setLocalState(s)
    } catch {
    }
  }, [open, orderId])

  useEffect(() => {
    if (isCreating || !orderId) return
    if (!open || currentState === 'paid' || currentState === 'failed' || currentState === 'expired' || currentState === 'cancelled') return

    const interval = setInterval(() => {
      poll()
    }, 3000)

    return () => clearInterval(interval)
  }, [open, currentState, poll, isCreating, orderId])

  useEffect(() => {
    if (isCreating || !orderId) return
    if (!open || currentState === 'paid' || currentState === 'failed' || currentState === 'expired') return
    const timer = setTimeout(() => {
      setLocalState('expired')
    }, TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [open, currentState, isCreating, orderId, TIMEOUT_MS])

  const config = stateConfig[currentState]
  const Icon = config.icon

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-sm text-center" onInteractOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center gap-4 py-6">
          <div className={`rounded-full p-4 ${config.bg}`}>
            <Icon className={`h-10 w-10 ${config.color} ${currentState === 'created' || currentState === 'processing' ? 'animate-spin' : ''}`} />
          </div>

          <div>
            <h2 className="text-lg font-headline font-bold text-on-surface">{config.title}</h2>
            <p className="mt-1 text-sm text-on-surface-variant">{config.description}</p>
          </div>

          <div className="text-2xl font-headline font-bold text-on-surface">
            {formatCurrency(total)}
          </div>

          {(currentState === 'created' || currentState === 'awaiting_terminal' || currentState === 'processing') && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Waiting for payment on the terminal...
              </div>
              {(currentState === 'created' || currentState === 'awaiting_terminal') && provider === 'mercadopago' && (
                <div className="mt-2 w-full rounded-xl bg-surface-container/40 border border-outline-variant/50 p-3 text-left flex items-center gap-2.5">
                  <ChevronLeft className="h-5 w-5 text-on-surface shrink-0" />
                  <p className="text-[11px] text-on-surface-variant leading-relaxed">
                    To cancel, press the <span className="font-bold text-on-surface">◀</span> (<span className="font-bold text-on-surface">bottom left</span>) button on the terminal
                  </p>
                </div>
              )}
            </div>
          )}

          {currentState === 'paid' && (
            <div className="w-full rounded-xl bg-surface-container/50 border border-outline-variant/50 p-3 text-left">
              <div className="flex items-center gap-2 text-sm text-on-surface">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-bold">Payment confirmed</span>
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                Redirecting to receipt...
              </p>
            </div>
          )}

          {currentState === 'failed' && (
            <div className="w-full space-y-2">
              <div className="rounded-xl bg-error/10 border border-error/30 p-3 text-left">
                <p className="text-xs text-error">
                  The payment could not be processed. Check the terminal and try again.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="flex-1 rounded-xl border border-outline-variant py-2.5 text-sm font-label font-bold text-on-surface hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setLocalState('created')
                    onCancel()
                  }}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-label font-bold text-primary-on hover:bg-primary/90 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {currentState === 'action_required' && (
            <button
              onClick={() => setLocalState('awaiting_terminal')}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-label font-bold text-primary-on hover:bg-primary/90 transition-colors"
            >
              I checked it
            </button>
          )}

          {(currentState === 'expired' || currentState === 'cancelled') && (
            <button
              onClick={() => onOpenChange(false)}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-label font-bold text-primary-on hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </ModalContent>
    </Modal>
  )
}
