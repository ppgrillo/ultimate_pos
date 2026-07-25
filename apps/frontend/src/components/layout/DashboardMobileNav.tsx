'use client'

import { ShoppingCart, ClipboardList, ContactRound, BarChart3 } from 'lucide-react'
import { MobileBottomNav } from '@/components/ui/MobileBottomNav'
import type { MobileTab } from '@/components/ui/MobileBottomNav'
import { useAppSelector } from '@/store/hooks'

const baseTabs: MobileTab[] = [
  { id: 'pos', label: 'POS', icon: ShoppingCart, href: '/pos' },
  { id: 'customers', label: 'Clientes', icon: ContactRound, href: '/customers' },
  { id: 'analytics', label: 'Stats', icon: BarChart3, href: '/analytics' },
]

export function DashboardMobileNav() {
  const items = useAppSelector((s) => s.cart.items)
  const hasKitchen = useAppSelector((s) => s.storeConfig.currentStore?.settings?.hasKitchen)
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const orderTab: MobileTab = hasKitchen === undefined
    ? { id: 'orders', label: 'Orders', icon: ClipboardList, href: '/orders' }
    : hasKitchen
      ? { id: 'orders', label: 'Kitchen Orders', icon: ClipboardList, href: '/orders/kitchen' }
      : { id: 'orders', label: 'Sales Orders', icon: ClipboardList, href: '/orders/sales' }

  const tabsWithOrders: MobileTab[] = [baseTabs[0], orderTab, baseTabs[1], baseTabs[2]]

  const tabs = tabsWithOrders.map((tab) =>
    tab.id === 'pos' ? { ...tab, badge: cartCount } : tab,
  )

  return <MobileBottomNav tabs={tabs} />
}
