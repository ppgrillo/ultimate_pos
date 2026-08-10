import crypto from 'crypto'

const ENCRYPTED_PREFIX = 'enc:'
const SENSITIVE_KEYS = ['mpPointAccessToken', 'mpClientSecret', 'clipApiKey', 'clipApiSecret']

function getKey(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('SETTINGS_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set for settings encryption')
  return crypto.createHash('sha256').update(secret).digest()
}

function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${tag}:${encrypted}`
}

function decrypt(encryptedData: string): string {
  if (!encryptedData.startsWith(ENCRYPTED_PREFIX)) return encryptedData
  const payload = encryptedData.slice(ENCRYPTED_PREFIX.length)
  const [iv, tag, encrypted] = payload.split(':')
  const key = getKey()
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function encryptSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const result = { ...settings }
  for (const key of SENSITIVE_KEYS) {
    if (result[key] && typeof result[key] === 'string') {
      result[key] = encrypt(result[key] as string)
    }
  }
  return result
}

export function decryptSettings(settings: Record<string, unknown>): Record<string, unknown> {
  const result = { ...settings }
  for (const key of SENSITIVE_KEYS) {
    if (result[key] && typeof result[key] === 'string') {
      result[key] = decrypt(result[key] as string)
    }
  }
  return result
}
