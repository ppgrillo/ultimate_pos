import { GoogleAuth } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

export class GoogleWalletService {
  private auth: GoogleAuth | null = null
  private issuerId: string = ''
  private clientInitialized = false

  init() {
    if (this.clientInitialized) return

    this.issuerId = process.env.GOOGLE_WALLET_ISSUER_ID || ''
    if (!this.issuerId) {
      console.warn('⚠️ GOOGLE_WALLET_ISSUER_ID not set')
    }

    const keyPathEnv = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './certs/service-account-key.json'
    let keyFile: string | undefined

    if (keyPathEnv) {
      keyFile = path.isAbsolute(keyPathEnv) ? keyPathEnv : path.resolve(process.cwd(), keyPathEnv)
      if (!fs.existsSync(keyFile)) {
        console.warn(`⚠️ Service account key not found at: ${keyFile}`)
        keyFile = undefined
      }
    }

    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      ...(keyFile ? { keyFile } : {}),
    })
    this.clientInitialized = true
  }

  private async getAccessToken(): Promise<string> {
    this.init()
    if (!this.auth) throw new Error('GoogleAuth not initialized')

    const client = await this.auth.getClient()
    const result = await client.getAccessToken()
    const token = typeof result === 'string' ? result : result?.token
    if (!token) throw new Error('Failed to obtain Google OAuth access token')
    return token
  }

  private async walletRequest(method: string, endpoint: string, data?: unknown) {
    const token = await this.getAccessToken()
    const url = `https://walletobjects.googleapis.com/walletobjects/v1${endpoint}`

    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    const json = await res.json()

    if (!res.ok) {
      const err = new Error(`Google Wallet API error: ${res.status}`) as Error & { status: number; body: unknown }
      err.status = res.status
      err.body = json
      throw err
    }

    return json as Record<string, unknown>
  }

  async createClass(classSuffix: string, classData: Record<string, unknown>) {
    this.init()
    const classId = `${this.issuerId}.${classSuffix}`
    classData.id = classId
    classData.issuerName = classData.issuerName || 'Ultimate POS'
    classData.reviewStatus = classData.reviewStatus || 'UNDER_REVIEW'

    try {
      const result = await this.walletRequest('post', '/loyaltyClass', classData)
      return result
    } catch (err: unknown) {
      const e = err as Error & { status?: number }
      if (e.status === 409) {
        return this.patchClass(classSuffix, classData)
      }
      throw err
    }
  }

  async patchClass(classSuffix: string, updates: Record<string, unknown>) {
    this.init()
    const classId = `${this.issuerId}.${classSuffix}`
    const clean: Record<string, unknown> = { ...updates }
    delete clean.kind
    delete clean.version
    delete clean.id
    if (!clean.reviewStatus) clean.reviewStatus = 'UNDER_REVIEW'

    return this.walletRequest('patch', `/loyaltyClass/${encodeURIComponent(classId)}`, clean)
  }

  async getClass(classSuffix: string) {
    this.init()
    const classId = `${this.issuerId}.${classSuffix}`
    try {
      return await this.walletRequest('get', `/loyaltyClass/${encodeURIComponent(classId)}`)
    } catch (err: unknown) {
      const e = err as Error & { status?: number }
      if (e.status === 404) return null
      throw err
    }
  }

  async createObject(objectSuffix: string, classSuffix: string, objectData: Record<string, unknown>) {
    this.init()
    const objectId = `${this.issuerId}.${objectSuffix}`
    objectData.id = objectId
    objectData.classId = `${this.issuerId}.${classSuffix}`
    objectData.state = objectData.state || 'ACTIVE'

    if (!objectData.barcode) {
      objectData.barcode = { type: 'QR_CODE', value: objectId, alternateText: objectId }
    }

    try {
      return await this.walletRequest('post', '/loyaltyObject', objectData)
    } catch (err: unknown) {
      const e = err as Error & { status?: number }
      if (e.status === 409) {
        return this.patchObject(objectSuffix, objectData)
      }
      throw err
    }
  }

  async patchObject(objectSuffix: string, updates: Record<string, unknown>) {
    this.init()
    const objectId = `${this.issuerId}.${objectSuffix}`
    const clean: Record<string, unknown> = { ...updates }
    delete clean.kind
    delete clean.version
    delete clean.id
    delete clean.classId

    return this.walletRequest('patch', `/loyaltyObject/${encodeURIComponent(objectId)}`, clean)
  }

  async getObject(objectSuffix: string) {
    this.init()
    const objectId = `${this.issuerId}.${objectSuffix}`
    try {
      return await this.walletRequest('get', `/loyaltyObject/${encodeURIComponent(objectId)}`)
    } catch (err: unknown) {
      const e = err as Error & { status?: number }
      if (e.status === 404) return null
      throw err
    }
  }

  async expireObject(objectSuffix: string) {
    return this.patchObject(objectSuffix, { state: 'EXPIRED' })
  }

  async generateJwt(objectSuffix: string, classSuffix: string) {
    this.init()
    if (!this.auth) throw new Error('GoogleAuth not initialized')

    const credentials = await this.auth.getCredentials()
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('Service account credentials required for JWT signing')
    }

    const objectId = `${this.issuerId}.${objectSuffix}`
    const classId = `${this.issuerId}.${classSuffix}`

    const claims = {
      iss: credentials.client_email,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      origins: [],
      payload: {
        loyaltyObjects: [{
          id: objectId,
          classId,
          state: 'ACTIVE',
        }],
      },
    }

    const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' })
    return `https://pay.google.com/gp/v/save/${token}`
  }
}
