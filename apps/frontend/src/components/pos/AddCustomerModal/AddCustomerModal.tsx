'use client'

import { useEffect, useState } from 'react'
import { Check, GripHorizontal, UserPlus, X } from 'lucide-react'
import { QuickCustomerForm } from '@/components/pos/QuickCustomerRegister/QuickCustomerForm'
import { SendWhatsAppButton } from '@/components/pos/SendWhatsAppButton'
import { useGetGoogleWalletSaveUrlQuery } from '@/store/api'
import type { CustomerWithLoyalty } from '@/store/slices/customersSlice'

interface AddCustomerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (customer: CustomerWithLoyalty) => void
}

interface CreatedCustomer {
  customer: CustomerWithLoyalty
  passId?: string
}

export function AddCustomerModal({ open, onOpenChange, onCreated }: AddCustomerModalProps) {
  const [created, setCreated] = useState<CreatedCustomer | null>(null)
  const passId = created?.passId
  const { data: googleWalletData } = useGetGoogleWalletSaveUrlQuery(passId ?? '', {
    skip: !open || !passId,
  })
  const googleSaveUrl = googleWalletData?.jwtUrl

  useEffect(() => {
    if (open) setCreated(null)
  }, [open])

  if (!open) return null

  const handleClose = () => onOpenChange(false)

  const handleDone = () => {
    onOpenChange(false)
    if (created) onCreated?.(created.customer)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-surface-container shadow-xl animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-outline-variant bg-surface-container">
          <div className="flex justify-center pt-2 pb-1">
            <GripHorizontal className="h-5 w-5 text-on-surface-variant/50" />
          </div>
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-headline font-bold text-lg text-on-surface">Add customer</h2>
            </div>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {created ? (
            <div className="space-y-3">
              <div className="flex flex-col items-center py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <p className="mt-2 font-headline font-bold text-lg text-on-surface">Cliente creado</p>
                <p className="text-sm text-on-surface-variant">{created.customer.name}</p>
              </div>

              {created.passId && (
                <SendWhatsAppButton
                  applePassUrl={`/api/wallet/apple/${created.passId}/download`}
                  googleSaveUrl={googleSaveUrl}
                  customerPhone={created.customer.phone ?? undefined}
                  className="w-full"
                />
              )}

              <button
                onClick={handleDone}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-label font-bold text-primary-on transition-colors hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-on-surface-variant">
                Create a customer to assign loyalty points to this sale.
              </p>
              <QuickCustomerForm
                onCreated={(customer, passId) => {
                  setCreated({ customer, passId })
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
