import type { CardOrderStatus } from './types'

export interface CardPaymentOutcome {
  orderStatus?: 'paid' | 'cancelled' | 'refunded'
  paymentStatus?: 'completed' | 'failed' | 'refunded'
  isTerminal?: boolean
}

const TERMINAL_STATUSES: CardOrderStatus[] = ['processed', 'failed', 'expired', 'canceled', 'refunded']

export function getCardPaymentOutcome(
  status: CardOrderStatus,
): CardPaymentOutcome {
  switch (status) {
    case 'processed':
      return { orderStatus: 'paid', paymentStatus: 'completed', isTerminal: true }
    case 'canceled':
    case 'expired':
    case 'failed':
      return { orderStatus: 'cancelled', paymentStatus: 'failed', isTerminal: true }
    case 'refunded':
      return { orderStatus: 'refunded', paymentStatus: 'refunded', isTerminal: true }
    default:
      return {}
  }
}

export function isTerminalCardStatus(status: CardOrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

export function isFailedCardStatus(status: CardOrderStatus): boolean {
  return status === 'canceled' || status === 'expired' || status === 'failed'
}
