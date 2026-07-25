'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MobileTab {
  id: string
  label: string
  icon: LucideIcon
  href: string
  badge?: number
}

interface MobileBottomNavProps {
  tabs: MobileTab[]
  className?: string
}

export function MobileBottomNav({ tabs, className }: MobileBottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-outline-variant bg-surface-container-low/80 backdrop-blur-glass lg:hidden',
        className,
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              'relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-label font-bold transition-colors',
              isActive
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <Icon className="h-5 w-5" />
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-on">
                {tab.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
