import type {
  TerminalPaymentResponse,
  CreateTerminalPaymentParams,
  TerminalInfo,
  WebhookEvent,
  TerminalProvider,
} from '@ultimate-pos/shared'
import type { TerminalProviderService } from './terminal/types'
import { terminalRegistry } from './terminal/registry'

const MP_API_BASE = 'https://api.mercadopago.com'

interface MPOrderResponse {
  id: string
  status: string
  external_reference: string
  transactions: {
    payments: Array<{
      id: string
      status: string
      payment_method: { id: string; type: string; description: string }
      amount: string
      status_detail: string
      statement_descriptor?: string
      installments?: number
    }>
  }
  config: {
    point: {
      terminal_id: string
      print_on_terminal: string
    }
  }
  date_created: string
  date_last_updated: string
  status_detail: string
}

interface MPError {
  message: string
  status: number
  cause?: Array<{ code: string; description: string }>
  errors?: Array<{ code: string; message: string }>
}

const MP_TO_NORMALIZED: Record<string, string> = {
  created: 'created',
  at_terminal: 'awaiting_terminal',
  processing: 'processing',
  processed: 'paid',
  failed: 'failed',
  expired: 'expired',
  canceled: 'cancelled',
  action_required: 'action_required',
}

const WEBHOOK_ACTION_MAP: Record<string, { normalizedStatus: string }> = {
  'order.created': { normalizedStatus: 'created' },
  'order.at_terminal': { normalizedStatus: 'awaiting_terminal' },
  'order.processing': { normalizedStatus: 'processing' },
  'order.processed': { normalizedStatus: 'paid' },
  'order.failed': { normalizedStatus: 'failed' },
  'order.expired': { normalizedStatus: 'expired' },
  'order.canceled': { normalizedStatus: 'cancelled' },
  'order.action_required': { normalizedStatus: 'action_required' },
  'order.refunded': { normalizedStatus: 'paid' },
}

function normalizeStatus(mpStatus: string): string {
  return MP_TO_NORMALIZED[mpStatus] || mpStatus
}

class MPPointProviderService implements TerminalProviderService {
  readonly provider: TerminalProvider = 'mercadopago'
  readonly label = 'Mercado Pago Point'

  private async request<T>(
    accessToken: string,
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const url = `${MP_API_BASE}${path}`
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey
    }
    const bodyStr = body ? JSON.stringify(body) : undefined

    const res = await fetch(url, {
      method,
      headers,
      body: bodyStr,
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      const mpErr = json as MPError | null
      const errorCode = mpErr?.errors?.[0]?.code || mpErr?.cause?.[0]?.code || `http_${res.status}`
      const errorMsg = mpErr?.errors?.[0]?.message || mpErr?.message || `MP API error: ${res.status}`
      const err = new Error(errorMsg) as Error & { status: number; body: unknown; code: string }
      err.status = res.status
      err.body = json
      err.code = errorCode
      throw err
    }

    return json as T
  }

  private toTerminalResponse(mpOrder: MPOrderResponse): TerminalPaymentResponse {
    return {
      providerId: mpOrder.id,
      providerStatus: mpOrder.status,
      normalizedStatus: normalizeStatus(mpOrder.status) as TerminalPaymentResponse['normalizedStatus'],
      paidAmount: mpOrder.transactions?.payments?.[0]?.amount
        ? parseFloat(mpOrder.transactions.payments[0].amount)
        : undefined,
      statusDetail: mpOrder.status_detail,
      raw: mpOrder,
    }
  }

  async createPayment(
    credentials: Record<string, string>,
    params: CreateTerminalPaymentParams,
  ): Promise<TerminalPaymentResponse> {
    const accessToken = credentials.accessToken
    const terminalId = params.terminalId || credentials.terminalId
    if (!accessToken) throw new Error('MP Point access token is required')
    if (!terminalId) throw new Error('MP Point terminal ID is required')

    const idempotencyKey = crypto.randomUUID()
    const amountStr = params.totalAmount.toFixed(2)

    const mpOrder = await this.request<MPOrderResponse>(accessToken, 'POST', '/v1/orders', {
      type: 'point',
      expiration_time: 'PT3M',
      external_reference: params.externalReference,
      description: params.description || 'Ultimate POS payment',
      config: {
        point: {
          terminal_id: terminalId,
          print_on_terminal: 'no_ticket',
        },
        payment_method: {
          default_type: 'debit_card',
        },
      },
      transactions: {
        payments: [
          {
            amount: amountStr,
          },
        ],
      },
    }, idempotencyKey)

    return this.toTerminalResponse(mpOrder)
  }

  async getPayment(
    credentials: Record<string, string>,
    providerPaymentId: string,
  ): Promise<TerminalPaymentResponse> {
    const accessToken = credentials.accessToken
    if (!accessToken) throw new Error('MP Point access token is required')

    const mpOrder = await this.request<MPOrderResponse>(accessToken, 'GET', `/v1/orders/${providerPaymentId}`)
    return this.toTerminalResponse(mpOrder)
  }

  async cancelPayment(
    credentials: Record<string, string>,
    providerPaymentId: string,
  ): Promise<TerminalPaymentResponse> {
    const accessToken = credentials.accessToken
    if (!accessToken) throw new Error('MP Point access token is required')

    const idempotencyKey = crypto.randomUUID()
    const mpOrder = await this.request<MPOrderResponse>(
      accessToken, 'POST', `/v1/orders/${providerPaymentId}/cancel`, undefined, idempotencyKey,
    )
    return this.toTerminalResponse(mpOrder)
  }

  async refundPayment(
    credentials: Record<string, string>,
    providerPaymentId: string,
    amount?: number,
    transactionId?: string,
  ): Promise<TerminalPaymentResponse> {
    const accessToken = credentials.accessToken
    if (!accessToken) throw new Error('MP Point access token is required')

    const idempotencyKey = crypto.randomUUID()
    const body: Record<string, unknown> = {}
    if (transactionId) body.transaction_id = transactionId
    if (amount) body.amount = Math.round(amount * 100)

    const mpOrder = await this.request<MPOrderResponse>(
      accessToken, 'POST', `/v1/orders/${providerPaymentId}/refund`, body, idempotencyKey,
    )
    return this.toTerminalResponse(mpOrder)
  }

  async listTerminals(credentials: Record<string, string>): Promise<TerminalInfo[]> {
    const accessToken = credentials.accessToken
    if (!accessToken) throw new Error('MP Point access token is required')

    const result = await this.request<{ terminals?: Array<{ id: string; name: string; model: string; operating_mode: string }> }>(
      accessToken, 'GET', '/terminals/v1/list',
    )

    return (result.terminals || []).map((t) => ({
      id: t.id,
      name: t.name,
      model: t.model,
      operatingMode: t.operating_mode,
    }))
  }

  async setupTerminal(credentials: Record<string, string>, terminalId: string): Promise<void> {
    const accessToken = credentials.accessToken
    if (!accessToken) throw new Error('MP Point access token is required')

    const idempotencyKey = crypto.randomUUID()
    await this.request(
      accessToken, 'PATCH', '/terminals/v1/setup', {
        terminals: [{ id: terminalId, operating_mode: 'PDV' }],
      }, idempotencyKey,
    )
  }

  async verifyWebhook(request: { body: string; signature: string | undefined }): Promise<boolean> {
    const clientSecret = process.env.MP_CLIENT_SECRET
    if (!clientSecret) {
      console.warn('[mp-point-webhook] MP_CLIENT_SECRET not set — skipping signature validation')
      return true
    }

    const { body, signature: signatureHeader } = request
    if (!signatureHeader) return false

    const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, p) => {
      const [key, value] = p.trim().split('=')
      if (key && value) acc[key] = value
      return acc
    }, {})

    const ts = parts['ts']
    const receivedHash = parts['v1']
    if (!ts || !receivedHash) return false

    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - parseInt(ts, 10)) > 300) return false

    const parsed = JSON.parse(body)
    const orderId = parsed?.data?.id
    const requestId = parsed?.id
    if (!orderId || !requestId) return false

    const dataToSign = `id=${orderId};request-id=${requestId};ts=${ts};`

    const encoder = new TextEncoder()
    const keyData = encoder.encode(clientSecret)
    const messageData = encoder.encode(dataToSign)

    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const signature = await crypto.subtle.sign('HMAC', key, messageData)
    const computed = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return computed === receivedHash
  }

  parseWebhook(body: unknown): WebhookEvent | null {
    const payload = body as { action?: string; data?: { id?: string } }
    if (!payload?.action || !payload?.data?.id) return null

    const mapping = WEBHOOK_ACTION_MAP[payload.action]
    if (!mapping) return null

    return {
      providerPaymentId: payload.data.id,
      providerStatus: payload.action,
      normalizedStatus: mapping.normalizedStatus as WebhookEvent['normalizedStatus'],
      provider: 'mercadopago',
      raw: body,
    }
  }
}

export const mpProvider = new MPPointProviderService()
terminalRegistry.register(mpProvider)
