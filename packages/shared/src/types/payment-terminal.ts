export type TerminalProvider = 'mercadopago' | 'clip' | 'fiserv' | 'stripe' | string

export type TerminalPaymentStatus =
  | 'created'
  | 'awaiting_terminal'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'action_required'

export interface TerminalConfig {
  provider: TerminalProvider
  enabled: boolean
  label: string
  terminalId?: string
  credentials: Record<string, string>
  metadata?: Record<string, unknown>
}

export interface CreateTerminalPaymentParams {
  totalAmount: number
  externalReference: string
  description?: string
  terminalId?: string
  metadata?: Record<string, unknown>
}

export interface TerminalPaymentResponse {
  providerId: string
  providerStatus: string
  normalizedStatus: TerminalPaymentStatus
  paymentMethod?: string
  paidAmount?: number
  statusDetail?: string
  raw: unknown
}

export interface TerminalInfo {
  id: string
  name: string
  model: string
  operatingMode: string
}

export interface TerminalPaymentMetadata {
  provider: TerminalProvider
  providerId: string
  providerStatus: string
  normalizedStatus: TerminalPaymentStatus
  statusDetail?: string
}

export interface WebhookEvent {
  providerPaymentId: string
  providerStatus: string
  normalizedStatus: TerminalPaymentStatus
  provider: TerminalProvider
  raw?: unknown
}

export const TERMINAL_PROVIDERS: Record<TerminalProvider, string> = {
  mercadopago: 'Mercado Pago Point',
}
