'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { BadgePercent, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutoPromoToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  promoPin?: string
  className?: string
  title?: string
}

export function AutoPromoToggle({
  enabled,
  onChange,
  promoPin,
  className,
  title,
}: AutoPromoToggleProps) {
  const [pinOpen, setPinOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const handleClick = () => {
    // Pausing auto promos is a sensitive operation — require the store promo PIN when set.
    if (enabled && promoPin) {
      setPinInput('')
      setPinError('')
      setPinOpen(true)
      return
    }
    onChange(!enabled)
  }

  const confirmPin = () => {
    if (pinInput === promoPin) {
      setPinOpen(false)
      setPinInput('')
      setPinError('')
      onChange(false)
    } else {
      setPinError('Código incorrecto')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={enabled}
        aria-label={title ?? (enabled ? 'Promos automáticas activas' : 'Promos automáticas pausadas')}
        title={title ?? (enabled ? 'Promos automáticas activas' : 'Promos automáticas pausadas')}
        className={cn(
          'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          enabled
            ? 'text-primary hover:bg-surface-container hover:text-primary'
            : 'text-on-surface-variant/40 hover:bg-surface-container hover:text-on-surface-variant',
          className,
        )}
      >
        <BadgePercent className="h-5 w-5" />
        {!enabled && (
          <span
            aria-hidden
            className="pointer-events-none absolute h-[2px] w-5 rotate-45 rounded-full bg-current"
          />
        )}
      </button>

      {pinOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4">
            <div className="flex min-h-full items-center justify-center">
              <div className="my-auto w-full max-w-xs space-y-4 rounded-2xl border border-outline-variant bg-surface-container p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline font-bold text-base text-on-surface">Promos automáticas</h3>
                  <button
                    type="button"
                    onClick={() => { setPinOpen(false); setPinInput(''); setPinError('') }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Ingresa el código para pausar las promociones automáticas en esta venta
                </p>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinError('') }}
                  placeholder="••••"
                  autoFocus
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 text-center text-xl font-headline tracking-[0.3em] text-on-surface placeholder:text-on-surface-variant/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                {pinError && (
                  <p className="text-xs text-error text-center">{pinError}</p>
                )}
                <button
                  type="button"
                  onClick={confirmPin}
                  disabled={!pinInput}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-label font-bold text-primary-on disabled:opacity-40 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}