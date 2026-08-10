export type CardPaymentProviderName = 'mercado_pago' | 'clip'

export type CardOrderStatus =
  | 'created'
  | 'at_terminal'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'expired'
  | 'canceled'
  | 'action_required'
  | 'refunded'

export interface OrderPaymentMetadata {
  provider: CardPaymentProviderName
  providerOrderId: string
  providerStatus: CardOrderStatus
  detail?: string
  gatewayRef?: string
}
