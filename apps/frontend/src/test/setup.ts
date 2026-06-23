import '@testing-library/jest-dom'

class TestHeaders {
  private readonly map = new Map<string, string>()

  constructor(init?: HeadersInit) {
    if (!init) return
    if (init instanceof TestHeaders) {
      init.map.forEach((value, key) => this.map.set(key, value))
      return
    }
    if (Array.isArray(init)) {
      for (const [key, value] of init) this.map.set(key.toLowerCase(), String(value))
      return
    }
    for (const [key, value] of Object.entries(init)) {
      this.map.set(key.toLowerCase(), String(value))
    }
  }

  get(name: string) {
    return this.map.get(name.toLowerCase()) ?? null
  }

  has(name: string) {
    return this.map.has(name.toLowerCase())
  }

  set(name: string, value: string) {
    this.map.set(name.toLowerCase(), value)
  }

  append(name: string, value: string) {
    this.set(name, value)
  }

  delete(name: string) {
    this.map.delete(name.toLowerCase())
  }

  forEach(callback: (value: string, key: string, parent: TestHeaders) => void) {
    this.map.forEach((value, key) => callback(value, key, this))
  }

  entries() {
    return this.map.entries()
  }

  keys() {
    return this.map.keys()
  }

  values() {
    return this.map.values()
  }

  [Symbol.iterator]() {
    return this.map[Symbol.iterator]()
  }
}

class TestRequest {
  url: string
  method: string
  headers: TestHeaders
  body: BodyInit | null
  signal: AbortSignal | null

  constructor(input: RequestInfo | URL, init: RequestInit = {}) {
    this.url = typeof input === 'string' ? input : input.toString()
    this.method = (init.method ?? 'GET').toUpperCase()
    this.headers = new TestHeaders(init.headers)
    this.body = (init.body ?? null) as BodyInit | null
    this.signal = (init.signal ?? null) as AbortSignal | null
  }

  clone() {
    return new TestRequest(this.url, {
      method: this.method,
      headers: this.headers as any,
      body: this.body ?? undefined,
      signal: this.signal ?? undefined,
    })
  }
}

class TestResponse {
  ok: boolean
  status: number
  headers: TestHeaders
  private readonly payload: unknown

  constructor(payload: unknown, init: { status?: number; headers?: HeadersInit } = {}) {
    this.payload = payload
    this.status = init.status ?? 200
    this.ok = this.status >= 200 && this.status < 300
    this.headers = new TestHeaders(init.headers)
  }

  async json() {
    return this.payload
  }

  async text() {
    return typeof this.payload === 'string' ? this.payload : JSON.stringify(this.payload)
  }

  clone() {
    return new TestResponse(this.payload, { status: this.status, headers: this.headers as any })
  }
}

;(globalThis as any).Headers = TestHeaders
;(globalThis as any).Request = TestRequest
;(globalThis as any).Response = TestResponse

;(globalThis as any).fetch = async (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input.toString()
  if (url.includes('/stores/current')) {
    return new TestResponse({ data: { id: 'store-test', settings: {} } }) as any
  }
  if (url.includes('/customers/') && url.includes('/summary')) {
    return new TestResponse({ data: { customer: { id: 'c1' }, recentOrders: [], lastVisit: null, upcomingBirthday: null } }) as any
  }
  return new TestResponse({ data: [] }) as any
}
