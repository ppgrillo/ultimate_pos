'use client'

import { Store, Users, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'

interface DesktopLeftNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: 'shop', label: 'Shop', icon: Store },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function DesktopLeftNav({ activeTab, onTabChange }: DesktopLeftNavProps) {
  const user = useAppSelector((s) => s.auth.user)
  const storeName = useAppSelector((s) => s.storeConfig.currentStore?.name)

  return (
    <aside className="hidden w-56 shrink-0 border-r border-outline-variant bg-surface-container-low lg:flex lg:flex-col">
      <div className="flex items-center gap-2.5 border-b border-outline-variant px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-headline font-extrabold text-primary-on">P</span>
        </div>
        <span className="font-headline text-sm font-bold text-on-surface truncate">
          {storeName || 'NeoPOS'}
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-label font-bold transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-outline-variant p-3">
        <div className="flex items-center gap-3 rounded-lg bg-surface-container/50 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest text-sm font-headline font-bold text-on-surface shrink-0">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-headline font-bold text-on-surface truncate">
              {user?.name || 'Alex Rivera'}
            </p>
            <p className="text-[10px] text-on-surface-variant font-label font-medium uppercase tracking-wider">
              {user?.role === 'admin' ? 'Admin Level 4' : 'Staff'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
