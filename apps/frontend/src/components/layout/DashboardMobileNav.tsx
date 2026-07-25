'use client'

import { ShoppingCart, ClipboardList, ContactRound, BarChart3 } from 'lucide-react'
import { MobileBottomNav } from '@/components/ui/MobileBottomNav'
import type { MobileTab } from '@/components/ui/MobileBottomNav'
import { useAppSelector } from '@/store/hooks'

const baseTabs: MobileTab[] = [
  { id: 'pos', label: 'POS', icon: ShoppingCart, href: '/pos' },
  { id: 'orders', label: 'Órdenes', icon: ClipboardList, href: '/orders' },
  { id: 'customers', label: 'Clientes', icon: ContactRound, href: '/customers' },
  { id: 'analytics', label: 'Stats', icon: BarChart3, href: '/analytics' },
]

export function DashboardMobileNav() {
  const items = useAppSelector((s) => s.cart.items)
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const tabs = baseTabs.map((tab) =>
    tab.id === 'pos' ? { ...tab, badge: cartCount } : tab,
  )

  return <MobileBottomNav tabs={tabs} />
}
