import type { CardOrderStatus, CardPaymentProviderName } from './types'

export function buildPaymentMetadata(
  existing: Record<string, unknown>,
  provider: CardPaymentProviderName,
  providerOrderId: string,
  providerStatus: CardOrderStatus,
  detail?: string,
): Record<string, unknown> {
  return {
    ...existing,
    mpOrderId: providerOrderId,
    mpOrderStatus: providerStatus,
    ...(detail !== undefined ? { mpPaymentDetail: detail } : {}),
    payment: {
      provider,
      providerOrderId,
      providerStatus,
      ...(detail !== undefined ? { detail } : {}),
    },
  }
}
