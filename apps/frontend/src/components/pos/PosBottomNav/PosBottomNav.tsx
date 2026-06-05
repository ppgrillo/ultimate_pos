'use client'

import { Store, Users, BarChart3, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PosBottomNavProps {
  activeTab: 'shop' | 'customers' | 'stats' | 'profile'
  onTabChange: (tab: 'shop' | 'customers' | 'stats' | 'profile') => void
}

const tabs = [
  { id: 'shop' as const, label: 'Shop', icon: Store },
  { id: 'customers' as const, label: 'Customers', icon: Users },
  { id: 'stats' as const, label: 'Stats', icon: BarChart3 },
  { id: 'profile' as const, label: 'Profile', icon: User },
]

export function PosBottomNav({ activeTab, onTabChange }: PosBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-outline-variant bg-surface-container-low backdrop-blur-glass lg:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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
