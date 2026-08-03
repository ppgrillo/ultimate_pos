'use client'

import { Smartphone, MessageCircle } from 'lucide-react'
import { useState } from 'react'

interface WalletQRProps {
  applePassUrl?: string
  googleSaveUrl?: string
  passId?: string
  customerPhone?: string
}

export function WalletQR({ applePassUrl, googleSaveUrl, passId, customerPhone }: WalletQRProps) {
  const [showQR, setShowQR] = useState<'google' | 'apple' | null>(null)

  if (!passId && !applePassUrl && !googleSaveUrl) return null

  const buildWhatsAppMessage = () => {
    const lines: string[] = []
    lines.push('Your digital loyalty card is ready! Add it to your wallet:')
    lines.push('')
    if (googleSaveUrl) lines.push('Google Wallet: ' + googleSaveUrl)
    if (applePassUrl) lines.push('Apple Wallet: ' + applePassUrl)
    lines.push('')
    lines.push('Open the link on your phone to add it.')
    return lines.join('\n')
  }

  const openWhatsApp = () => {
    const msg = encodeURIComponent(buildWhatsAppMessage())
    const phone = customerPhone?.replace(/\D/g, '')
    const url = phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
  }

  return (
    <div className="rounded-xl bg-surface-container/40 border border-outline-variant/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-on-surface">Digital Wallet</span>
        </div>
        <button
          onClick={openWhatsApp}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Send via WhatsApp
        </button>
      </div>

      {showQR === 'google' && googleSaveUrl && (
        <div className="flex flex-col items-center gap-3 mb-3">
          <div className="rounded-xl bg-white p-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(googleSaveUrl)}`}
              alt="Google Wallet QR"
              className="h-40 w-40"
            />
          </div>
          <p className="text-xs text-center text-on-surface-variant max-w-xs">
            Scan with your Android phone camera to add to Google Wallet
          </p>
        </div>
      )}

      {showQR === 'apple' && applePassUrl && (
        <div className="flex flex-col items-center gap-3 mb-3">
          <div className="rounded-xl bg-white p-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(applePassUrl)}`}
              alt="Apple Wallet QR"
              className="h-40 w-40"
            />
          </div>
          <p className="text-xs text-center text-on-surface-variant max-w-xs">
            Scan with your iPhone camera to add to Apple Wallet
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {googleSaveUrl && (
          <button
            onClick={() => setShowQR(showQR === 'google' ? null : 'google')}
            className={`flex-1 rounded-xl px-3 py-2 text-center text-xs font-bold transition-colors border ${
              showQR === 'google'
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-surface-container border-outline-variant/50 text-on-surface hover:bg-surface-container-hover'
            }`}
          >
            Google Wallet
          </button>
        )}
        {applePassUrl && (
          <button
            onClick={() => setShowQR(showQR === 'apple' ? null : 'apple')}
            className={`flex-1 rounded-xl px-3 py-2 text-center text-xs font-bold transition-colors border ${
              showQR === 'apple'
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-surface-container border-outline-variant/50 text-on-surface hover:bg-surface-container-hover'
            }`}
          >
            Apple Wallet
          </button>
        )}
      </div>
    </div>
  )
}
