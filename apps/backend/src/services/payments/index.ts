import { mercadoPagoProvider } from './mercadopago.provider'
import type {
  CardPaymentProviderName,
  CardProviderCredentials,
  PaymentProvider,
} from './types'

export const DEFAULT_CARD_PROVIDER: CardPaymentProviderName = 'mercado_pago'

export function getActiveCardProvider(
  settings: Record<string, unknown> | null | undefined,
): CardPaymentProviderName {
  const configured = settings?.activeCardProvider as CardPaymentProviderName | undefined
  if (configured === 'mercado_pago' || configured === 'clip') return configured
  return DEFAULT_CARD_PROVIDER
}

export function getCardProvider(
  name: CardPaymentProviderName = DEFAULT_CARD_PROVIDER,
): PaymentProvider {
  return mercadoPagoProvider
}

export function getProviderCredentials(
  settings: Record<string, unknown> | null | undefined,
  provider?: CardPaymentProviderName,
): CardProviderCredentials {
  const resolved = provider ?? getActiveCardProvider(settings)
  if (resolved === 'clip') {
    return {
      accessToken: (settings?.clipApiKey as string) || '',
      clientSecret: (settings?.clipApiSecret as string) || '',
    }
  }
  return {
    accessToken: (settings?.mpPointAccessToken as string) || '',
    clientSecret: (settings?.mpClientSecret as string) || '',
  }
}

export function getProviderTerminalId(
  settings: Record<string, unknown> | null | undefined,
): string {
  return (settings?.mpPointTerminalId as string) || ''
}

export function isCardPaymentConfigured(
  settings: Record<string, unknown> | null | undefined,
): boolean {
  const enabled = (settings?.mpPointEnabled as boolean) ?? false
  const credentials = getProviderCredentials(settings)
  const terminalId = getProviderTerminalId(settings)
  return enabled && Boolean(credentials.accessToken) && Boolean(terminalId)
}

export function cardProviderDisplayName(
  provider: CardPaymentProviderName,
): string {
  if (provider === 'clip') return 'Clip'
  return 'Mercado Pago Point'
}

export type { CardPaymentProviderName, CardProviderCredentials, PaymentProvider } from './types'
