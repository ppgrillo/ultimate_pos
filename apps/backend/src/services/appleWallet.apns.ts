import http2 from 'http2'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

function resolveP8(raw: string): string {
  if (path.isAbsolute(raw)) return raw
  const fromCwd = path.resolve(process.cwd(), raw)
  if (fs.existsSync(fromCwd)) return fromCwd
  const filename = path.basename(raw)
  const fromDockerCerts = path.resolve(process.cwd(), 'certs', filename)
  if (fs.existsSync(fromDockerCerts)) return fromDockerCerts
  return fromCwd
}

export async function sendApplePushNotification(
  deviceToken: string,
  payload: Record<string, unknown> = {},
): Promise<{ status: number; reason?: string }> {
  const keyId = process.env.APPLE_APNS_KEY_ID
  const teamId = process.env.APPLE_APNS_TEAM_ID || process.env.APPLE_TEAM_ID
  const topic = process.env.APPLE_APNS_TOPIC || process.env.APPLE_PASS_TYPE_IDENTIFIER
  const p8PathEnv = process.env.APPLE_APNS_P8_PATH || './certs/AuthKey_KH9WM9N3FR.p8'

  const p8Path = resolveP8(p8PathEnv)

  if (!keyId || !teamId || !topic) {
    console.warn('⚠️ Missing APNs env vars, skipping push notification')
    return { status: 0, reason: 'MissingEnvVars' }
  }

  if (!fs.existsSync(p8Path)) {
    console.warn(`⚠️ APNs p8 key not found at: ${p8Path}`)
    return { status: 0, reason: 'KeyFileNotFound' }
  }

  const token = jwt.sign(
    { iss: teamId, iat: Math.floor(Date.now() / 1000) },
    fs.readFileSync(p8Path),
    { algorithm: 'ES256', header: { alg: 'ES256', kid: keyId } },
  )

  const useDev = process.env.APPLE_APNS_USE_DEVELOPMENT === 'true'
  const host = useDev ? 'api.development.push.apple.com' : 'api.push.apple.com'

  const finalPayload = payload?.aps ? payload : { ...payload, aps: { 'content-available': 1 } }
  const body = JSON.stringify(finalPayload)

  const client = http2.connect(`https://${host}`)

  client.on('error', (err) => {
    console.error(`❌ APNs HTTP/2 error: ${err.message}`)
  })

  const req = client.request({
    ':method': 'POST',
    ':path': `/3/device/${deviceToken}`,
    authorization: `bearer ${token}`,
    'apns-topic': topic,
    'apns-push-type': 'background',
    'apns-expiration': '0',
    'apns-priority': '5',
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body).toString(),
  })

  return new Promise<{ status: number; reason?: string }>((resolve) => {
    req.on('response', (headers) => {
      const status = Number(headers[':status'] || 0)
      const chunks: Buffer[] = []

      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString()
        let reason: string | undefined
        try { reason = JSON.parse(responseBody)?.reason } catch { /* ignore */ }

        if (status !== 200) {
          console.warn(`⚠️ APNs push rejected (${status}) for device ${deviceToken.slice(0, 8)}... reason: ${reason || 'unknown'}`)
        }
        client.destroy()
        resolve({ status, reason })
      })
    })

    req.on('error', (err) => {
      console.error(`❌ APNs request error: ${err.message}`)
      client.destroy()
      resolve({ status: 0, reason: err.message })
    })

    req.write(body)
    req.end()
  })
}
