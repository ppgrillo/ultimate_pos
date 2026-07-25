'use client'

import { LayoutGrid, ShoppingBag, Users, Scan } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveView, setCartOpen, setCheckoutView, setCustomerDrawerOpen, setScannerOpen } from '@/store/slices/posSlice'
import { QRScannerPopover } from '@/components/pos/QRScannerPopover'

const tabs = [
  { id: 'menu' as const, label: 'Menu', icon: LayoutGrid },
  { id: 'cart' as const, label: 'Carrito', icon: ShoppingBag },
  { id: 'scan' as const, label: 'Escanear', icon: Scan },
  { id: 'customers' as const, label: 'Clientes', icon: Users },
]

export function PosBottomNav() {
  const dispatch = useAppDispatch()
  const activeView = useAppSelector((s) => s.pos.activeView)
  const cartOpen = useAppSelector((s) => s.pos.cartOpen)
  const customerDrawerOpen = useAppSelector((s) => s.pos.customerDrawerOpen)
  const scannerOpen = useAppSelector((s) => s.pos.scannerOpen)
  const items = useAppSelector((s) => s.cart.items)
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const activeTab: 'menu' | 'cart' | 'scan' | 'customers' =
    customerDrawerOpen ? 'customers'
    : scannerOpen ? 'scan'
    : cartOpen ? 'cart'
    : 'menu'

  const handleTabChange = (tab: 'menu' | 'cart' | 'scan' | 'customers') => {
    switch (tab) {
      case 'menu':
        dispatch(setActiveView('menu'))
        dispatch(setCartOpen(false))
        dispatch(setCheckoutView(false))
        dispatch(setCustomerDrawerOpen(false))
        dispatch(setScannerOpen(false))
        break
      case 'cart':
        dispatch(setCartOpen(true))
        dispatch(setScannerOpen(false))
        dispatch(setCustomerDrawerOpen(false))
        break
      case 'scan':
        dispatch(setScannerOpen(!scannerOpen))
        dispatch(setCustomerDrawerOpen(false))
        break
      case 'customers':
        dispatch(setCustomerDrawerOpen(!customerDrawerOpen))
        dispatch(setScannerOpen(false))
        break
    }
  }

  return (
    <>
      <QRScannerPopover
        open={scannerOpen}
        onClose={() => dispatch(setScannerOpen(false))}
        variant="modal"
      />
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-outline-variant bg-surface-container-low backdrop-blur-glass lg:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-label font-bold transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
              {tab.id === 'cart' && cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-on">
                  {cartCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </>
  )
}
