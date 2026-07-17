'use client'

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Receipt, Banknote, CreditCard, Building, ArrowLeftRight, Stars } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'
import { formatCurrency } from '@/lib/utils'

const methodIcons = {
  cash: Banknote,
  card: CreditCard,
  transfer: Building,
}

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  transfer: 'Transfer',
}

function ReceiptPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentMethod = searchParams.get('paymentMethod')
  const total = searchParams.get('total')
  const changeDue = searchParams.get('changeDue')
  const pointsEarned = searchParams.get('pointsEarned')
  const pointsBefore = searchParams.get('pointsBefore')
  const pointsAfter = searchParams.get('pointsAfter')
  const pointsChanged = pointsBefore && pointsAfter && pointsBefore !== pointsAfter
  const store = useAppSelector((s) => s.storeConfig.currentStore)
  const hasKitchen = store?.settings?.hasKitchen ?? true
  const hasLoyalty = store?.settings?.hasLoyalty ?? false
  const Icon = paymentMethod ? methodIcons[paymentMethod as keyof typeof methodIcons] : null

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 mb-6">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-headline font-bold text-2xl text-on-surface mb-2">Thank you for your order!</h1>
        <h3 className="font-headline font-bold">Order Placed</h3>
        <p className="text-on-surface-variant mb-8">
          {hasKitchen
            ? 'Your order has been sent to the kitchen.'
            : 'Payment confirmed.'}
        </p>

        <div className="w-full rounded-xl bg-surface-container/50 border border-outline-variant p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5 text-primary" />
            <span className="font-headline font-bold text-sm text-on-surface">Receipt</span>
          </div>
          {paymentMethod && total && (
            <div className="flex items-center gap-3 mb-4 rounded-lg bg-surface-container/80 p-3">
              {Icon && <Icon className="h-5 w-5 text-primary" />}
              <div className="text-left">
                <p className="text-xs text-on-surface-variant">
                  Paid with <span className="font-bold text-on-surface">{methodLabels[paymentMethod] || paymentMethod}</span>
                </p>
                <p className="text-lg font-headline font-bold text-on-surface">{formatCurrency(parseFloat(total))}</p>
              </div>
            </div>
          )}
          {changeDue && (
            <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-3">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="text-xs text-on-surface-variant">Change Due</p>
                <p className="text-lg font-headline font-bold text-primary">{formatCurrency(parseFloat(changeDue))}</p>
              </div>
            </div>
          )}
          {hasLoyalty && (
            <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-3 mt-4">
              <Stars className="h-5 w-5 text-primary shrink-0" />
              <div className="text-left">
                {pointsChanged ? (
                  <>
                    <p className="text-xs text-on-surface-variant">
                      Loyalty points
                      {pointsEarned && Number(pointsEarned) > 0 ? ' earned' : ' redeemed'}
                    </p>
                    <p className="text-lg font-headline font-bold text-primary">
                      {pointsBefore} → {pointsAfter}
                    </p>
                  </>
                ) : pointsEarned && Number(pointsEarned) > 0 ? (
                  <>
                    <p className="text-xs text-on-surface-variant">Points earned</p>
                    <p className="text-lg font-headline font-bold text-primary">+{pointsEarned}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-on-surface-variant">Loyalty</p>
                    <p className="text-sm font-headline font-bold text-primary">No points earned</p>
                  </>
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-on-surface-variant mt-4">
            {hasKitchen
              ? 'A receipt has been sent to the POS system. The kitchen has been notified of your order.'
              : 'A receipt has been sent to the POS system.'}
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


export default function ReceiptPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReceiptPageContent />
    </Suspense>
  );
}
