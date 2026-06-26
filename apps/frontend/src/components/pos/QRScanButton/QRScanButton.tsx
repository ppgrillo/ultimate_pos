'use client'

import { QrCode, X } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { useScanLoyaltyBarcodeMutation } from '../../../store/api'

interface QRScanButtonProps {
  onCustomerFound?: (customer: { id: string; name: string; loyalty_card_id?: string; points?: number }) => void
}

export function QRScanButton({ onCustomerFound }: QRScanButtonProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [scan] = useScanLoyaltyBarcodeMutation()

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setError('Camera access denied')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const handleOpen = () => {
    setOpen(true)
    startCamera()
  }

  const handleClose = () => {
    setOpen(false)
    setError(null)
    stopCamera()
  }

  const handleDetect = async () => {
    setError(null)
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    try {
      const { default: jsQR } = await import('jsqr')
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (!code) {
        setError('No QR code found')
        return
      }

      const result = await scan({ barcode: code.data }).unwrap()
      handleClose()
      onCustomerFound?.({
        id: result.customer_id,
        name: '',
        loyalty_card_id: result.id,
        points: result.points,
      })
    } catch {
      setError('Failed to scan')
    }
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
        title="Scan customer QR code"
      >
        <QrCode className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative rounded-2xl bg-surface-container p-4 w-full max-w-md">
        <button onClick={handleClose} className="absolute right-3 top-3 text-on-surface-variant hover:text-on-surface">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-on-surface mb-3">Scan Loyalty QR</h3>
        <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl bg-black aspect-square" />
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
        <button
          onClick={handleDetect}
          className="mt-3 w-full rounded-xl bg-primary py-3 font-bold text-on-primary hover:bg-primary/90 transition-colors"
        >
          Detect QR
        </button>
      </div>
    </div>
  )
}
