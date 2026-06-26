'use client'

import { QrCode, Smartphone } from 'lucide-react'
import { useState } from 'react'

interface WalletQRProps {
  applePassUrl?: string
  googleSaveUrl?: string
  passId?: string
}

export function WalletQR({ applePassUrl, googleSaveUrl, passId }: WalletQRProps) {
  const [showQR, setShowQR] = useState(false)

  if (!passId && !applePassUrl && !googleSaveUrl) return null

  const qrValue = googleSaveUrl || applePassUrl || ''

  return (
    <div className="rounded-xl bg-surface-container/40 border border-outline-variant/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-on-surface">Digital Wallet</span>
        </div>
        <button
          onClick={() => setShowQR(!showQR)}
          className="flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <QrCode className="h-4 w-4" />
          {showQR ? 'Hide' : 'Show QR'}
        </button>
      </div>

      {showQR && qrValue && (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-white p-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}`}
              alt="Wallet QR"
              className="h-40 w-40"
            />
          </div>
          <p className="text-xs text-center text-on-surface-variant max-w-xs">
            Scan with your phone camera to add the loyalty card to your digital wallet
          </p>
        </div>
      )}

      {!showQR && (
        <div className="flex gap-2">
          {googleSaveUrl && (
            <a
              href={googleSaveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl bg-surface-container px-3 py-2 text-center text-xs font-bold text-on-surface hover:bg-surface-container-hover border border-outline-variant/50 transition-colors"
            >
              Google Wallet
            </a>
          )}
          {applePassUrl && (
            <a
              href={applePassUrl}
              className="flex-1 rounded-xl bg-surface-container px-3 py-2 text-center text-xs font-bold text-on-surface hover:bg-surface-container-hover border border-outline-variant/50 transition-colors"
            >
              Apple Wallet
            </a>
          )}
        </div>
      )}
    </div>
  )
}
