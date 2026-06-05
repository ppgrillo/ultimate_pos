'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, Receipt } from 'lucide-react'

export default function ReceiptPage() {
  const router = useRouter()

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mb-6">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-headline font-bold text-2xl text-on-surface mb-2">Order Placed!</h1>
        <p className="text-on-surface-variant mb-8">Your order has been sent to the kitchen.</p>

        <div className="w-full rounded-xl bg-surface-container/50 border border-outline-variant p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5 text-primary" />
            <span className="font-headline font-bold text-sm text-on-surface">Order Summary</span>
          </div>
          <p className="text-xs text-on-surface-variant">
            A receipt has been sent to the POS system. The kitchen has been notified of your order.
          </p>
        </div>

        <button
          onClick={() => router.push('/pos')}
          className="rounded-xl bg-primary px-8 py-3 text-sm font-label font-bold text-primary-on hover:bg-primary/90 transition-colors"
        >
          New Order
        </button>
      </div>
    </div>
  )
}
