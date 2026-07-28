'use client'

import { useState } from 'react'
import { X, ShieldAlert } from 'lucide-react'

interface SecureActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmLabel?: string
  isLoading?: boolean
  /** When set, the dialog requires this PIN to proceed — null/empty skips the PIN step */
  requiredPin?: string | null
  /** Label shown above the PIN input */
  pinLabel?: string
}

export function SecureActionDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  isLoading = false,
  requiredPin,
  pinLabel = 'Security PIN',
}: SecureActionDialogProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const needsPin = Boolean(requiredPin)

  if (!open) return null

  const handleConfirm = async () => {
    if (needsPin && pin !== requiredPin) {
      setError('Invalid PIN')
      return
    }
    setError('')
    await onConfirm()
    setPin('')
  }

  const handleClose = () => {
    setPin('')
    setError('')
    onOpenChange(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xs rounded-2xl border border-outline-variant bg-surface-container p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            <h3 className="font-headline font-bold text-base text-on-surface">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-on-surface-variant">{description}</p>
        {needsPin && (
          <>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError('') }}
              placeholder={pinLabel}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 text-center text-xl font-headline tracking-[0.3em] text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              autoFocus
            />
            {error && (
              <p className="text-xs text-error text-center">{error}</p>
            )}
          </>
        )}
        <button
          onClick={handleConfirm}
          disabled={(needsPin && !pin) || isLoading}
          className="w-full rounded-xl bg-rose-500 py-2.5 text-sm font-label font-bold text-white hover:bg-rose-600 disabled:opacity-40 transition-colors"
        >
          {isLoading ? 'Processing…' : confirmLabel}
        </button>
      </div>
    </div>
  )
}
