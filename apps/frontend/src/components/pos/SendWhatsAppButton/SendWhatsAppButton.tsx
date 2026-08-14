'use client'

import { Loader2, MessageCircle } from 'lucide-react'
import { openWhatsApp, toAbsoluteUrl } from '@/lib/wallet'
import { cn } from '@/lib/utils'

interface SendWhatsAppButtonProps {
  applePassUrl?: string
  googleSaveUrl?: string
  customerPhone?: string
  className?: string
  iconOnly?: boolean
  loading?: boolean
}

export function SendWhatsAppButton({ applePassUrl, googleSaveUrl, customerPhone, className, iconOnly, loading }: SendWhatsAppButtonProps) {
  if (!loading && !applePassUrl && !googleSaveUrl) return null

  const appleUrl = toAbsoluteUrl(applePassUrl)
  const ariaLabel = 'Enviar por WhatsApp'

  if (loading) {
    return (
      <button
        disabled
        aria-label="Preparando tarjeta de fidelidad"
        title="Generando tarjeta de Google Wallet…"
        className={cn(
          'flex items-center justify-center gap-2 rounded-lg bg-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface-variant cursor-wait',
          iconOnly && 'h-9 w-9 rounded-full px-0',
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {!iconOnly && 'Preparando tarjeta…'}
      </button>
    )
  }

  if (iconOnly) {
    return (
      <button
        onClick={() => openWhatsApp({ googleSaveUrl, appleUrl, phone: customerPhone })}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors',
          className,
        )}
      >
        <MessageCircle className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      onClick={() => openWhatsApp({ googleSaveUrl, appleUrl, phone: customerPhone })}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors',
        className,
      )}
    >
      <MessageCircle className="h-4 w-4" />
      Enviar por WhatsApp
    </button>
  )
}
