import { describe, expect, it, vi } from 'vitest'
import { buildWalletWhatsAppMessage, toAbsoluteUrl, openWhatsAppChat } from './wallet'

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

  it('openWhatsAppChat opens wa.me with the digits and message', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    openWhatsAppChat('+52 555 123 4567', 'Hola Ana, quiero un pedido.')
    expect(open).toHaveBeenCalledWith(
      'https://wa.me/525551234567?text=Hola%20Ana%2C%20quiero%20un%20pedido.',
      '_blank',
    )
    open.mockRestore()
  })

  it('openWhatsAppChat falls back to wa.me homepage without phone', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    openWhatsAppChat(null, 'mensaje')
    expect(open).toHaveBeenCalledWith('https://wa.me/?text=mensaje', '_blank')
    open.mockRestore()
  })
})
