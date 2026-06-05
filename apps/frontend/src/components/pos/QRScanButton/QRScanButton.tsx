'use client'

import { QrCode } from 'lucide-react'

export function QRScanButton() {
  const handleClick = () => {
    // QR scanner functionality TBD
    alert('QR Scanner coming soon')
  }

  return (
    <button
      onClick={handleClick}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
      title="Scan customer QR code"
    >
      <QrCode className="h-5 w-5" />
    </button>
  )
}
