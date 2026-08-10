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

export interface CreateCardPaymentParams {
  totalAmount: number
  externalReference: string
  description?: string
  terminalId: string
}

export interface CardPayment {
  providerOrderId: string
  status: CardOrderStatus
  paymentDetail?: string
  paymentStatus?: string
}

export interface PaymentTerminal {
  id: string
  name: string
  model?: string
  operatingMode?: string
}

export interface CardProviderCredentials {
  accessToken: string
  clientSecret?: string
}

export interface PaymentProvider {
  readonly name: CardPaymentProviderName
  createPayment(
    params: CreateCardPaymentParams,
    credentials: CardProviderCredentials,
  ): Promise<CardPayment>
  getPayment(
    providerOrderId: string,
    credentials: CardProviderCredentials,
  ): Promise<CardPayment>
  cancelPayment(
    providerOrderId: string,
    credentials: CardProviderCredentials,
  ): Promise<void>
  refundPayment(
    providerOrderId: string,
    credentials: CardProviderCredentials,
    transactionId?: string,
    amount?: number,
  ): Promise<void>
  listTerminals?(credentials: CardProviderCredentials): Promise<PaymentTerminal[]>
  setupTerminal?(terminalId: string, credentials: CardProviderCredentials): Promise<void>
}
