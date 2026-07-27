'use client'

import { Menu, ShoppingBag, Scan, Users } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveView, setCartOpen, setScannerOpen, setCustomerDrawerOpen } from '@/store/slices/posSlice'
import { cn } from '@/lib/utils'

interface PosHeaderProps {
  onMenuClick?: () => void
}

export function PosHeader({ onMenuClick }: PosHeaderProps) {
  const dispatch = useAppDispatch()
  const customerName = useAppSelector((s) => s.cart.customer_name)
  const items = useAppSelector((s) => s.cart.items)
  const cartOpen = useAppSelector((s) => s.pos.cartOpen)
  const scannerOpen = useAppSelector((s) => s.pos.scannerOpen)
  const customerDrawerOpen = useAppSelector((s) => s.pos.customerDrawerOpen)
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-outline-variant bg-surface-container-low/80 px-4 backdrop-blur-glass">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-headline font-extrabold text-primary-on">P</span>
          </div>
          <span className="font-headline text-sm font-bold text-on-surface hidden sm:inline">
            QuickCharge POS
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {customerName && (
          <div className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs font-label font-bold text-on-surface">{customerName}</span>
          </div>
        )}

        {/* Mobile action buttons */}
        <button
          onClick={() => {
            dispatch(setCustomerDrawerOpen(!customerDrawerOpen))
            dispatch(setScannerOpen(false))
          }}
          className={cn(
            'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors lg:hidden',
            customerDrawerOpen
              ? 'bg-primary text-primary-on'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
          )}
        >
          <Users className="h-5 w-5" />
        </button>

        <button
          onClick={() => {
            dispatch(setScannerOpen(!scannerOpen))
            dispatch(setCustomerDrawerOpen(false))
          }}
          className={cn(
            'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors lg:hidden',
            scannerOpen
              ? 'bg-primary text-primary-on'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
          )}
        >
          <Scan className="h-5 w-5" />
        </button>

        <button
          onClick={() => {
            dispatch(setActiveView('cart'))
            dispatch(setCartOpen(!cartOpen))
            dispatch(setScannerOpen(false))
            dispatch(setCustomerDrawerOpen(false))
          }}
          className={cn(
            'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors lg:hidden',
            cartOpen
              ? 'bg-primary text-primary-on'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
          )}
        >
          <ShoppingBag className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-on">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
