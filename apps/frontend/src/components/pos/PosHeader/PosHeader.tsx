'use client'

import { ShoppingBag, Menu, QrCode } from 'lucide-react'
import { useAppSelector } from '@/store/hooks'

interface PosHeaderProps {
  onMenuClick?: () => void
  onCartClick?: () => void
  onScanClick?: () => void
}

export function PosHeader({ onMenuClick, onCartClick, onScanClick }: PosHeaderProps) {
  const cartCount = useAppSelector((s) => s.cart.items.reduce((sum, i) => sum + i.quantity, 0))
  const customerName = useAppSelector((s) => s.cart.customer_name)

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

      <div className="flex items-center gap-2">
        {customerName && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-xs font-label font-bold text-on-surface">{customerName}</span>
          </div>
        )}

        <button
          onClick={onScanClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          title="Scan loyalty card"
        >
          <QrCode className="h-5 w-5" />
        </button>

        <button
          onClick={onCartClick}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
        >
          <ShoppingBag className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-on">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
