import type {
  TerminalProvider,
  CreateTerminalPaymentParams,
  TerminalPaymentResponse,
  TerminalInfo,
  WebhookEvent,
} from '@ultimate-pos/shared'

export interface TerminalProviderService {
  readonly provider: TerminalProvider
  readonly label: string

  createPayment(
    credentials: Record<string, string>,
    params: CreateTerminalPaymentParams,
  ): Promise<TerminalPaymentResponse>

  getPayment(
    credentials: Record<string, string>,
    providerPaymentId: string,
  ): Promise<TerminalPaymentResponse>

  cancelPayment(
    credentials: Record<string, string>,
    providerPaymentId: string,
  ): Promise<TerminalPaymentResponse>

  refundPayment(
    credentials: Record<string, string>,
    providerPaymentId: string,
    amount?: number,
    transactionId?: string,
  ): Promise<TerminalPaymentResponse>

  listTerminals(credentials: Record<string, string>): Promise<TerminalInfo[]>

  setupTerminal?(credentials: Record<string, string>, terminalId: string): Promise<void>

  verifyWebhook?(request: {
    body: string
    signature: string | undefined
  }): Promise<boolean>

  parseWebhook?(body: unknown): WebhookEvent | null
}
