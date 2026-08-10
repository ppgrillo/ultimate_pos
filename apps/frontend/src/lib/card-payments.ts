import type { CardPaymentProviderName, OrderPaymentMetadata } from '@ultimate-pos/shared'

export const DEFAULT_CARD_PROVIDER: CardPaymentProviderName = 'mercado_pago'

export function getActiveCardProvider(
  settings: unknown,
): CardPaymentProviderName {
  const configured = (settings as { activeCardProvider?: CardPaymentProviderName } | null | undefined)?.activeCardProvider
  if (configured === 'mercado_pago' || configured === 'clip') return configured
  return DEFAULT_CARD_PROVIDER
}

export function cardProviderDisplayName(
  provider: CardPaymentProviderName,
): string {
  if (provider === 'clip') return 'Clip'
  return 'Mercado Pago Point'
}

export function cardProviderShortName(
  provider: CardPaymentProviderName,
): string {
  if (provider === 'clip') return 'Clip'
  return 'Point'
}

export interface OrderPaymentInfo {
  providerOrderId?: string
  providerStatus?: string
  detail?: string
}

export function readOrderPayment(
  metadata: unknown,
): OrderPaymentInfo {
  if (!metadata) return {}
  const meta = metadata as Record<string, unknown> | null | undefined
  if (!meta) return {}
  const payment = meta.payment as OrderPaymentMetadata | undefined
  return {
    providerOrderId:
      payment?.providerOrderId ?? (meta.mpOrderId as string | undefined),
    providerStatus:
      payment?.providerStatus ?? (meta.mpOrderStatus as string | undefined),
    detail:
      payment?.detail ?? (meta.mpPaymentDetail as string | undefined),
  }
}
