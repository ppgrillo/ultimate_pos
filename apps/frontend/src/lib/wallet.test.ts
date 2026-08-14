import { buildWalletWhatsAppMessage, toAbsoluteUrl } from './wallet'

describe('wallet helpers', () => {
  it('builds the Spanish WhatsApp message', () => {
    const message = buildWalletWhatsAppMessage({
      googleSaveUrl: 'https://pay.google.com/g/1',
      appleUrl: 'https://example.com/pass/1',
    })
    expect(message).toContain('¡Tu tarjeta digital de fidelidad está lista! Añádela a tu billetera:')
    expect(message).toContain('Google Wallet: https://pay.google.com/g/1')
    expect(message).toContain('Apple Wallet: https://example.com/pass/1')
    expect(message).toContain('Abre el enlace en tu teléfono para añadirla.')
  })

  it('omits wallet links that are not provided', () => {
    const message = buildWalletWhatsAppMessage({ appleUrl: 'https://example.com/pass/1' })
    expect(message).not.toContain('Google Wallet')
    expect(message).toContain('Apple Wallet: https://example.com/pass/1')
  })

  it('toAbsoluteUrl resolves relative paths against the origin', () => {
    expect(toAbsoluteUrl('https://x.com/a')).toBe('https://x.com/a')
    expect(toAbsoluteUrl('/api/wallet/apple/1/download')).toBe('http://localhost:3000/api/wallet/apple/1/download')
    expect(toAbsoluteUrl(undefined)).toBeUndefined()
  })
})
