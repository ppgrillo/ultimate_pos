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
    await this.assertOrderIsTrackable(credentials.accessToken, mpOrder.id)
    return this.mapOrder(mpOrder)
  }

  /**
   * An access token can only read orders created by its own application, and a
   * terminal is bound to a merchant account rather than to an application, so a
   * store can easily hold a token from an application configured to notify a
   * different deployment. In that setup the payment is collected and the
   * notification lands somewhere that has no matching order, so the sale is
   * paid and never recorded here.
   *
   * Reading the new order back is the only thing that can detect it before the
   * customer is charged. Only a definite "not found" is fatal, and it is
   * retried once to ride out replication lag. Everything else (transport error,
   * rate limit, unexpected payload) lets the sale through: blocking a live
   * register because the API was briefly unavailable is the worse failure, and
   * the webhook still reconciles payments that go through.
   */
  private async assertOrderIsTrackable(accessToken: string, orderId: string): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const found = await mpService.getOrder(accessToken, orderId)
        if (found?.id === orderId) return

        console.warn(`[mp] order ${orderId} came back without a matching id; treating it as unreadable`)
      } catch (err) {
        const e = err as { status?: number; code?: string }
        const notFound = e.status === 404 || e.code === 'order_not_found'

        if (!notFound) {
          console.warn(
            `[mp] could not verify order ${orderId} (${e.code || e.status}); ` +
            'allowing the sale and relying on the webhook',
          )
          return
        }

        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500))
          continue
        }

        console.error(`[mp] order ${orderId} is not readable with the configured access token`)
        throw new Error(
          'El Access Token de Mercado Pago de esta tienda no puede leer la orden recien creada. ' +
          'Verifica que el token y la terminal pertenezcan a la misma aplicacion antes de cobrar.',
        )
      }
    }
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
      operating_mode: t.operating_mode,
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
