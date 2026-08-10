import { mpService } from '../mp-point'
import type {
  CardOrderStatus,
  CardPayment,
  CardProviderCredentials,
  CreateCardPaymentParams,
  PaymentProvider,
  PaymentTerminal,
} from './types'

class MercadoPagoProvider implements PaymentProvider {
  readonly name = 'mercado_pago' as const

  async createPayment(
    params: CreateCardPaymentParams,
    credentials: CardProviderCredentials,
  ): Promise<CardPayment> {
    const mpOrder = await mpService.createOrder(credentials.accessToken, {
      totalAmount: params.totalAmount,
      externalReference: params.externalReference,
      description: params.description || 'Ultimate POS payment',
      terminalId: params.terminalId,
    })
    return this.mapOrder(mpOrder)
  }

  async getPayment(
    providerOrderId: string,
    credentials: CardProviderCredentials,
  ): Promise<CardPayment> {
    return this.mapOrder(
      await mpService.getOrder(credentials.accessToken, providerOrderId),
    )
  }

  async cancelPayment(
    providerOrderId: string,
    credentials: CardProviderCredentials,
  ): Promise<void> {
    await mpService.cancelOrder(credentials.accessToken, providerOrderId)
  }

  async refundPayment(
    providerOrderId: string,
    credentials: CardProviderCredentials,
    transactionId?: string,
    amount?: number,
  ): Promise<void> {
    await mpService.refundOrder(
      credentials.accessToken,
      providerOrderId,
      transactionId,
      amount,
    )
  }

  async listTerminals(
    credentials: CardProviderCredentials,
  ): Promise<PaymentTerminal[]> {
    const result = await mpService.listTerminals(credentials.accessToken)
    const terminals = (result as any)?.data?.terminals ?? []
    return terminals.map((t: any) => ({
      id: t.id,
      name: t.name,
      model: t.model,
      operatingMode: t.operating_mode,
    }))
  }

  async setupTerminal(
    terminalId: string,
    credentials: CardProviderCredentials,
  ): Promise<void> {
    await mpService.setPdvMode(credentials.accessToken, terminalId)
  }

  private mapOrder(mpOrder: {
    id: string
    status: string
    transactions?: {
      payments?: Array<{ status: string; status_detail: string }>
    }
  }): CardPayment {
    return {
      providerOrderId: mpOrder.id,
      status: mpOrder.status as CardOrderStatus,
      paymentDetail: mpOrder.transactions?.payments?.[0]?.status_detail,
      paymentStatus: mpOrder.transactions?.payments?.[0]?.status,
    }
  }
}

export const mercadoPagoProvider = new MercadoPagoProvider()
