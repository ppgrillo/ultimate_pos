'use client'

import { Store, Users, BarChart3, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveView, setCustomerDrawerOpen } from '@/store/slices/posSlice'

const tabs = [
  { id: 'shop' as const, label: 'Shop', icon: Store },
  { id: 'customers' as const, label: 'Customers', icon: Users },
  { id: 'stats' as const, label: 'Stats', icon: BarChart3 },
  { id: 'profile' as const, label: 'Profile', icon: User },
]

export function PosBottomNav() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const activeView = useAppSelector((s) => s.pos.activeView)

  const activeTab: 'shop' | 'customers' | 'stats' | 'profile' =
    activeView === 'menu' ? 'shop'
    : activeView === 'cart' || activeView === 'payment' || activeView === 'receipt' ? 'shop'
    : 'shop'

  const handleTabChange = (tab: 'shop' | 'customers' | 'stats' | 'profile') => {
    switch (tab) {
      case 'shop':
        dispatch(setActiveView('menu'))
        break
      case 'customers':
        dispatch(setCustomerDrawerOpen(true))
        break
      case 'stats':
        router.push('/dashboard')
        break
      case 'profile':
        router.push('/settings')
        break
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-outline-variant bg-surface-container-low backdrop-blur-glass lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-label font-bold transition-colors',
              isActive
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <Icon className="h-5 w-5" />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
