import { describe, it, expect } from 'vitest'
import {
  getActiveCardProvider,
  getCardProvider,
  getProviderCredentials,
  getProviderTerminalId,
  isCardPaymentConfigured,
  cardProviderDisplayName,
  DEFAULT_CARD_PROVIDER,
} from './index'
import { mercadoPagoProvider } from './mercadopago.provider'
import { clipProvider } from './clip.provider'

describe('payments factory', () => {
  it('defaults to mercado_pago', () => {
    expect(DEFAULT_CARD_PROVIDER).toBe('mercado_pago')
    expect(getActiveCardProvider(undefined)).toBe('mercado_pago')
    expect(getActiveCardProvider({})).toBe('mercado_pago')
  })

  it('reads activeCardProvider from settings', () => {
    expect(getActiveCardProvider({ activeCardProvider: 'clip' })).toBe('clip')
    expect(getActiveCardProvider({ activeCardProvider: 'mercado_pago' })).toBe('mercado_pago')
    expect(getActiveCardProvider({ activeCardProvider: 'unknown' })).toBe('mercado_pago')
  })

  it('getCardProvider returns the right adapter per provider', () => {
    expect(getCardProvider('mercado_pago')).toBe(mercadoPagoProvider)
    expect(getCardProvider('clip')).toBe(clipProvider)
    expect(getCardProvider()).toBe(mercadoPagoProvider)
  })

  it('getProviderCredentials resolves Clip credentials', () => {
    expect(getProviderCredentials({ clipApiKey: 'k', clipApiSecret: 's' }, 'clip')).toEqual({
      accessToken: 'k',
      clientSecret: 's',
    })
  })

  it('getProviderCredentials falls back to active provider when not specified', () => {
    expect(getProviderCredentials({ activeCardProvider: 'clip', clipApiKey: 'k', clipApiSecret: 's' })).toEqual({
      accessToken: 'k',
      clientSecret: 's',
    })
    expect(getProviderCredentials({ mpPointAccessToken: 't', mpClientSecret: 'c' })).toEqual({
      accessToken: 't',
      clientSecret: 'c',
    })
  })

  it('getProviderTerminalId reads the provider-specific terminal id', () => {
    expect(getProviderTerminalId({ mpPointTerminalId: 'MP-1' })).toBe('MP-1')
    expect(getProviderTerminalId({ clipTerminalId: 'CLIP-1' }, 'clip')).toBe('CLIP-1')
    expect(getProviderTerminalId({ activeCardProvider: 'clip', clipTerminalId: 'CLIP-1' })).toBe('CLIP-1')
  })

  it('isCardPaymentConfigured requires provider-specific enabled flag + credentials + terminal', () => {
    expect(isCardPaymentConfigured({
      mpPointEnabled: true,
      mpPointAccessToken: 't',
      mpPointTerminalId: 'MP-1',
    })).toBe(true)

    expect(isCardPaymentConfigured({
      activeCardProvider: 'clip',
      clipEnabled: true,
      clipApiKey: 'k',
      clipApiSecret: 's',
      clipTerminalId: 'CLIP-1',
    })).toBe(true)

    expect(isCardPaymentConfigured({
      activeCardProvider: 'clip',
      clipEnabled: true,
      clipApiKey: 'k',
      clipTerminalId: 'CLIP-1',
    })).toBe(false)

    expect(isCardPaymentConfigured({
      activeCardProvider: 'clip',
      mpPointEnabled: true,
      mpPointAccessToken: 't',
      mpPointTerminalId: 'MP-1',
    })).toBe(false)
  })

  it('cardProviderDisplayName returns human labels', () => {
    expect(cardProviderDisplayName('mercado_pago')).toBe('Mercado Pago Point')
    expect(cardProviderDisplayName('clip')).toBe('Clip')
  })
})
