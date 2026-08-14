export function toAbsoluteUrl(url?: string): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`
}

export interface WalletWhatsAppMessageParams {
  googleSaveUrl?: string
  appleUrl?: string
}

export function buildWalletWhatsAppMessage({ googleSaveUrl, appleUrl }: WalletWhatsAppMessageParams): string {
  const lines: string[] = []
  lines.push('¡Tu tarjeta digital de fidelidad está lista! Añádela a tu billetera:')
  lines.push('')
  if (googleSaveUrl) lines.push('Google Wallet: ' + googleSaveUrl)
  if (appleUrl) lines.push('Apple Wallet: ' + appleUrl)
  lines.push('')
  lines.push('Abre el enlace en tu teléfono para añadirla.')
  return lines.join('\n')
}

export interface OpenWhatsAppParams extends WalletWhatsAppMessageParams {
  phone?: string
}

export function openWhatsApp({ googleSaveUrl, appleUrl, phone }: OpenWhatsAppParams): void {
  const message = encodeURIComponent(buildWalletWhatsAppMessage({ googleSaveUrl, appleUrl }))
  const digits = phone?.replace(/\D/g, '')
  const url = digits
    ? `https://wa.me/${digits}?text=${message}`
    : `https://wa.me/?text=${message}`
  window.open(url, '_blank')
}
