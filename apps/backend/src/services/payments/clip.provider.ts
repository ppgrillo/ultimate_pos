import type {
  CardOrderStatus,
  CardPayment,
  CardProviderCredentials,
  CreateCardPaymentParams,
  PaymentProvider,
  PaymentTerminal,
} from './types'

const PINPAD_API_BASE = 'https://api.payclip.io/f2f/pinpad/v1'
const REFUNDS_API_BASE = 'https://api.payclip.com'

interface ClipPinpadResponse {
  pinpad_request_id: string
  reference?: string
  amount?: string | number
  amount_paid?: string | number
  tip_amount?: string | number
  create_date?: string
  status?: string
  detail?: {
    results?: Array<{
      id?: string
      transaction_id?: string
      type?: string
      entry_mode?: string
      installments?: number
      status?: string
    }>
  }
}

interface ClipDevicesResponse {
  data?: Array<{
    serial_number?: string
    serial?: string
    name?: string
    status?: string
    model?: string
  }>
  devices?: Array<{
    serial_number?: string
    serial?: string
    name?: string
    status?: string
    model?: string
  }>
}

export interface ClipError {
  code?: string
  name?: string
  message?: string
}

function getWebhookUrl(): string | undefined {
  const base = process.env.PUBLIC_API_URL
  if (!base) return undefined
  return `${base.replace(/\/+$/, '')}/webhooks/clip-pinpad`
}

function toAmountStr(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2)
}

class ClipProvider implements PaymentProvider {
  readonly name = 'clip' as const

  private basicAuth(credentials: CardProviderCredentials): string {
    const token = Buffer.from(`${credentials.accessToken}:${credentials.clientSecret || ''}`).toString('base64')
    return `Basic ${token}`
  }

  private async request<T>(
    baseUrl: string,
    credentials: CardProviderCredentials,
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${baseUrl}${path}`
    const headers: Record<string, string> = {
      'Authorization': this.basicAuth(credentials),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...extraHeaders,
    }
    const bodyStr = body ? JSON.stringify(body) : undefined
    console.log(`[clip-service] >> ${method} ${path}${bodyStr ? ' ' + bodyStr.slice(0, 500) : ''}`)

    const res = await fetch(url, {
      method,
      headers,
      body: bodyStr,
    })

    const json = await res.json().catch(() => null)
    console.log(`[clip-service] << ${res.status}`, JSON.stringify(json)?.slice(0, 800))

    if (!res.ok) {
      const clipErr = json as ClipError | null
      const code = clipErr?.code || clipErr?.name || `http_${res.status}`
      const message = clipErr?.message || clipErr?.name || `Clip API error: ${res.status}`
      const err = new Error(message) as Error & { status: number; body: unknown; code: string }
      err.status = res.status
      err.body = json
      err.code = code
      throw err
    }

    return json as T
  }

  async createPayment(
    params: CreateCardPaymentParams,
    credentials: CardProviderCredentials,
  ): Promise<CardPayment> {
    if (!credentials.accessToken || !credentials.clientSecret) {
      throw new Error('Clip API key and secret are required')
    }

    const webhookUrl = getWebhookUrl()
    const response = await this.request<ClipPinpadResponse>(PINPAD_API_BASE, credentials, 'POST', '/payment', {
      amount: toAmountStr(params.totalAmount),
      tip_amount: '0.00',
      reference: params.externalReference,
      serial_number_pos: params.terminalId,
      ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
      preferences: {
        is_auto_return_enabled: true,
        is_tip_enabled: false,
        is_msi_enabled: false,
        is_mci_enabled: false,
        is_dcc_enabled: false,
        is_retry_enabled: false,
        is_share_enabled: false,
        is_auto_print_receipt_enabled: false,
        is_split_payment_enabled: false,
        redirect_package_name: 'com.payclip.blaze.client.app',
      },
    })

    return {
      providerOrderId: response.pinpad_request_id,
      status: 'at_terminal',
    }
  }

  async getPayment(
    providerOrderId: string,
    credentials: CardProviderCredentials,
  ): Promise<CardPayment> {
    const response = await this.request<ClipPinpadResponse>(
      PINPAD_API_BASE,
      credentials,
      'GET',
      `/payment?pinpadRequestId=${encodeURIComponent(providerOrderId)}`,
      undefined,
      { 'Pinpad-Include-Detail': 'true' },
    )
    return this.mapPayment(response)
  }

  async cancelPayment(
    providerOrderId: string,
    credentials: CardProviderCredentials,
  ): Promise<void> {
    try {
      await this.request<unknown>(
        PINPAD_API_BASE,
        credentials,
        'DELETE',
        `/payment/${encodeURIComponent(providerOrderId)}`,
      )
    } catch (err: unknown) {
      // The intent can only be cancelled before the terminal picks it up.
      const e = err as { status?: number; message?: string }
      const cancelErr = new Error(
        `Clip terminal already has this payment or it could not be cancelled: ${e?.message || 'unknown error'}`,
      ) as Error & { status: number; body: unknown; code: string }
      cancelErr.status = e?.status || 0
      cancelErr.code = 'cannot_cancel_order'
      cancelErr.body = (err as { body?: unknown })?.body
      throw cancelErr
    }
  }

  async refundPayment(
    providerOrderId: string,
    credentials: CardProviderCredentials,
    _transactionId?: string,
    amount?: number,
  ): Promise<void> {
    const payment = await this.getPayment(providerOrderId, credentials)
    const result = (payment as CardPayment & { transactionId?: string }).transactionId
    const transactionId = _transactionId || result

    if (!transactionId) {
      throw new Error('No Clip transaction id found for refund')
    }

    const refundAmount = amount !== undefined
      ? amount
      : Number((payment as CardPayment & { paidAmount?: number }).paidAmount) || 0

    if (!refundAmount) {
      throw new Error('No payable amount found for Clip refund')
    }

    await this.request<unknown>(REFUNDS_API_BASE, credentials, 'POST', '/refunds', {
      amount: refundAmount,
      reason: 'Reembolso desde Ultimate POS',
      reference: {
        type: 'transaction',
        id: transactionId,
      },
    })
  }

  async listTerminals(
    credentials: CardProviderCredentials,
  ): Promise<PaymentTerminal[]> {
    const response = await this.request<ClipDevicesResponse>(PINPAD_API_BASE, credentials, 'GET', '/devices/status')
    const raw = Array.isArray(response) ? response : response?.data || response?.devices || []
    return raw.map((d) => ({
      id: d.serial_number || d.serial || d.name || '',
      name: d.name || d.serial_number || d.serial || '',
      model: d.model,
      operatingMode: d.status,
    })).filter((t) => t.id)
  }

  async setupTerminal(_terminalId: string, _credentials: CardProviderCredentials): Promise<void> {
    // Clip PinPad has no equivalent to MP's PDV mode setup — no-op.
  }

  private mapPayment(response: ClipPinpadResponse): CardPayment {
    const firstResult = response.detail?.results?.[0]

    let status = this.mapStatus(response.status)
    if (status === 'processing' && firstResult && /^approved$/i.test(firstResult.status || '')) {
      status = 'processed'
    }

    const result: CardPayment & {
      transactionId?: string
      paidAmount?: number
    } = {
      providerOrderId: response.pinpad_request_id,
      status,
    }

    if (firstResult) {
      result.paymentStatus = firstResult.status
      result.paymentDetail = firstResult.status || firstResult.entry_mode
      result.transactionId = firstResult.id || firstResult.transaction_id
    }

    const paidAmount = Number(response.amount_paid ?? response.amount ?? 0)
    if (paidAmount > 0) {
      result.paidAmount = paidAmount
    }

    return result
  }

  private mapStatus(status?: string): CardOrderStatus {
    switch ((status || '').trim().toUpperCase()) {
      case 'COMPLETED':
      case 'APPROVED':
      case 'PAID':
      case 'SUCCESS':
        return 'processed'
      case 'CANCELED':
      case 'CANCELLED':
        return 'canceled'
      case 'DECLINED':
      case 'REJECTED':
      case 'FAILED':
        return 'failed'
      case 'EXPIRED':
      case 'TIMEOUT':
        return 'expired'
      case 'IN_PROGRESS':
      case 'PENDING':
      case 'CREATED':
      case 'OPEN':
      case 'WAITING':
        return 'processing'
      default:
        return 'processing'
    }
  }
}

export const clipProvider = new ClipProvider()
