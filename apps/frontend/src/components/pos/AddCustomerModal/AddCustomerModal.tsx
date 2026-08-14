'use client'

import { GripHorizontal, UserPlus, X } from 'lucide-react'
import { QuickCustomerForm } from '@/components/pos/QuickCustomerRegister/QuickCustomerForm'
import type { CustomerWithLoyalty } from '@/store/slices/customersSlice'

interface AddCustomerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (customer: CustomerWithLoyalty) => void
}

export function AddCustomerModal({ open, onOpenChange, onCreated }: AddCustomerModalProps) {
  if (!open) return null

  const handleClose = () => onOpenChange(false)

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
          <p className="mb-3 text-xs text-on-surface-variant">
            Create a customer to assign loyalty points to this sale.
          </p>
          <QuickCustomerForm
            onCreated={(customer) => {
              onOpenChange(false)
              onCreated?.(customer)
            }}
          />
        </div>
      </div>
    </div>
  )
}
