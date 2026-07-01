'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PosHeader } from '@/components/pos/PosHeader'
import { PosBottomNav } from '@/components/pos/PosBottomNav'
import { CustomerQuickBar } from '@/components/pos/CustomerQuickBar'
import { FloatingCartBar } from '@/components/pos/FloatingCartBar'
import { QRScannerPopover } from '@/components/pos/QRScannerPopover'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveView } from '@/store/slices/posSlice'
import { openDrawer } from '@/store/slices/uiSlice'

interface PosLayoutProps {
  menu: ReactNode
  cart: ReactNode
  checkout: ReactNode
  customerDrawer: ReactNode
}

export function PosLayout({ menu, cart, checkout, customerDrawer }: PosLayoutProps) {
  const dispatch = useAppDispatch()
  const activeView = useAppSelector((s) => s.pos.activeView)
  const cartOpen = useAppSelector((s) => s.pos.cartOpen)
  const checkoutView = useAppSelector((s) => s.pos.checkoutView)
  const [scannerOpen, setScannerOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <PosHeader
        onMenuClick={() => dispatch(openDrawer())}
        onCartClick={() => dispatch(setActiveView(cartOpen ? 'menu' : 'cart'))}
        onScanClick={() => setScannerOpen(true)}
      />
      <QRScannerPopover
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        variant="modal"
      />

      <div className={cn(
        'flex flex-1 lg:flex-row',
        'max-h-[calc(100dvh-3.5rem)] lg:max-h-none',
      )}>
        <div className={cn(
          'flex-1 min-h-0 transition-all overflow-y-auto pb-16 lg:pb-0',
          cartOpen && 'hidden lg:block lg:w-3/5 xl:w-2/3',
        )}>
          {/* Mobile: show CustomerQuickBar at top, then menu */}
          <div className="lg:hidden">
            <CustomerQuickBar />
          </div>
          {activeView === 'menu' && menu}
        </div>

        {(cartOpen || checkoutView) && (
          <div className={cn(
            'w-full lg:w-2/5 xl:w-1/3',
            'lg:border-l lg:border-outline-variant',
            'max-h-[calc(100vh-3.5rem)] lg:overflow-y-auto pb-16 lg:pb-0',
          )}>
            {checkoutView ? checkout : cart}
          </div>
        )}
      </div>

      {/* Mobile: FloatingCartBar above bottom nav */}
      <FloatingCartBar />

      {customerDrawer}

      <PosBottomNav />
    </div>
  )
}
