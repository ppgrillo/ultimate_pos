'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Loader2, AlertCircle, CheckCircle2, X, Scan } from 'lucide-react'
import { useAppDispatch } from '@/store/hooks'
import { setSelectedCustomer } from '@/store/slices/customersSlice'
import { setCustomer } from '@/store/slices/cartSlice'
import { useScanLoyaltyBarcodeMutation } from '@/store/api'
import { cn } from '@/lib/utils'
import type { ScanLoyaltyResult } from '@ultimate-pos/shared'

interface QRScannerPopoverProps {
  open: boolean
  onClose: () => void
  variant?: 'popover' | 'modal' | 'inline'
  onScan?: (barcode: string) => Promise<ScanLoyaltyResult>
  onScanSuccess?: (result: ScanLoyaltyResult) => void
}

export function QRScannerPopover({ open, onClose, variant = 'popover', onScan, onScanSuccess }: QRScannerPopoverProps) {
  const dispatch = useAppDispatch()
  const [scanLoyalty] = useScanLoyaltyBarcodeMutation()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const onScanSuccessRef = useRef(onScanSuccess)
  onScanSuccessRef.current = onScanSuccess

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isProcessingRef = useRef<boolean>(false)
  const lastScannedRef = useRef<string | null>(null)
  const isMountedRef = useRef(false)
  const containerId = 'qr-scanner-reader'

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return

    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }
      await scanner.clear()
    } catch {
      // cleanup
    } finally {
      scannerRef.current = null
      const container = document.getElementById(containerId)
      if (container) container.innerHTML = ''
    }
  }, [])

  useEffect(() => {
    if (!open) return

    isMountedRef.current = true
    setIsSuccess(false)
    setError(null)
    setCameraError(null)
    setIsLoading(false)
    isProcessingRef.current = false
    lastScannedRef.current = null

    const startScanner = async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      if (!isMountedRef.current) return

      const container = document.getElementById(containerId)
      if (!container) return

      try {
        const scanner = new Html5Qrcode(containerId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.0 },
          (decodedText) => {
            if (isProcessingRef.current || lastScannedRef.current === decodedText) return

            const scannedCode = decodedText.trim()
            if (!scannedCode) return

            isProcessingRef.current = true
            lastScannedRef.current = decodedText
            setIsLoading(true)
            setError(null)

            const handleResult = (result: ScanLoyaltyResult) => {
              const { customer, loyaltyCard } = result
              if (!customer) throw new Error('Cliente no encontrado')

              if (!onScanRef.current) {
                const customerWithLoyalty = {
                  ...customer,
                  loyalty: {
                    tier: loyaltyCard.tier,
                    points: loyaltyCard.points,
                  },
                }

                dispatch(setSelectedCustomer(customerWithLoyalty))
                dispatch(setCustomer({
                  id: customer.id,
                  name: customer.name,
                  tier: loyaltyCard.tier,
                  points: loyaltyCard.points,
                  loyalty_card_id: loyaltyCard.id,
                }))
              }

              onScanSuccessRef.current?.(result)

              stopScanner()
              setIsSuccess(true)
              setIsLoading(false)

              setTimeout(() => {
                if (isMountedRef.current) onCloseRef.current()
              }, 800)
            }

            const scanPromise = onScanRef.current
              ? onScanRef.current(scannedCode)
              : scanLoyalty({ barcode: scannedCode }).unwrap()

            scanPromise
              .then(handleResult)
              .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : 'QR no válido o no reconocido'
                setIsLoading(false)
                isProcessingRef.current = false
                setError(message)

                setTimeout(() => {
                  isProcessingRef.current = false
                  lastScannedRef.current = null
                  setError(null)
                }, 3000)
              })
          },
          () => {},
        )
      } catch {
        if (isMountedRef.current) {
          setCameraError('Error al acceder a la cámara')
        }
      }
    }

    startScanner()

    return () => {
      isMountedRef.current = false
      stopScanner()
    }
  }, [open, stopScanner, scanLoyalty, dispatch])

  if (!open) return null

  const isInline = variant === 'inline'

  const cameraBody = (
    <>
      <div className="relative w-[200px] h-[200px] bg-black rounded-2xl overflow-hidden">
        <div id={containerId} className="absolute inset-0" />

        {!cameraError && !isSuccess && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 shadow-[inset_0_0_0_40px_rgba(0,0,0,0.35)] rounded-2xl" />
            <div className="absolute left-8 right-8 h-px bg-primary"
              style={{
                top: '50%',
                boxShadow: '0 0 8px #ccff00',
                animation: 'scanLaser 2s ease-in-out infinite',
              }}
            />
          </div>
        )}

        {isSuccess && (
          <div className="absolute inset-0 bg-primary flex flex-col items-center justify-center gap-2 z-10">
            <CheckCircle2 className="h-8 w-8 text-primary-on" />
            <span className="text-sm font-bold text-primary-on">¡Éxito!</span>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 bg-surface/90 flex flex-col items-center justify-center gap-2 z-10 px-4 text-center">
            <AlertCircle className="h-8 w-8 text-error" />
            <span className="text-xs font-bold text-on-surface">{cameraError}</span>
            <span className="text-[10px] text-on-surface-variant">Asegúrate de permitir el acceso a la cámara</span>
          </div>
        )}

        {isLoading && !isSuccess && (
          <div className="absolute inset-0 bg-surface/90 flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs font-bold text-on-surface">Validando...</span>
          </div>
        )}

        {error && !isLoading && !isSuccess && (
          <div className="absolute inset-0 bg-surface/90 flex flex-col items-center justify-center gap-2 z-10 px-4 text-center">
            <AlertCircle className="h-8 w-8 text-error" />
            <span className="text-xs font-bold text-on-surface">{error}</span>
          </div>
        )}
      </div>

      <p className="text-xs text-on-surface-variant text-center">
        Coloca el código QR frente a la cámara
      </p>
    </>
  )

  if (isInline) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        {cameraBody}
      </div>
    )
  }

  const content = (
    <div className={cn(
      'flex flex-col',
      variant === 'popover' && 'bg-surface-container border border-outline-variant/50',
      variant === 'modal' && 'bg-surface min-h-full',
    )}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/50">
        <div className="flex items-center gap-2.5">
          <Scan className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-headline font-bold text-on-surface">Escanear Tarjeta</h3>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col items-center p-5 gap-4">
        {cameraBody}
      </div>
    </div>
  )

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-outline-variant/30">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="absolute top-full right-0 mt-2 w-72 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-outline-variant/20">
        {content}
      </div>
    </div>
  )
}
