const MP_API_BASE = 'https://api.mercadopago.com'

export interface MPCreateOrderParams {
  totalAmount: number
  externalReference: string
  description?: string
  terminalId: string
}

export interface MPOrderResponse {
  id: string
  status: string
  external_reference: string
  transactions: {
    payments: Array<{
      id: string
      status: string
      payment_method: {
        id: string
        type: string
        description: string
      }
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

export interface MPError {
  message: string
  status: number
  cause?: Array<{ code: string; description: string }>
  errors?: Array<{ code: string; message: string }>
}

class MPService {
  private apiBase = MP_API_BASE

  private async request<T>(
    accessToken: string,
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const url = `${this.apiBase}${path}`
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey
    }
    const bodyStr = body ? JSON.stringify(body) : undefined
    console.log(`[mp-service] >> ${method} ${path}`, bodyStr?.slice(0, 500))

    const res = await fetch(url, {
      method,
      headers,
      body: bodyStr,
    })

    const json = await res.json().catch(() => null)
    console.log(`[mp-service] << ${res.status}`, JSON.stringify(json)?.slice(0, 800))

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

  async createOrder(
    accessToken: string,
    params: MPCreateOrderParams,
  ): Promise<MPOrderResponse> {
    const idempotencyKey = crypto.randomUUID()
    const amountStr = params.totalAmount.toFixed(2)
    return this.request<MPOrderResponse>(accessToken, 'POST', '/v1/orders', {
      type: 'point',
      external_reference: params.externalReference,
      description: params.description || 'Ultimate POS payment',
      config: {
        point: {
          terminal_id: params.terminalId,
          print_on_terminal: 'no_ticket',
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
  }

  async getOrder(
    accessToken: string,
    orderId: string,
  ): Promise<MPOrderResponse> {
    return this.request<MPOrderResponse>(accessToken, 'GET', `/v1/orders/${orderId}`)
  }

  async cancelOrder(
    accessToken: string,
    orderId: string,
  ): Promise<MPOrderResponse> {
    const idempotencyKey = crypto.randomUUID()
    return this.request<MPOrderResponse>(accessToken, 'POST', `/v1/orders/${orderId}/cancel`, undefined, idempotencyKey)
  }

  async refundOrder(
    accessToken: string,
    orderId: string,
    transactionId?: string,
    amount?: number,
  ): Promise<MPOrderResponse> {
    const idempotencyKey = crypto.randomUUID()
    const body: Record<string, unknown> = {}
    if (transactionId) body.transaction_id = transactionId
    if (amount) body.amount = Math.round(amount * 100)
    return this.request<MPOrderResponse>(accessToken, 'POST', `/v1/orders/${orderId}/refund`, body, idempotencyKey)
  }

  async listTerminals(accessToken: string): Promise<{ terminals: Array<{ id: string; name: string; model: string; operating_mode: string }> }> {
    return this.request(accessToken, 'GET', '/terminals/v1/list')
  }

  async setPdvMode(accessToken: string, terminalId: string): Promise<void> {
    const idempotencyKey = crypto.randomUUID()
    await this.request(accessToken, 'PATCH', '/terminals/v1/setup', {
      terminals: [{ id: terminalId, operating_mode: 'PDV' }],
    }, idempotencyKey)
  }
}

export const mpService = new MPService()
