'use client'

import { useAppSelector } from '@/store/hooks'
import type { StoreLoadStatus } from '@/store/slices/storeSlice'
import type { StoreSettings } from '@ultimate-pos/shared'

export interface StoreCheckoutReadiness {
  /** `GET /stores/current` is done and the store (with its settings) is loaded. */
  ready: boolean
  status: StoreLoadStatus
  /**
   * The store's `checkoutMode`, or `null` while it is unknown.
   *
   * Callers must NOT substitute a default here. Defaulting to 'order-only' while
   * the request is in flight hides the payment method selector and submits the
   * order without `payment_method`, which the backend rejects with
   * 400 "Payment method is required".
   */
  checkoutMode: StoreSettings['checkoutMode'] | null
  /** True only when the store says a payment method must be collected. */
  paymentRequired: boolean
  /** Why the action is blocked. */
  blockedReason: 'loading' | 'error' | 'no-store' | null
  /** Copy for the disabled state, or `null` when the action may proceed. */
  blockedMessage: string | null
}

/**
 * Single source of truth for "may I submit a payment with the store's real
 * configuration?".
 *
 * Guards every action that depends on `store.settings.checkoutMode` so a failed or
 * still-pending store load blocks the action instead of silently degrading to a
 * default that the backend will reject.
 */
export function useStoreCheckoutReady(): StoreCheckoutReadiness {
  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const status = useAppSelector((s) => s.storeConfig.status)

  const ready = status === 'ready' && !!store
  const checkoutMode: StoreCheckoutReadiness['checkoutMode'] = ready
    ? (store!.settings?.checkoutMode ?? 'order-only')
    : null
  const paymentRequired = checkoutMode === 'payment-required'

  let blockedReason: StoreCheckoutReadiness['blockedReason'] = null
  let blockedMessage: string | null = null
  if (!ready) {
    if (status === 'error') {
      blockedReason = 'error'
      blockedMessage = 'No pudimos cargar la configuración de la tienda. Revisa tu conexión e inténtalo de nuevo.'
    } else if (status === 'loading') {
      blockedReason = 'loading'
      blockedMessage = 'Cargando configuración de la tienda…'
    } else {
      blockedReason = 'no-store'
      blockedMessage = 'Configuración de tienda no disponible.'
    }
  }

  return { ready, status, checkoutMode, paymentRequired, blockedReason, blockedMessage }
}
