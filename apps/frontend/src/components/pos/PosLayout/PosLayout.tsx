'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PosHeader } from '@/components/pos/PosHeader'
import { CustomerQuickBar } from '@/components/pos/CustomerQuickBar'
import { FloatingCartBar } from '@/components/pos/FloatingCartBar'
import { PosBottomNav } from '@/components/pos/PosBottomNav'
import { QRScannerPopover } from '@/components/pos/QRScannerPopover'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { openDrawer } from '@/store/slices/uiSlice'
import { setScannerOpen } from '@/store/slices/posSlice'

interface PosLayoutProps {
  menu: ReactNode
  tables?: ReactNode
  cart: ReactNode
  checkout: ReactNode
  customerDrawer: ReactNode
  enableTablesView?: boolean
}

export function PosLayout({
  menu,
  tables,
  cart,
  checkout,
  customerDrawer,
  enableTablesView = false,
}: PosLayoutProps) {
  const dispatch = useAppDispatch()
  const cartOpen = useAppSelector((s) => s.pos.cartOpen)
  const checkoutView = useAppSelector((s) => s.pos.checkoutView)
  const activeView = useAppSelector((s) => s.pos.activeView)
  const scannerOpen = useAppSelector((s) => s.pos.scannerOpen)
  const kitchenNotice = useAppSelector((s) => s.pos.kitchenNotice)

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <PosHeader
        onMenuClick={() => dispatch(openDrawer())}
      />

      <div className={cn(
        'flex flex-1 lg:flex-row',
        'max-h-[calc(100dvh-3.5rem)] lg:max-h-none',
      )}>
        <div className={cn(
          'flex-1 min-h-0 transition-all overflow-y-auto pb-16 lg:pb-0',
          cartOpen && 'hidden lg:block lg:w-3/5 xl:w-2/3',
        )}>
          {enableTablesView && activeView === 'tables' && tables ? (
            tables
          ) : (
            <>
              {/* Mobile: show CustomerQuickBar at top, then menu */}
              <div className="lg:hidden">
                <CustomerQuickBar />
              </div>
              {menu}
            </>
          )}
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
      <PosBottomNav enableTablesTab={enableTablesView} />

      {kitchenNotice && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 px-3 lg:hidden">
          <div className="rounded-lg border border-primary/35 bg-surface-container-high/95 px-3 py-2 text-xs font-label font-bold text-on-surface shadow-lg backdrop-blur">
            {kitchenNotice}
          </div>
        </div>
      )}

      {customerDrawer}

      <QRScannerPopover
        open={scannerOpen}
        onClose={() => dispatch(setScannerOpen(false))}
        variant="modal"
      />
    </div>
  )
}
